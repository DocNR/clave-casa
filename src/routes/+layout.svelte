<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import { themeForPubkey, fgForHex, ambientGradientCss } from '$lib/theme';
	import { applyMarketingTheme, clearMarketingTheme } from '$lib/marketing';
	import { onMount } from 'svelte';
	import { getActivePubkey } from '$lib/connections';
	import { page } from '$app/state';

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
			// Marketing route gets the Violet brand color so first-time
			// visitors see a deliberate brand tint, not the neutral default.
			// Other routes (/connect, etc.) stay neutral when signed out.
			if (page.url.pathname === '/') {
				applyMarketingTheme();
			} else {
				clearMarketingTheme();
			}
			return;
		}
		const theme = themeForPubkey(activePubkey);
		root.style.setProperty('--clave-tint', theme.accent);
		root.style.setProperty('--clave-tint-fg', fgForHex(theme.accent));
		// Light mode only for now — see app.css @variant dark + color-scheme: light.
		root.style.setProperty('--clave-ambient', ambientGradientCss(theme, 'light'));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative min-h-screen bg-neutral-50 text-neutral-900">
	<!-- Ambient gradient overlay (per-active-account). Sits above the
	     wrapper's solid neutral-50 base and below the sticky header + main
	     content. Switches via $effect on activePubkey. -->
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
