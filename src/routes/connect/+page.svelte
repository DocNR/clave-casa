<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { upsertConnection, setActivePubkey, type Connection } from '$lib/connections';
	import { connectSigner, parseBunkerInput, type ConnectStage } from '$lib/signer';
	import StatusPill from '$lib/components/StatusPill.svelte';

	let pasted = $state('');
	let status: 'idle' | 'connecting' | 'error' = $state('idle');
	let errorMessage = $state('');
	let stage = $state<ConnectStage | null>(null);
	let stageDetail = $state('');
	let elapsedSec = $state(0);
	let elapsedTimer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		// If the iOS-side helper sent us here with #bunker=..., consume it
		// immediately and scrub from the URL bar before any logging picks it up.
		const fragment = location.hash.slice(1);
		if (fragment) {
			const params = new URLSearchParams(fragment);
			const bunker = params.get('bunker');
			history.replaceState(null, '', '/connect');
			if (bunker) handoff(bunker);
		}
	});

	function startElapsedTimer() {
		elapsedSec = 0;
		elapsedTimer = setInterval(() => (elapsedSec += 1), 1000);
	}

	function stopElapsedTimer() {
		if (elapsedTimer) clearInterval(elapsedTimer);
		elapsedTimer = undefined;
	}

	async function handoff(bunkerUri: string) {
		const bp = await parseBunkerInput(bunkerUri);
		if (!bp) {
			status = 'error';
			errorMessage = 'That doesn’t look like a valid bunker URI.';
			return;
		}

		status = 'connecting';
		stage = 'parsing';
		stageDetail = '';
		startElapsedTimer();

		try {
			const { userPubkey } = await connectSigner(
				{ accountPubkey: bp.pubkey, bunkerUri, addedAt: Date.now() },
				{
					onStage: (s, detail) => {
						stage = s;
						stageDetail = detail ?? '';
					}
				}
			);
			const conn: Connection = {
				accountPubkey: userPubkey,
				bunkerUri,
				addedAt: Date.now()
			};
			upsertConnection(conn);
			setActivePubkey(userPubkey);
			window.dispatchEvent(new StorageEvent('storage', { key: 'clave-casa.activeAccount.v1' }));
			stopElapsedTimer();
			goto('/edit', { replaceState: true });
		} catch (e) {
			stopElapsedTimer();
			status = 'error';
			errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	function submitPaste(event: Event) {
		event.preventDefault();
		const trimmed = pasted.trim();
		if (!trimmed) return;
		handoff(trimmed);
	}

	const stageLabel = $derived(
		({
			parsing: 'Parsing bunker URI',
			'opening-relay': 'Opening relay connection',
			'sending-connect': 'Sending connect request',
			'awaiting-ack': 'Waiting for signer to acknowledge',
			'fetching-pubkey': 'Fetching your pubkey',
			ready: 'Ready'
		}[stage ?? 'parsing'] ?? 'Working…')
	);
</script>

<div class="mx-auto max-w-md space-y-6 py-8">
	<header class="space-y-2">
		<h1 class="text-2xl font-semibold">Connect a signer</h1>
		<p class="text-sm text-[var(--clave-text-muted)]">
			Paste a bunker URI from Clave or any NIP-46 signer (Amber, nsec.app, …). Your private key
			stays on the signer.
		</p>
	</header>

	{#if status === 'connecting'}
		<div
			class="space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4 text-sm"
		>
			<div class="flex items-center justify-between">
				<p class="font-semibold">{stageLabel}…</p>
				<StatusPill tone="pending">{elapsedSec}s</StatusPill>
			</div>
			{#if stageDetail}
				<p class="font-mono text-xs text-[var(--clave-text-muted)]">{stageDetail}</p>
			{/if}
			<p class="text-xs text-[var(--clave-text-muted)]">
				If your signer prompts for approval, accept on that device. Times out at 45s.
			</p>
		</div>
	{:else if status === 'error'}
		<div
			class="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
		>
			<p class="font-medium">Couldn&apos;t connect</p>
			<p class="mt-1 whitespace-pre-line">{errorMessage}</p>
			<button
				type="button"
				class="mt-3 text-sm underline"
				onclick={() => {
					status = 'idle';
					errorMessage = '';
				}}>Try again</button
			>
		</div>
	{:else}
		<form onsubmit={submitPaste} class="space-y-3">
			<label class="block">
				<span class="text-sm font-semibold">Bunker URI</span>
				<textarea
					bind:value={pasted}
					rows="3"
					placeholder="bunker://&lt;pubkey&gt;?relay=wss://&hellip;&amp;secret=&hellip;"
					class="mt-1.5 block w-full rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clave-tint)]/40"
				></textarea>
			</label>
			<button
				type="submit"
				class="w-full rounded-xl bg-[var(--clave-tint)] px-4 py-2.5 text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90"
			>
				Connect
			</button>
		</form>

		<details class="text-sm text-[var(--clave-text-muted)]">
			<summary class="cursor-pointer">Where do I get a bunker URI?</summary>
			<ul class="ml-4 mt-2 list-disc space-y-1">
				<li><strong>Clave (iOS):</strong> tap your account, then “Connect a client” to copy a bunker URI.</li>
				<li><strong>Amber (Android):</strong> in app settings, generate a bunker URI for clave.casa.</li>
				<li><strong>nsec.app:</strong> create or import a key, then copy a bunker URI.</li>
			</ul>
		</details>
	{/if}
</div>
