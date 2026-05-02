<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadConnections, getActiveConnection } from '$lib/connections';

	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/profile', { replaceState: true });
		}
	});
</script>

<div class="space-y-8 py-12">
	<header class="space-y-3 text-center">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">clave.casa</h1>
		<p class="mx-auto max-w-xl text-neutral-600 dark:text-neutral-400">
			A small set of Nostr tools that sign with your remote signer. Edit your profile, manage
			your contact list, set your relay list — without exposing your nsec to the browser.
		</p>
	</header>

	<div
		class="mx-auto max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
	>
		<h2 class="text-lg font-semibold">Get started</h2>
		<p class="text-sm text-neutral-600 dark:text-neutral-400">
			Open Clave on your phone and tap <em>Open in browser</em> from your account, or paste a
			bunker URI from any NIP-46 signer.
		</p>
		<a
			href="/connect"
			class="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
		>
			Connect
		</a>
	</div>

	<footer class="pt-12 text-center text-xs text-neutral-500">
		<p>
			Open source · No analytics · Your keys never leave your signer ·
			<a class="hover:underline" href="https://github.com/DocNR/clave-casa">source</a>
		</p>
	</footer>
</div>
