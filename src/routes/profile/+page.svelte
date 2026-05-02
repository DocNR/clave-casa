<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { VerifiedEvent } from 'nostr-tools/core';
	import { npubEncode } from 'nostr-tools/nip19';
	import {
		getActiveConnection,
		upsertConnection,
		type Connection
	} from '$lib/connections';
	import { connectSigner, getActiveSigner, signEventViaBunker } from '$lib/signer';
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

	type ProfileFields = {
		name: string;
		display_name: string;
		picture: string;
		banner: string;
		about: string;
		nip05: string;
		lud16: string;
		website: string;
	};

	const empty: ProfileFields = {
		name: '',
		display_name: '',
		picture: '',
		banner: '',
		about: '',
		nip05: '',
		lud16: '',
		website: ''
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

	// Track which account we've loaded so storage events that don't actually
	// change the active account don't trigger pointless reloads.
	let loadedPubkey: string | undefined = undefined;

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
		phase = 'loading';

		try {
			await loadProfile();
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			phase = 'editing';
		}
	}

	onMount(() => {
		void loadForActiveAccount();
		const onStorage = () => void loadForActiveAccount();
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});

	async function loadProfile() {
		nip65Present = await hasNip65(userPubkey);
		const event = await fetchLatestProfile(userPubkey);
		if (!event) return;
		try {
			const parsed = JSON.parse(event.content) as Record<string, unknown>;
			const known: (keyof ProfileFields)[] = [
				'name',
				'display_name',
				'picture',
				'banner',
				'about',
				'nip05',
				'lud16',
				'website'
			];
			const next = { ...empty };
			const extras: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(parsed)) {
				if (known.includes(k as keyof ProfileFields) && typeof v === 'string') {
					next[k as keyof ProfileFields] = v;
				} else {
					extras[k] = v;
				}
			}
			fields = next;
			extraFields = extras;
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

	async function save() {
		if (phase !== 'editing') return;
		let active = getActiveSigner();
		if (!active || active.userPubkey !== userPubkey) {
			if (!conn) {
				loadError = 'No active connection.';
				return;
			}
			try {
				await connectSigner(conn);
			} catch (e) {
				loadError = e instanceof Error ? e.message : String(e);
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

		const content = JSON.stringify({ ...extraFields, ...stripEmpty(fields) });
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
		} catch (e) {
			clearApprovalTick();
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			phase = 'editing';
		}
	}

	async function syncAcrossNostr() {
		if (!lastSavedEvent || phase !== 'editing') return;
		phase = 'syncing';
		try {
			scanReport = await scanAndRebroadcast(lastSavedEvent, userPubkey);
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
				out[k as keyof ProfileFields] = v;
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

	async function copyNpub() {
		if (!npub) return;
		try {
			await navigator.clipboard.writeText(npub);
			npubCopied = true;
			if (npubCopyTimer) clearTimeout(npubCopyTimer);
			npubCopyTimer = setTimeout(() => (npubCopied = false), 1600);
		} catch (e) {
			console.warn('[clave.casa] clipboard write failed:', e);
		}
	}
</script>

{#if phase === 'loading'}
	<p class="py-12 text-center text-sm text-[var(--clave-text-muted)]">Loading your profile…</p>
{:else}
	<div class="space-y-6">
		<header class="flex flex-col items-center gap-3 py-4 text-center">
			<Avatar
				pubkey={userPubkey}
				size="xl"
				label={fields.display_name || fields.name}
				picture={fields.picture}
			/>
			<div class="min-w-0 max-w-full">
				<h1 class="truncate text-3xl font-semibold sm:text-4xl">
					{fields.display_name || fields.name || 'Edit profile'}
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

		{#if !nip65Present}
			<div
				class="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
			>
				<p class="font-medium">No relay list (NIP-65) found.</p>
				<p class="mt-1">
					Your profile will only reach our default broadcast set until you tell Nostr where you
					write. The relay list editor is coming in phase 2.
				</p>
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

			<FormSectionCard label="Images">
				<Field label="Picture URL" placeholder="https://…" bind:value={fields.picture} type="url" />
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

			<div class="flex items-center gap-3 pt-2">
				<button
					type="submit"
					disabled={phase === 'publishing'}
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
