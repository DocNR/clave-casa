<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import { themeForPubkey, fgForHex } from '$lib/theme';
	import { onMount } from 'svelte';
	import { getActivePubkey } from '$lib/connections';

	let { children } = $props();
	let activePubkey = $state<string | undefined>(undefined);

	onMount(() => {
		const refresh = () => (activePubkey = getActivePubkey());
		refresh();
		window.addEventListener('storage', refresh);
		return () => window.removeEventListener('storage', refresh);
	});

	$effect(() => {
		const root = document.documentElement;
		if (!activePubkey) {
			root.style.removeProperty('--clave-tint');
			root.style.removeProperty('--clave-tint-fg');
			return;
		}
		const theme = themeForPubkey(activePubkey);
		root.style.setProperty('--clave-tint', theme.accent);
		root.style.setProperty('--clave-tint-fg', fgForHex(theme.accent));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
	<header
		class="sticky top-0 z-20 border-b border-[var(--clave-border)] bg-[var(--clave-surface)] backdrop-blur-xl"
	>
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<a href="/" class="text-base font-semibold tracking-tight">clave.casa</a>
			<AccountSwitcher />
		</div>
	</header>
	<main class="mx-auto max-w-3xl px-4 py-6">
		{@render children?.()}
	</main>
</div>
