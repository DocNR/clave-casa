<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadConnections, getActiveConnection } from '$lib/connections';

	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/edit', { replaceState: true });
		}
	});
</script>

<div class="space-y-8 py-12">
	<header class="space-y-3 text-center">
		<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">clave.casa</h1>
		<p class="mx-auto max-w-xl text-[var(--clave-text-muted)]">
			A small set of Nostr tools that sign with your remote signer. Edit your profile, manage
			your contact list, set your relay list — without exposing your nsec to the browser.
		</p>
	</header>

	<div
		class="mx-auto max-w-md space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-6"
	>
		<h2 class="text-lg font-semibold">Get started</h2>
		<p class="text-sm text-[var(--clave-text-muted)]">
			Open Clave on your phone and tap <em>Open in browser</em> from your account, or paste a
			bunker URI from any NIP-46 signer.
		</p>
		<a
			href="/connect"
			class="inline-block w-full rounded-xl bg-[var(--clave-tint)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90"
		>
			Connect
		</a>
	</div>

	<footer class="pt-12 text-center text-xs text-[var(--clave-text-muted)]">
		<p>
			Open source · No analytics · Your keys never leave your signer ·
			<a class="hover:underline" href="https://github.com/DocNR/clave-casa">source</a>
		</p>
	</footer>
</div>
