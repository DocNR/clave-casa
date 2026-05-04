<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { VerifiedEvent } from 'nostr-tools/core';
	import { npubEncode } from 'nostr-tools/nip19';
	import {
		getActiveConnection,
		loadConnections,
		removeConnection,
		setActivePubkey,
		upsertConnection,
		type Connection
	} from '$lib/connections';
	import {
		clearLocalKey,
		connectSigner,
		getActiveSigner,
		parseBunkerInput,
		signEventViaBunker,
		type FriendlyConnectError
	} from '$lib/signer';
	import {
		publishThreeTier,
		scanAndRebroadcast,
		fetchLatestProfile,
		hasNip65,
		type PublishReport,
		type ScanReport
	} from '$lib/propagation';
	import Field from '$lib/components/Field.svelte';
	import TextareaField from '$lib/components/TextareaField.svelte';
	import RelayList from '$lib/components/RelayList.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import FormSectionCard from '$lib/components/FormSectionCard.svelte';
	import { copyToClipboard } from '$lib/clipboard';
	import { displayLabel } from '$lib/labels';
	import {
		defaultAvatarUrl,
		getRobohashSet,
		isRobohashUrl,
		ROBOHASH_SET_KEY,
		ROBOHASH_SETS,
		setRobohashSet,
		type RobohashSet
	} from '$lib/avatar-defaults';

	// Kind 0 metadata fields per NIP-01 (name, about, picture) +
	// NIP-24 (display_name, website, banner, bot) + NIP-05 (nip05) +
	// Lightning conventions (lud16). Unknown fields are preserved in
	// extraFields so we don't strip custom data clients have set elsewhere.
	type ProfileFields = {
		name: string;
		display_name: string;
		picture: string;
		banner: string;
		about: string;
		nip05: string;
		lud16: string;
		website: string;
		bot: boolean;
	};

	const empty: ProfileFields = {
		name: '',
		display_name: '',
		picture: '',
		banner: '',
		about: '',
		nip05: '',
		lud16: '',
		website: '',
		bot: false
	};

	// Deprecated kind 0 keys we migrate into the canonical names per NIP-24:
	//   displayName → display_name, username → name. We drop the deprecated
	//   keys on save instead of letting them ride in extraFields.
	const DEPRECATED_ALIASES: Record<string, keyof ProfileFields> = {
		displayName: 'display_name',
		username: 'name'
	};

	let conn = $state<Connection | undefined>(undefined);
	let userPubkey = $state('');
	let phase: 'loading' | 'editing' | 'publishing' | 'syncing' = $state('loading');
	let loadError = $state('');
	let fields = $state<ProfileFields>({ ...empty });
	let extraFields = $state<Record<string, unknown>>({});
	let nip65Present = $state(true);
	let publishReport = $state<PublishReport | undefined>(undefined);
	let scanReport = $state<ScanReport | undefined>(undefined);
	let lastSavedEvent = $state<VerifiedEvent | undefined>(undefined);
	let approvalWait = $state<{ attempt: number; startedAt: number } | undefined>(undefined);
	let approvalElapsedSec = $state(0);
	let approvalTickInterval: ReturnType<typeof setInterval> | undefined;
	// Granular load status — replaces the older boolean fetchFailed. We need
	// to distinguish 'no-event' (relays confirmed nothing) from 'failed'
	// (timed out / errored) because they have different save semantics:
	// 'failed' refuses to publish; 'no-event' warns but allows.
	let loadStatus = $state<'idle' | 'found' | 'no-event' | 'failed'>('idle');
	// User-visible flag: did the user click "Save anyway" past the no-event
	// confirm dialog? Set true once they confirm; reset on each new load.
	let confirmedNoEventSave = $state(false);
	let noEventDialog: HTMLDialogElement | undefined = $state();
	// Tracks whether fields.picture represents an explicit user choice
	// (Apply-clicked in picture editor, OR loaded from existing kind:0
	// with a real picture URL) versus a programmatic Robohash prefill
	// for visual preview. Only explicit values are included in publish.
	// Bug fix: the prefill used to leak into published kind:0 even when
	// the user never engaged the picture editor — silently overwriting
	// the user's actual picture URL with a Robohash they never chose.
	let pictureExplicitlySet = $state(false);
	// Reactive mirror of the localStorage Robohash set so the picker's
	// active-state highlighting updates immediately when the user clicks
	// a different style.
	let currentSet = $state<RobohashSet>('set1');

	// Track which account we've loaded so storage events that don't actually
	// change the active account don't trigger pointless reloads.
	let loadedPubkey: string | undefined = undefined;

	// Resolved label for the page header + Avatar initial. Mirrors the iOS
	// displayLabel chain (design-system.md §7) — petname → kind 0 → npub.
	// `fields` is the live form state, so the heading reflects what the user
	// is editing (display_name updates as they type).
	const resolvedLabel = $derived(
		displayLabel({
			connection: conn,
			profile: { display_name: fields.display_name, name: fields.name },
			pubkeyHex: userPubkey
		})
	);
	// Heading override: when displayLabel falls all the way through to the
	// npub-prefix, show the friendlier page-context "Edit profile" instead.
	// Any meaningful label (petname, display_name, name) renders as-is.
	const headingLabel = $derived(
		resolvedLabel.startsWith('npub') ? 'Edit profile' : resolvedLabel
	);

	async function loadForActiveAccount() {
		const newConn = getActiveConnection();
		if (!newConn) {
			goto('/connect', { replaceState: true });
			return;
		}
		if (loadedPubkey === newConn.accountPubkey) return;

		// Reset state for the new account so the form doesn't show stale data
		// during the relay fetch.
		conn = newConn;
		userPubkey = newConn.accountPubkey;
		loadedPubkey = newConn.accountPubkey;
		fields = { ...empty };
		extraFields = {};
		publishReport = undefined;
		scanReport = undefined;
		lastSavedEvent = undefined;
		clearApprovalTick();
		loadError = '';
		loadStatus = 'idle';
		confirmedNoEventSave = false;
		pictureExplicitlySet = false;
		phase = 'loading';

		try {
			await loadProfile();
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			phase = 'editing';
		}
	}

	// iOS-handoff: AccountDetailView's "Edit on clave.casa" row opens
	// `https://clave.casa/edit#bunker=<URL-encoded-bunker-uri>`. If the URI
	// references an account we've already paired, just switch to it (no
	// re-pair handshake needed). If it's new, pair inline. Either way, scrub
	// the fragment from the URL bar before any logging picks it up — same
	// pattern /connect uses for the same reason.
	//
	// "Different active account at link-open time = implicit switch" per
	// BACKLOG: the user's intent is unambiguous (they tapped Edit-for-account-X
	// from Clave iOS).
	async function handleBunkerHandoff(bunkerUri: string): Promise<void> {
		let bp;
		try {
			bp = await parseBunkerInput(bunkerUri);
		} catch {
			bp = null;
		}
		if (!bp) {
			loadError = "That bunker URI doesn't look valid. Pick an account, or pair a new one from Connect.";
			return;
		}

		// Already paired? Just switch — skip the handshake entirely.
		// Note: matches by bp.pubkey, which equals the user pubkey for Clave-
		// generated bunker URIs. For other signers where bunker.pubkey ≠ user
		// pubkey, the lookup misses and we re-pair (one extra connect roundtrip,
		// no harm — upsertConnection deduplicates by accountPubkey).
		const existing = loadConnections().find((c) => c.accountPubkey === bp.pubkey);
		if (existing) {
			setActivePubkey(existing.accountPubkey);
			return;
		}

		// New pair — connect inline. The loading UI ("Loading your profile…")
		// covers this window; if connect fails we surface the error and let
		// the layout's AccountSwitcher route the user.
		try {
			const { userPubkey } = await connectSigner({
				accountPubkey: bp.pubkey,
				bunkerUri,
				addedAt: Date.now()
			});
			upsertConnection({ accountPubkey: userPubkey, bunkerUri, addedAt: Date.now() });
			setActivePubkey(userPubkey);
		} catch (e) {
			loadError = e instanceof Error ? e.message : `Couldn't connect to your signer: ${e}`;
		}
	}

	onMount(() => {
		currentSet = getRobohashSet();
		const onStorage = (e: StorageEvent) => {
			if (e.key === ROBOHASH_SET_KEY) {
				currentSet = getRobohashSet();
				return;
			}
			void loadForActiveAccount();
		};
		window.addEventListener('storage', onStorage);

		// iOS-handoff fragment runs in a parallel async task so onMount can
		// return its cleanup function synchronously (Svelte requires that).
		// The handoff awaits before loadForActiveAccount so the right active
		// account is set by the time we read it.
		void (async () => {
			const fragment = location.hash.slice(1);
			if (fragment) {
				const params = new URLSearchParams(fragment);
				const bunkerUri = params.get('bunker');
				history.replaceState(null, '', '/edit');
				if (bunkerUri) {
					await handleBunkerHandoff(bunkerUri);
				}
			}
			void loadForActiveAccount();
		})();

		return () => window.removeEventListener('storage', onStorage);
	});

	async function loadProfile() {
		nip65Present = await hasNip65(userPubkey);
		const result = await fetchLatestProfile(userPubkey);

		if (result.status === 'failed') {
			// Network/timeout — we don't know what kind 0 already exists.
			// Refuse to prefill the form so a careless Save can't overwrite
			// real data we couldn't see.
			loadError =
				'Could not load your existing profile data. Check your connection and refresh — saving now would overwrite anything your kind 0 already has.';
			loadStatus = 'failed';
			return;
		}

		loadStatus = result.status === 'found' ? 'found' : 'no-event';
		if (result.status === 'found') {
			try {
				const parsed = JSON.parse(result.event.content) as Record<string, unknown>;
				const stringKeys = new Set<keyof ProfileFields>([
					'name',
					'display_name',
					'picture',
					'banner',
					'about',
					'nip05',
					'lud16',
					'website'
				]);
				const next = { ...empty };
				const extras: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(parsed)) {
					// Migrate deprecated aliases (NIP-24) into canonical names. Only
					// adopt if the canonical key isn't already set in this kind 0.
					if (k in DEPRECATED_ALIASES && typeof v === 'string') {
						const canonical = DEPRECATED_ALIASES[k];
						if (!next[canonical]) (next as Record<string, unknown>)[canonical] = v;
						continue;
					}
					if (stringKeys.has(k as keyof ProfileFields) && typeof v === 'string') {
						(next as Record<string, unknown>)[k] = v;
					} else if (k === 'bot' && typeof v === 'boolean') {
						next.bot = v;
					} else {
						extras[k] = v;
					}
				}
				fields = next;
				extraFields = extras;
				// The loaded kind:0 had a real picture — that's the user's
				// explicit current value. Mark it so we keep publishing it
				// even if they don't engage the picture editor.
				if (next.picture) pictureExplicitlySet = true;
				if (conn && (next.display_name || next.name || next.picture)) {
					const updated = {
						...conn,
						label: next.display_name || next.name || conn.label,
						pictureUrl: next.picture || conn.pictureUrl
					};
					upsertConnection(updated);
					conn = updated;
					// Notify other listeners (AccountSwitcher) that the connection changed
					window.dispatchEvent(new StorageEvent('storage', { key: 'clave-casa.connections.v1' }));
				}
			} catch {
				// content wasn't JSON; ignore
			}
		}

		// status === 'no-event' OR 'found' but kind 0 had no picture →
		// prefill the picture field with Robohash so the user can SEE what
		// their default avatar looks like. This is VISUAL ONLY:
		// pictureExplicitlySet stays false, so save() won't include this
		// programmatic URL in the published kind:0 unless the user opens
		// the picture editor and clicks Apply (which sets the flag).
		if (!fields.picture) {
			fields.picture = defaultAvatarUrl(userPubkey);
		}
	}

	async function save() {
		if (phase !== 'editing') return;
		// Refuse to publish if the existing kind 0 couldn't be loaded — saving
		// blind would silently overwrite whatever's actually on relays.
		if (loadStatus === 'failed') {
			loadError =
				'Existing profile data didn’t load — refresh and retry before saving so we don’t overwrite anything.';
			return;
		}
		// Soft gate: kind:0 lookup confirmed nothing on the relays we checked,
		// but the user might have published it via another client to relays
		// outside our SCAN_SET. Surface the risk + let them confirm before
		// publishing what would be a fresh-state kind:0 (any fields not in
		// the form will be missing).
		if (loadStatus === 'no-event' && !confirmedNoEventSave) {
			noEventDialog?.showModal();
			return;
		}
		let active = getActiveSigner();
		if (!active || active.userPubkey !== userPubkey) {
			if (!conn) {
				loadError = 'No active connection.';
				return;
			}
			try {
				await connectSigner(conn);
			} catch (e) {
				const err = e as FriendlyConnectError;
				// Stale-connection = the bunker secret was explicitly rejected.
				// Auto-clean so the user lands on /connect ready to re-pair.
				// Other categories (timeout, relay-unreachable, unknown) keep
				// the connection — could be transient and we don't want to
				// log the user out on a flaky network.
				if (err && err.category === 'stale-connection' && conn) {
					console.debug(
						'[clave.casa] stale connection detected — auto-cleaning',
						err.rawMessage
					);
					// Best-effort: parse the URI to get bp.pubkey for clearLocalKey.
					// If parse fails, the orphaned local key is harmless (gets reused
					// on re-pair to the same bunker, or stays unused).
					try {
						const bp = await parseBunkerInput(conn.bunkerUri);
						if (bp) clearLocalKey(bp.pubkey);
					} catch {
						// non-fatal
					}
					removeConnection(conn.accountPubkey);
					goto('/connect?reason=stale', { replaceState: true });
					return;
				}
				loadError = err && err.message ? err.message : String(e);
				return;
			}
			active = getActiveSigner();
			if (!active) {
				loadError = 'Could not establish signer.';
				return;
			}
		}
		phase = 'publishing';
		publishReport = undefined;
		scanReport = undefined;
		clearApprovalTick();
		loadError = '';

		// Drop deprecated NIP-24 aliases from extras so we don't perpetuate
		// them on save. Canonical names from `fields` win.
		const cleanExtras: Record<string, unknown> = { ...extraFields };
		for (const dep of Object.keys(DEPRECATED_ALIASES)) delete cleanExtras[dep];

		// Publish whatever's in the form. If the user cleared the picture
		// field, the kind 0 publishes with no `picture` key (stripEmpty
		// drops empty strings) — clean opt-out for users who don't want
		// a PFP at all.
		//
		// pictureExplicitlySet gate: when the picture field still holds a
		// programmatic Robohash prefill (user never engaged the picture
		// editor), strip it out of the publish so we don't accidentally
		// overwrite their actual picture URL stored elsewhere on relays we
		// didn't query. Visual prefill stays — only the publish payload is
		// guarded.
		const fieldsToPublish = pictureExplicitlySet ? fields : { ...fields, picture: '' };
		const content = JSON.stringify({ ...cleanExtras, ...stripEmpty(fieldsToPublish) });
		try {
			const signed = await signEventViaBunker(
				{
					kind: 0,
					content,
					tags: [],
					created_at: Math.floor(Date.now() / 1000)
				},
				{
					onProgress: ({ stage, startedAt }) => {
						if (stage === 'pending' && !approvalWait) {
							approvalWait = { attempt: 1, startedAt };
							approvalElapsedSec = 0;
							approvalTickInterval = setInterval(() => {
								if (approvalWait) {
									approvalElapsedSec = Math.round((Date.now() - approvalWait.startedAt) / 1000);
								}
							}, 1000);
						}
					}
				}
			);
			clearApprovalTick();
			lastSavedEvent = signed;
			publishReport = await publishThreeTier(signed, userPubkey);

			// Update Connection metadata so the AccountSwitcher and other
			// surfaces pick up the new label/PFP without needing a refresh.
			// The picture we save is whatever we just published — including
			// the Robohash default if the user left it blank.
			if (conn) {
				const newLabel = fields.display_name || fields.name || conn.label;
				const newPicture = fieldsToPublish.picture || conn.pictureUrl;
				if (newLabel !== conn.label || newPicture !== conn.pictureUrl) {
					const updated = { ...conn, label: newLabel, pictureUrl: newPicture };
					upsertConnection(updated);
					conn = updated;
					window.dispatchEvent(
						new StorageEvent('storage', { key: 'clave-casa.connections.v1' })
					);
				}
			}
		} catch (e) {
			clearApprovalTick();
			const err = e as FriendlyConnectError;
			// Sign-time stale-connection (signer responded "Client not paired" /
			// "Invalid or missing bunker secret" / etc.) means the connection
			// was unpaired or the account deleted. Auto-clean the same way as
			// the connect-time path. Other categories (timeout, unknown, etc.)
			// surface as inline error — could be transient.
			if (err && err.category === 'stale-connection' && conn) {
				console.debug(
					'[clave.casa] stale connection at sign time — auto-cleaning',
					err.rawMessage
				);
				try {
					const bp = await parseBunkerInput(conn.bunkerUri);
					if (bp) clearLocalKey(bp.pubkey);
				} catch {
					// non-fatal
				}
				removeConnection(conn.accountPubkey);
				goto('/connect?reason=stale', { replaceState: true });
				return;
			}
			loadError = err && err.message ? err.message : String(e);
		} finally {
			phase = 'editing';
		}
	}

	async function syncAcrossNostr() {
		if (!lastSavedEvent || phase !== 'editing') return;
		phase = 'syncing';
		try {
			// Pass any relays that failed during the last publish so Sync
			// retries them — without this, partial-failure relays only get
			// retried if they happen to be in SCAN_SET coincidentally.
			const failedRelays = [
				...(publishReport?.tier1 ?? []),
				...(publishReport?.tier2 ?? [])
			]
				.filter((r) => !r.ok)
				.map((r) => r.url);
			scanReport = await scanAndRebroadcast(lastSavedEvent, userPubkey, failedRelays);
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			phase = 'editing';
		}
	}

	function stripEmpty(obj: ProfileFields): Partial<ProfileFields> {
		const out: Partial<ProfileFields> = {};
		for (const [k, v] of Object.entries(obj)) {
			if (typeof v === 'string' && v.length > 0) {
				(out as Record<string, unknown>)[k] = v;
			} else if (k === 'bot' && v === true) {
				// Only emit bot when true — saves bytes and matches convention
				// of clients that omit the field for human accounts.
				out.bot = true;
			}
		}
		return out;
	}

	function clearApprovalTick() {
		approvalWait = undefined;
		approvalElapsedSec = 0;
		if (approvalTickInterval) {
			clearInterval(approvalTickInterval);
			approvalTickInterval = undefined;
		}
	}

	const totalRelaysOk = $derived(
		(publishReport?.tier1.filter((r) => r.ok).length ?? 0) +
			(publishReport?.tier2.filter((r) => r.ok).length ?? 0)
	);
	const totalRelays = $derived(
		(publishReport?.tier1.length ?? 0) + (publishReport?.tier2.length ?? 0)
	);

	const npub = $derived(userPubkey ? npubEncode(userPubkey) : '');
	const npubShort = $derived(npub ? `${npub.slice(0, 12)}…${npub.slice(-6)}` : '');

	let npubCopied = $state(false);
	let npubCopyTimer: ReturnType<typeof setTimeout> | undefined;

	// Picture URL editor — opened by the pencil overlay on the avatar.
	let pictureDialog: HTMLDialogElement | undefined = $state();
	let editingPictureUrl = $state('');
	let pictureEditorOpen = $state(false);

	$effect(() => {
		if (pictureEditorOpen && pictureDialog && !pictureDialog.open) {
			editingPictureUrl = fields.picture;
			pictureDialog.showModal();
		} else if (!pictureEditorOpen && pictureDialog?.open) {
			pictureDialog.close();
		}
	});

	function applyPictureEdit() {
		fields.picture = editingPictureUrl.trim();
		// Apply-clicked = explicit user choice. Includes "Remove picture"
		// (sets editingPictureUrl to '' then Apply) — clearing intentionally
		// is just as explicit as setting a URL.
		pictureExplicitlySet = true;
		pictureEditorOpen = false;
	}

	async function copyNpub() {
		if (!npub) return;
		const ok = await copyToClipboard(npub);
		if (!ok) {
			console.warn('[clave.casa] clipboard write failed');
			return;
		}
		npubCopied = true;
		if (npubCopyTimer) clearTimeout(npubCopyTimer);
		npubCopyTimer = setTimeout(() => (npubCopied = false), 1600);
	}
</script>

{#if phase === 'loading'}
	<p class="py-12 text-center text-sm text-[var(--clave-text-muted)]">Loading your profile…</p>
{:else}
	<div class="space-y-6">
		<header class="flex items-center gap-4 py-2">
			<div class="relative shrink-0">
				<Avatar
					pubkey={userPubkey}
					size="xl"
					label={resolvedLabel}
					picture={fields.picture}
				/>
				<button
					type="button"
					onclick={() => (pictureEditorOpen = true)}
					title="Edit picture URL"
					aria-label="Edit picture URL"
					class="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--clave-surface-alt)] bg-[var(--clave-tint)] text-[var(--clave-tint-fg)] shadow-sm hover:opacity-90"
				>
					<svg viewBox="0 0 16 16" class="h-2.5 w-2.5" aria-hidden="true">
						<path
							d="M11.5 2.5l2 2-7.5 7.5H4v-2L11.5 2.5z"
							stroke="currentColor"
							stroke-width="1.6"
							fill="none"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-3xl font-semibold">
					{headingLabel}
				</h1>
				<button
					type="button"
					onclick={copyNpub}
					title="Copy full npub to clipboard"
					class="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--clave-surface)] px-3 py-1 font-mono text-sm text-[var(--clave-text-muted)] transition-colors hover:text-[var(--clave-tint)]"
				>
					<span class="truncate">{npubShort}</span>
					{#if npubCopied}
						<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
							<path
								d="M3 8.5l3.5 3.5 6.5-7"
								stroke="currentColor"
								stroke-width="2"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<span class="text-xs text-emerald-600 dark:text-emerald-400">Copied</span>
					{:else}
						<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true">
							<rect x="4.5" y="4.5" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none" />
							<path
								d="M6.5 4.5V3a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-1.5"
								stroke="currentColor"
								stroke-width="1.4"
								fill="none"
								stroke-linecap="round"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</header>

		{#if loadError}
			<div
				class="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
			>
				{loadError}
			</div>
		{/if}

		{#if approvalWait}
			<div
				class="flex items-start gap-3 rounded-2xl border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
			>
				<span class="mt-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
				<div class="flex-1">
					<p class="font-medium">Awaiting approval on your Clave app…</p>
					<p class="mt-1 text-xs">
						Open Clave and tap <strong>Approve</strong> (or <strong>Always allow</strong> to skip
						future prompts for kind 0 edits). Waiting {approvalElapsedSec}s.
					</p>
				</div>
			</div>
		{/if}

		<form
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
			class="space-y-4"
		>
			<FormSectionCard label="Identity">
				<Field
					label="Display name"
					placeholder="Your name as shown to readers"
					bind:value={fields.display_name}
				/>
				<Field label="Username" placeholder="lowercase, no spaces" bind:value={fields.name} />
				<TextareaField label="About" placeholder="A short bio…" bind:value={fields.about} />
			</FormSectionCard>

			<FormSectionCard label="Banner">
				<Field
					label="Banner URL"
					placeholder="https://… (wider image, header)"
					bind:value={fields.banner}
					type="url"
				/>
			</FormSectionCard>

			<FormSectionCard label="Verification & links">
				<Field label="NIP-05 verifier" placeholder="you@example.com" bind:value={fields.nip05} />
				<Field
					label="Lightning address (lud16)"
					placeholder="you@walletofsatoshi.com"
					bind:value={fields.lud16}
				/>
				<Field label="Website" placeholder="https://…" bind:value={fields.website} type="url" />
			</FormSectionCard>

			<FormSectionCard label="Account type">
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						bind:checked={fields.bot}
						class="mt-0.5 h-4 w-4 rounded border-[var(--clave-border)] accent-[var(--clave-tint)]"
					/>
					<div class="text-sm">
						<span class="font-semibold">This account is a bot</span>
						<p class="text-xs text-[var(--clave-text-muted)]">
							Mark when content is wholly or partially produced by automation. Helps clients
							label feeds correctly (NIP-24).
						</p>
					</div>
				</label>
			</FormSectionCard>

			{#if !nip65Present}
				<div
					class="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
				>
					<svg viewBox="0 0 16 16" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
						<path
							d="M8 1.5l7 12.5H1L8 1.5zm0 4.5v4m0 2v.5"
							stroke="currentColor"
							stroke-width="1.4"
							fill="none"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<div>
						<p class="font-medium">No relay list (NIP-65) found.</p>
						<p class="mt-0.5 text-xs">
							Your profile will only reach the default broadcast set until you tell Nostr where you
							write. The relay list editor is coming in phase 2.
						</p>
					</div>
				</div>
			{/if}

			<div class="flex items-center gap-3 pt-2">
				<button
					type="submit"
					disabled={phase === 'publishing' || loadStatus === 'failed'}
					title={loadStatus === 'failed'
						? 'Refresh the page to load existing data before saving'
						: undefined}
					class="rounded-xl bg-[var(--clave-tint)] px-4 py-2.5 text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90 disabled:opacity-50"
				>
					{phase === 'publishing'
						? approvalWait
							? `Awaiting approval… (${approvalElapsedSec}s)`
							: 'Publishing…'
						: 'Save & publish'}
				</button>
				{#if lastSavedEvent}
					<button
						type="button"
						onclick={syncAcrossNostr}
						disabled={phase === 'syncing'}
						class="rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--clave-surface)] disabled:opacity-50"
					>
						{phase === 'syncing' ? 'Syncing…' : 'Sync across Nostr'}
					</button>
				{/if}
			</div>
		</form>

		{#if publishReport}
			<section
				class="rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4 text-sm"
			>
				<p class="font-medium">Published to {totalRelaysOk}/{totalRelays} relays</p>
				<RelayList title="Your write relays" results={publishReport.tier1} />
				<RelayList title="Broadcast set" results={publishReport.tier2} />
			</section>
		{/if}

		{#if scanReport}
			<section
				class="rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4 text-sm"
			>
				<p class="font-medium">
					Updated {scanReport.updated.length} · Synced {scanReport.synced.length} · Older {scanReport.older.length} · Missing {scanReport.missing.length} · Offline {scanReport.offline.length}
				</p>
				{#if scanReport.updated.length > 0 || scanReport.offline.length > 0}
					<details class="mt-2">
						<summary class="cursor-pointer text-[var(--clave-text-muted)]">Show details</summary>
						<ul class="mt-2 space-y-1 font-mono text-xs">
							{#each scanReport.updated as r}
								<li class="text-emerald-700 dark:text-emerald-400">↑ {r.url}</li>
							{/each}
							{#each scanReport.offline as url}
								<li class="text-[var(--clave-text-muted)]">— {url} (offline)</li>
							{/each}
						</ul>
					</details>
				{/if}
			</section>
		{/if}
	</div>
{/if}

<!-- Picture URL editor dialog. Two-way bound to fields.picture, so changes
     here also reflect in the Images form section (and vice versa). Won't
     publish until the user submits the main form. -->
<dialog
	bind:this={pictureDialog}
	onclose={() => (pictureEditorOpen = false)}
	class="fixed inset-0 m-auto rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-0 text-[var(--clave-text-muted)] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
>
	<div class="w-[min(440px,calc(100vw-2rem))] p-5">
		<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">
			Edit profile picture
		</h2>
		<div class="mt-4 flex items-center gap-3">
			<Avatar
				pubkey={userPubkey}
				size="lg"
				label={resolvedLabel}
				picture={editingPictureUrl}
			/>
			<p class="text-xs">
				Live preview. Leave blank for no picture, paste your own URL, or pick a Robohash style
				below.
			</p>
		</div>
		<label class="mt-4 block">
			<span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Picture URL</span>
			<input
				type="url"
				bind:value={editingPictureUrl}
				placeholder="https://…"
				class="mt-1.5 block w-full rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clave-tint)]/40"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						applyPictureEdit();
					}
				}}
			/>
		</label>
		{#if !editingPictureUrl || isRobohashUrl(editingPictureUrl)}
			<fieldset class="mt-4">
				<legend class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					Robohash style
				</legend>
				<div class="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
					{#each ROBOHASH_SETS as s (s.id)}
						{@const isActive =
							currentSet === s.id && isRobohashUrl(editingPictureUrl)}
						<button
							type="button"
							onclick={() => {
								setRobohashSet(s.id);
								// Always (re)populate the URL with the chosen style — both
								// when the field was empty (pick to enable Robohash) and
								// when it already had a Robohash (swap sets). Custom URLs
								// are left alone, but the picker isn't rendered in that
								// case.
								editingPictureUrl = defaultAvatarUrl(userPubkey, s.id);
							}}
							class="rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors"
							style:border-color={isActive ? 'var(--clave-tint)' : 'var(--clave-border)'}
							style:background-color={isActive
								? 'color-mix(in srgb, var(--clave-tint) 12%, transparent)'
								: 'transparent'}
							style:color={isActive ? 'var(--clave-tint)' : 'inherit'}
						>
							{s.label}
						</button>
					{/each}
				</div>
				<p class="mt-2 text-[11px]">
					{#if !editingPictureUrl}
						No picture set — pick a style to use Robohash, or click Apply to publish blank.
					{:else}
						Or remove the picture entirely so other clients use their own default avatar.
					{/if}
				</p>
			</fieldset>
		{/if}
		<div class="mt-5 flex flex-wrap items-center justify-end gap-2">
			{#if editingPictureUrl}
				<button
					type="button"
					onclick={() => (editingPictureUrl = '')}
					class="mr-auto rounded-xl px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-400"
					title="Clear the URL so the published kind 0 has no picture"
				>
					Remove picture
				</button>
			{/if}
			<button
				type="button"
				onclick={() => (pictureEditorOpen = false)}
				class="rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-4 py-2 text-sm font-medium hover:bg-[var(--clave-surface)]"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={applyPictureEdit}
				class="rounded-xl bg-[var(--clave-tint)] px-4 py-2 text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90"
			>
				Apply
			</button>
		</div>
	</div>
</dialog>

<!-- No-event confirm dialog. Shown before publish when fetchLatestProfile
     returned no-event status (no kind:0 found on any of the queried relays,
     including the wider SCAN_SET fallback). User might still have a kind:0
     elsewhere on a private/uncommon relay we don't query, so we warn that
     a fresh-state publish would replace it. They can confirm to proceed
     anyway, or cancel. -->
<dialog
	bind:this={noEventDialog}
	class="fixed inset-0 m-auto rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-0 text-[var(--clave-text-muted)] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
>
	<div class="w-[min(480px,calc(100vw-2rem))] p-5">
		<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">
			No existing profile found
		</h2>
		<p class="mt-3 text-sm">
			We couldn't find an existing kind:0 for this account on the relays we checked
			(including the wider fallback set). If you've published a profile via another
			Nostr client to a relay we don't query, saving now will create a fresh kind:0
			— and any fields not in this form will be missing.
		</p>
		<p class="mt-2 text-sm">If you're sure this is your first profile publish, go ahead.</p>
		<div class="mt-5 flex flex-wrap items-center justify-end gap-2">
			<button
				type="button"
				onclick={() => noEventDialog?.close()}
				class="rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-4 py-2 text-sm font-medium hover:bg-[var(--clave-surface)]"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={() => {
					confirmedNoEventSave = true;
					noEventDialog?.close();
					void save();
				}}
				class="rounded-xl bg-[var(--clave-tint)] px-4 py-2 text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90"
			>
				Save anyway
			</button>
		</div>
	</div>
</dialog>
