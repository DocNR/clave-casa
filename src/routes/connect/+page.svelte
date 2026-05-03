<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import QRCode from 'qrcode';
	import { upsertConnection, setActivePubkey, type Connection } from '$lib/connections';
	import {
		connectSigner,
		connectViaNostrConnect,
		parseBunkerInput,
		type ConnectStage
	} from '$lib/signer';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { copyToClipboard } from '$lib/clipboard';
	import {
		AMBER_PLAY_STORE_URL,
		CLAVE_INSTALL_LABEL,
		CLAVE_INSTALL_URL,
		NSEC_APP_URL
	} from '$lib/marketing';

	type Tab = 'qr' | 'paste';

	let tab = $state<Tab>('qr');
	let pasted = $state('');
	let status: 'idle' | 'connecting' | 'error' = $state('idle');
	let errorMessage = $state('');
	let stage = $state<ConnectStage | null>(null);
	let stageDetail = $state('');
	let elapsedSec = $state(0);
	let elapsedTimer: ReturnType<typeof setInterval> | undefined;

	// nostrconnect flow state
	let ncUri = $state('');
	let ncQrSvg = $state('');
	let ncCopied = $state(false);
	let ncCopyTimer: ReturnType<typeof setTimeout> | undefined;
	let ncAbort: AbortController | undefined;

	// Inbound-URI fallback state. When a Universal Link from a third-party
	// app (https://clave.casa/connect/?uri=nostrconnect://...) lands here
	// because Clave isn't installed (or AASA hasn't propagated yet), we
	// render the URI as a QR for the user's actually-installed signer to
	// scan. clave.casa is just a transit display in this flow — the original
	// client (e.g. nostrudel) is listening on the URI's relay for the ack.
	let inboundUri = $state('');
	let inboundQrSvg = $state('');
	let inboundCopied = $state(false);
	let inboundCopyTimer: ReturnType<typeof setTimeout> | undefined;

	// Stale-connection banner state. Set when /edit auto-cleans a connection
	// after the signer rejected the bunker secret (deleted iOS-side) and
	// redirects here with ?reason=stale. The banner explains what happened
	// so the user doesn't think they got randomly logged out.
	let staleBanner = $state(false);

	onMount(() => {
		// Stale-redirect banner: /edit redirects here with ?reason=stale when
		// it auto-cleans a dead connection. Show the banner, then scrub the
		// query so a refresh doesn't keep showing it.
		const reason = new URLSearchParams(location.search).get('reason');
		if (reason === 'stale') {
			staleBanner = true;
			history.replaceState(null, '', '/connect');
		}

		// (1) iOS helper handoff via #bunker= fragment — same handler as before.
		const fragment = location.hash.slice(1);
		if (fragment) {
			const params = new URLSearchParams(fragment);
			const bunker = params.get('bunker');
			history.replaceState(null, '', '/connect');
			if (bunker) {
				tab = 'paste';
				handoffBunker(bunker);
				return;
			}
		}

		// (2) Universal-Link fallback via ?uri= query param. iOS Clave intercepts
		// this URL shape directly when installed (per AASA scoping); when it
		// doesn't, Safari opens it here. We recognize both bunker:// (third
		// party sending us a bunker to use as a client) and nostrconnect://
		// (third party generated a nostrconnect URI for our signer to consume).
		const queryUri = new URLSearchParams(location.search).get('uri');
		if (queryUri) {
			// Scrub the query from the URL bar — mirrors the #bunker= scrubbing
			// pattern. Same reason: avoid leaking the URI into Cloudflare logs
			// via referrer or browser history.
			history.replaceState(null, '', '/connect');
			if (queryUri.startsWith('bunker://')) {
				tab = 'paste';
				handoffBunker(queryUri);
				return;
			}
			if (queryUri.startsWith('nostrconnect://')) {
				void renderInboundUri(queryUri);
				return;
			}
			// Unknown scheme — surface inline error, fall through to default UI.
			status = 'error';
			errorMessage =
				"That link's URI scheme isn't recognized. Expected bunker:// or nostrconnect://.";
			return;
		}

		// (3) Default: kick off our own nostrconnect flow so the QR is ready
		// when the user looks at the page.
		startNostrConnectFlow();
	});

	onDestroy(() => {
		ncAbort?.abort();
		stopElapsedTimer();
		if (inboundCopyTimer) clearTimeout(inboundCopyTimer);
	});

	// Inbound-URI flow: render the third-party-generated nostrconnect URI as
	// a QR code so the user's signer (which is presumably NOT Clave, since
	// otherwise the Universal Link would have intercepted) can scan it. The
	// original client (e.g. nostrudel) is listening on the URI's relay for
	// the signer's ack — clave.casa just displays the QR and steps aside.
	async function renderInboundUri(uri: string) {
		inboundUri = uri;
		// Stop the outbound nostrconnect flow if it kicked off — we're not
		// generating our own URI in this mode.
		ncAbort?.abort();
		try {
			inboundQrSvg = await QRCode.toString(uri, {
				type: 'svg',
				errorCorrectionLevel: 'M',
				margin: 1
			});
		} catch (e) {
			console.warn('[clave.casa] inbound QR render failed:', e);
		}
	}

	async function copyInboundUri() {
		if (!inboundUri) return;
		const ok = await copyToClipboard(inboundUri);
		if (!ok) return;
		inboundCopied = true;
		if (inboundCopyTimer) clearTimeout(inboundCopyTimer);
		inboundCopyTimer = setTimeout(() => (inboundCopied = false), 1600);
	}

	function startElapsedTimer() {
		elapsedSec = 0;
		elapsedTimer = setInterval(() => (elapsedSec += 1), 1000);
	}

	function stopElapsedTimer() {
		if (elapsedTimer) clearInterval(elapsedTimer);
		elapsedTimer = undefined;
	}

	async function startNostrConnectFlow() {
		// Cancel any prior in-flight nostrconnect attempt before starting.
		ncAbort?.abort();
		ncAbort = new AbortController();
		ncUri = '';
		ncQrSvg = '';
		errorMessage = '';
		status = 'idle';

		try {
			const { userPubkey, uri } = await connectViaNostrConnect({
				signal: ncAbort.signal,
				onUri: async (generated) => {
					ncUri = generated;
					try {
						ncQrSvg = await QRCode.toString(generated, {
							type: 'svg',
							errorCorrectionLevel: 'M',
							margin: 1
						});
					} catch (e) {
						console.warn('[clave.casa] QR render failed:', e);
					}
				},
				onStage: (s, d) => {
					if (s !== 'ready') {
						stage = s;
						stageDetail = d ?? '';
					}
				}
			});
			status = 'connecting';
			startElapsedTimer();
			finalizeConnection({
				userPubkey,
				bunkerUri: '' // nostrconnect flow doesn't have a stored bunker URI
			});
		} catch (e) {
			if (ncAbort?.signal.aborted) return;
			status = 'error';
			errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	async function handoffBunker(bunkerUri: string) {
		const bp = await parseBunkerInput(bunkerUri);
		if (!bp) {
			status = 'error';
			errorMessage = "That doesn't look like a valid bunker URI.";
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
			finalizeConnection({ userPubkey, bunkerUri });
		} catch (e) {
			stopElapsedTimer();
			status = 'error';
			errorMessage = e instanceof Error ? e.message : String(e);
		}
	}

	function finalizeConnection({
		userPubkey,
		bunkerUri
	}: {
		userPubkey: string;
		bunkerUri: string;
	}) {
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
	}

	function submitPaste(event: Event) {
		event.preventDefault();
		const trimmed = pasted.trim();
		if (!trimmed) return;
		handoffBunker(trimmed);
	}

	function switchTab(next: Tab) {
		if (tab === next) return;
		tab = next;
		errorMessage = '';
		status = 'idle';
		stopElapsedTimer();
		if (next === 'qr' && !ncUri) {
			startNostrConnectFlow();
		} else if (next === 'paste') {
			ncAbort?.abort();
		}
	}

	async function copyNcUri() {
		if (!ncUri) return;
		const ok = await copyToClipboard(ncUri);
		if (!ok) {
			console.warn('[clave.casa] clipboard write failed');
			return;
		}
		ncCopied = true;
		if (ncCopyTimer) clearTimeout(ncCopyTimer);
		ncCopyTimer = setTimeout(() => (ncCopied = false), 1600);
	}

	const stageLabel = $derived(
		({
			parsing: 'Preparing',
			'opening-relay': 'Opening relays',
			'sending-connect': 'Sending connect',
			'awaiting-ack': 'Waiting for signer',
			'fetching-pubkey': 'Fetching pubkey',
			ready: 'Ready'
		}[stage ?? 'parsing'] ?? 'Working')
	);
</script>

<div class="mx-auto max-w-md space-y-5 py-6">
	{#if inboundUri}
		<!-- Inbound-URI fallback: a third-party app sent the user here via a
		     Universal Link, but Clave isn't intercepting (not installed, AASA
		     not yet propagated, or both). Render the URI as a QR for whatever
		     signer the user actually has, plus install links for users who
		     have no signer at all. -->
		<header class="space-y-2">
			<h1 class="text-3xl font-semibold">Open in your signer</h1>
			<p class="text-sm text-[var(--clave-text-muted)]">
				A Nostr app sent you a connection request. Scan this code with your signer to complete
				the connection — clave.casa is just displaying the request.
			</p>
		</header>

		<div
			class="space-y-4 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4"
		>
			<div class="flex justify-center">
				{#if inboundQrSvg}
					<div class="rounded-2xl bg-white p-3 shadow-sm">
						{@html inboundQrSvg.replace('<svg ', '<svg class="h-56 w-56" ')}
					</div>
				{:else}
					<div
						class="flex h-56 w-56 items-center justify-center rounded-2xl bg-[var(--clave-surface)]"
					>
						<p class="text-xs text-[var(--clave-text-muted)]">Generating…</p>
					</div>
				{/if}
			</div>
			<button
				type="button"
				onclick={copyInboundUri}
				title="Copy connect string"
				class="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface)] px-3 py-2 text-left font-mono text-xs text-[var(--clave-text-muted)] hover:text-[var(--clave-tint)]"
			>
				<span class="truncate">{inboundUri}</span>
				{#if inboundCopied}
					<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true">
						<path
							d="M3 8.5l3.5 3.5 6.5-7"
							stroke="currentColor"
							stroke-width="2"
							fill="none"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{:else}
					<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true">
						<rect
							x="4.5"
							y="4.5"
							width="7"
							height="9"
							rx="1.5"
							stroke="currentColor"
							stroke-width="1.4"
							fill="none"
						/>
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

		<section
			class="space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface)] p-4"
		>
			<p class="text-sm font-semibold text-[var(--clave-text)]">Don't have a signer?</p>
			<p class="text-xs text-[var(--clave-text-muted)]">
				A NIP-46 signer holds your nsec and approves signing requests on your behalf. Install
				one of these:
			</p>
			<ul class="space-y-2 text-sm">
				<li>
					<a
						href={CLAVE_INSTALL_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[var(--clave-tint)] hover:underline"
					>
						<strong>Clave</strong>
					</a>
					<span class="text-[var(--clave-text-muted)]">— iOS, {CLAVE_INSTALL_LABEL}</span>
				</li>
				<li>
					<a
						href={AMBER_PLAY_STORE_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[var(--clave-tint)] hover:underline"
					>
						<strong>Amber</strong>
					</a>
					<span class="text-[var(--clave-text-muted)]">— Android, Play Store</span>
				</li>
				<li>
					<a
						href={NSEC_APP_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[var(--clave-tint)] hover:underline"
					>
						<strong>nsec.app</strong>
					</a>
					<span class="text-[var(--clave-text-muted)]">— web, no install</span>
				</li>
			</ul>
		</section>

		<p class="text-xs text-[var(--clave-text-muted)]">
			Already have Clave installed? The handoff cache may still be propagating (~24h). Try the
			link again in a few hours, or scan the code above with another device's signer.
		</p>
	{:else}
		{#if staleBanner}
			<!-- Auto-cleaned stale connection — /edit redirected here after the
			     signer rejected the stored bunker secret. Explain what happened
			     so the user doesn't think they got mysteriously logged out. -->
			<div
				class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
			>
				<p class="font-semibold">Your previous connection was removed</p>
				<p class="mt-1">
					Clave rejected the stored connection — usually because the account or pairing was
					deleted on your phone. Pair this account again below to keep editing.
				</p>
			</div>
		{/if}
		<header class="space-y-2">
			<!-- text-3xl matches /edit page heading per design-system.md §3 typography table. -->
			<h1 class="text-3xl font-semibold">Connect a signer</h1>
			<p class="text-sm text-[var(--clave-text-muted)]">
				Sign in with a NIP-46 signer (Clave, Amber, nsec.app). Your private key never leaves the
				signer.
			</p>
		</header>

	<!-- Tabs -->
	<div
		class="grid grid-cols-2 gap-1 rounded-full border border-[var(--clave-border)] bg-[var(--clave-surface)] p-1"
	>
		<button
			type="button"
			onclick={() => switchTab('qr')}
			class="rounded-full px-3 py-2 text-sm font-medium transition-colors"
			class:active-tab={tab === 'qr'}
		>
			Scan QR
		</button>
		<button
			type="button"
			onclick={() => switchTab('paste')}
			class="rounded-full px-3 py-2 text-sm font-medium transition-colors"
			class:active-tab={tab === 'paste'}
		>
			Paste URI
		</button>
	</div>

	{#if status === 'error'}
		<div
			class="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
		>
			<p class="font-semibold">Couldn't connect</p>
			<p class="mt-1 whitespace-pre-line">{errorMessage}</p>
			<button
				type="button"
				class="mt-3 text-sm font-semibold text-[var(--clave-tint)] hover:opacity-80"
				onclick={() => {
					status = 'idle';
					errorMessage = '';
					if (tab === 'qr') startNostrConnectFlow();
				}}>Try again</button
			>
		</div>
	{:else if tab === 'qr'}
		<div
			class="space-y-4 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4"
		>
			<p class="text-sm text-[var(--clave-text-muted)]">
				Open your NIP-46 signer and scan this QR code, or copy the connect string into the
				signer's remote-login field.
			</p>
			<div class="flex justify-center">
				{#if ncQrSvg}
					<div class="rounded-2xl bg-white p-3 shadow-sm">
						{@html ncQrSvg.replace('<svg ', '<svg class="h-56 w-56" ')}
					</div>
				{:else}
					<div class="flex h-56 w-56 items-center justify-center rounded-2xl bg-[var(--clave-surface)]">
						<p class="text-xs text-[var(--clave-text-muted)]">Generating…</p>
					</div>
				{/if}
			</div>
			{#if ncUri}
				<button
					type="button"
					onclick={copyNcUri}
					title="Copy connect string"
					class="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface)] px-3 py-2 text-left font-mono text-xs text-[var(--clave-text-muted)] hover:text-[var(--clave-tint)]"
				>
					<span class="truncate">{ncUri}</span>
					{#if ncCopied}
						<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true">
							<path
								d="M3 8.5l3.5 3.5 6.5-7"
								stroke="currentColor"
								stroke-width="2"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true">
							<rect
								x="4.5"
								y="4.5"
								width="7"
								height="9"
								rx="1.5"
								stroke="currentColor"
								stroke-width="1.4"
								fill="none"
							/>
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
			{/if}
			<div class="flex items-center gap-2 rounded-xl bg-[var(--clave-surface)] px-3 py-2 text-xs">
				<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--clave-tint)]"></span>
				<span class="flex-1">
					{#if status === 'connecting'}
						{stageLabel}…
					{:else}
						Waiting for your signer to scan or paste this URI…
					{/if}
				</span>
				{#if elapsedSec > 0}
					<StatusPill tone="pending">{elapsedSec}s</StatusPill>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="space-y-4 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4"
		>
			{#if status === 'connecting'}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<p class="font-semibold">{stageLabel}…</p>
						<StatusPill tone="pending">{elapsedSec}s</StatusPill>
					</div>
					{#if stageDetail}
						<p class="font-mono text-xs text-[var(--clave-text-muted)]">{stageDetail}</p>
					{/if}
					<p class="text-xs text-[var(--clave-text-muted)]">
						If your signer prompts for approval, accept on that device.
					</p>
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
			{/if}
		</div>
	{/if}

		<details class="text-sm text-[var(--clave-text-muted)]">
			<summary class="cursor-pointer">Need a signer?</summary>
			<ul class="ml-4 mt-2 list-disc space-y-1">
				<li><strong>Clave</strong> (iOS) — tap your account, then "Connect a client".</li>
				<li><strong>Amber</strong> (Android) — in app settings, generate a bunker URI.</li>
				<li><strong>nsec.app</strong> — create or import a key, then copy a bunker URI.</li>
			</ul>
		</details>
	{/if}
</div>

<style>
	.active-tab {
		background: var(--clave-tint);
		color: var(--clave-tint-fg);
	}
</style>
