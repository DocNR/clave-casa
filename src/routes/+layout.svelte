<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import { themeForPubkey, fgForHex, ambientGradientCss } from '$lib/theme';
	import { onMount } from 'svelte';
	import { getActivePubkey } from '$lib/connections';

	let { children } = $props();
	let activePubkey = $state<string | undefined>(undefined);
	let colorScheme: 'light' | 'dark' = $state('light');

	onMount(() => {
		const refresh = () => (activePubkey = getActivePubkey());
		refresh();
		window.addEventListener('storage', refresh);

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const updateScheme = () => (colorScheme = mql.matches ? 'dark' : 'light');
		updateScheme();
		mql.addEventListener('change', updateScheme);

		return () => {
			window.removeEventListener('storage', refresh);
			mql.removeEventListener('change', updateScheme);
		};
	});

	$effect(() => {
		const root = document.documentElement;
		if (!activePubkey) {
			root.style.removeProperty('--clave-tint');
			root.style.removeProperty('--clave-tint-fg');
			root.style.removeProperty('--clave-ambient');
			return;
		}
		const theme = themeForPubkey(activePubkey);
		root.style.setProperty('--clave-tint', theme.accent);
		root.style.setProperty('--clave-tint-fg', fgForHex(theme.accent));
		root.style.setProperty('--clave-ambient', ambientGradientCss(theme, colorScheme));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
	<!-- Ambient gradient overlay (per-active-account). Sits above the
	     wrapper's solid bg-neutral-* and below the sticky header + main
	     content. Switches via $effect on activePubkey / colorScheme. -->
	<div class="clave-ambient-layer" aria-hidden="true"></div>
	<header
		class="sticky top-0 z-20 border-b border-[var(--clave-border)] bg-[var(--clave-surface)] backdrop-blur-xl"
	>
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<a href="/" class="text-base font-semibold tracking-tight">clave.casa</a>
			<AccountSwitcher />
		</div>
	</header>
	<main class="relative z-10 mx-auto max-w-3xl px-4 py-6">
		{@render children?.()}
	</main>
</div>
