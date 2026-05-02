<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { VerifiedEvent } from 'nostr-tools/core';
	import {
		getActiveConnection,
		upsertConnection,
		type Connection
	} from '$lib/connections';
	import { connectSigner, getActiveSigner, signWithApprovalWait } from '$lib/signer';
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
	let approvalWait = $state<{ attempt: number; elapsedSec: number } | undefined>(undefined);

	onMount(async () => {
		conn = getActiveConnection();
		if (!conn) {
			goto('/connect', { replaceState: true });
			return;
		}
		try {
			const active = getActiveSigner();
			if (active && active.userPubkey === conn.accountPubkey) {
				userPubkey = active.userPubkey;
			} else {
				const { userPubkey: pk } = await connectSigner(conn);
				userPubkey = pk;
			}
			await loadProfile();
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			phase = 'editing';
		}
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
			if (conn && (next.display_name || next.name)) {
				const updated = { ...conn, label: next.display_name || next.name };
				upsertConnection(updated);
				conn = updated;
			}
		} catch {
			// content wasn't JSON; ignore
		}
	}

	async function save() {
		if (phase !== 'editing') return;
		const active = getActiveSigner();
		if (!active) {
			loadError = 'No active signer.';
			return;
		}
		phase = 'publishing';
		publishReport = undefined;
		scanReport = undefined;
		approvalWait = undefined;
		loadError = '';

		const content = JSON.stringify({ ...extraFields, ...stripEmpty(fields) });
		try {
			const signed = await signWithApprovalWait(
				() =>
					active.signer.signEvent({
						kind: 0,
						content,
						tags: [],
						created_at: Math.floor(Date.now() / 1000)
					}),
				{
					onWait: (attempt, elapsedMs) => {
						approvalWait = { attempt, elapsedSec: Math.round(elapsedMs / 1000) };
					}
				}
			);
			approvalWait = undefined;
			lastSavedEvent = signed;
			publishReport = await publishThreeTier(signed, userPubkey);
		} catch (e) {
			approvalWait = undefined;
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

	const totalRelaysOk = $derived(
		(publishReport?.tier1.filter((r) => r.ok).length ?? 0) +
			(publishReport?.tier2.filter((r) => r.ok).length ?? 0)
	);
	const totalRelays = $derived(
		(publishReport?.tier1.length ?? 0) + (publishReport?.tier2.length ?? 0)
	);
</script>

{#if phase === 'loading'}
	<p class="py-12 text-center text-sm text-neutral-500">Loading your profile…</p>
{:else}
	<div class="space-y-6">
		<header class="flex items-baseline justify-between">
			<h1 class="text-2xl font-semibold">Edit profile</h1>
			<span class="font-mono text-xs text-neutral-500">{userPubkey.slice(0, 12)}…</span>
		</header>

		{#if loadError}
			<div
				class="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
			>
				{loadError}
			</div>
		{/if}

		{#if !nip65Present}
			<div
				class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
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
				class="flex items-start gap-3 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
			>
				<span class="mt-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
				<div class="flex-1">
					<p class="font-medium">Awaiting approval on your Clave app…</p>
					<p class="mt-1 text-xs">
						Open Clave and tap to approve. We'll auto-retry every 8s — elapsed {approvalWait.elapsedSec}s
						(attempt {approvalWait.attempt}).
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
			<Field label="Display name" placeholder="Your name as shown to readers" bind:value={fields.display_name} />
			<Field label="Username" placeholder="lowercase, no spaces" bind:value={fields.name} />
			<Field label="Picture URL" placeholder="https://…" bind:value={fields.picture} type="url" />
			<Field label="Banner URL" placeholder="https://… (wider image, header)" bind:value={fields.banner} type="url" />
			<TextareaField label="About" placeholder="A short bio…" bind:value={fields.about} />
			<Field label="NIP-05 verifier" placeholder="you@example.com" bind:value={fields.nip05} />
			<Field label="Lightning address (lud16)" placeholder="you@walletofsatoshi.com" bind:value={fields.lud16} />
			<Field label="Website" placeholder="https://…" bind:value={fields.website} type="url" />

			<div class="flex items-center gap-3 pt-2">
				<button
					type="submit"
					disabled={phase === 'publishing'}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{phase === 'publishing'
						? approvalWait
							? `Awaiting approval… (${approvalWait.elapsedSec}s)`
							: 'Publishing…'
						: 'Save & publish'}
				</button>
				{#if lastSavedEvent}
					<button
						type="button"
						onclick={syncAcrossNostr}
						disabled={phase === 'syncing'}
						class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
					>
						{phase === 'syncing' ? 'Syncing…' : 'Sync across Nostr'}
					</button>
				{/if}
			</div>
		</form>

		{#if publishReport}
			<section
				class="rounded-md border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="font-medium">Published to {totalRelaysOk}/{totalRelays} relays</p>
				<RelayList title="Your write relays" results={publishReport.tier1} />
				<RelayList title="Broadcast set" results={publishReport.tier2} />
			</section>
		{/if}

		{#if scanReport}
			<section
				class="rounded-md border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="font-medium">
					Updated {scanReport.updated.length} · Synced {scanReport.synced.length} · Older {scanReport.older.length} · Missing {scanReport.missing.length} · Offline {scanReport.offline.length}
				</p>
				{#if scanReport.updated.length > 0 || scanReport.offline.length > 0}
					<details class="mt-2">
						<summary class="cursor-pointer text-neutral-600 dark:text-neutral-400">Show details</summary>
						<ul class="mt-2 space-y-1 font-mono text-xs">
							{#each scanReport.updated as r}
								<li class="text-emerald-700 dark:text-emerald-400">↑ {r.url}</li>
							{/each}
							{#each scanReport.offline as url}
								<li class="text-neutral-500">— {url} (offline)</li>
							{/each}
						</ul>
					</details>
				{/if}
			</section>
		{/if}
	</div>
{/if}
