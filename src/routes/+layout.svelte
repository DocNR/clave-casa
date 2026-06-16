<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import { themeForPubkey, fgForHex, ambientGradientCss } from '$lib/theme';
	import { applyMarketingTheme, clearMarketingTheme } from '$lib/marketing';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadConnections, removeConnection, getActivePubkey } from '$lib/connections';
	import { clearLocalKey, parseBunkerInput, type SessionTerminatedDetail } from '$lib/signer';
	import { page } from '$app/state';

	let { children } = $props();
	let activePubkey = $state<string | undefined>(undefined);
	// Routes that use the dark, full-bleed marketing chrome (own nav + footer,
	// no shared light header). The landing and the privacy policy both live
	// here so /privacy reads as part of the site, not a bolt-on.
	const MARKETING_ROUTES = ['/', '/privacy'];
	const isMarketing = $derived(MARKETING_ROUTES.includes(page.url.pathname));

	// Paint the document canvas dark on the marketing routes so overscroll
	// (rubber-banding past the top/bottom) shows the page's dark bg, not white.
	// Other routes keep the default light canvas.
	$effect(() => {
		document.documentElement.classList.toggle('marketing-bg', isMarketing);
		return () => document.documentElement.classList.remove('marketing-bg');
	});

	onMount(() => {
		const refresh = () => (activePubkey = getActivePubkey());
		refresh();
		window.addEventListener('storage', refresh);

		// Proposed NIP-46 session-termination handler. Fires when signer.ts'
		// background subscription detects an unsolicited session_terminated
		// event from an active signer. Cleanup mirrors the auto-clean path in
		// /edit save() for stale-connection errors: remove from localStorage,
		// orphan the local key, redirect to /connect with the stale-banner.
		// Spec: docs/proposals/nip46-session-termination.md.
		const onTerminated = async (e: Event) => {
			const detail = (e as CustomEvent<SessionTerminatedDetail>).detail;
			if (!detail) return;
			console.debug('[clave.casa] handling session-terminated for', detail.accountPubkey.slice(0, 8));
			// Best-effort: get bunker pubkey to clear the orphaned local key.
			try {
				const conn = loadConnections().find((c) => c.accountPubkey === detail.accountPubkey);
				if (conn) {
					const bp = await parseBunkerInput(conn.bunkerUri);
					if (bp) clearLocalKey(bp.pubkey);
				}
			} catch {
				// non-fatal
			}
			removeConnection(detail.accountPubkey);
			void goto('/connect?reason=stale', { replaceState: true });
		};
		window.addEventListener('clave-casa:session-terminated', onTerminated);

		return () => {
			window.removeEventListener('storage', refresh);
			window.removeEventListener('clave-casa:session-terminated', onTerminated);
		};
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

<!-- All <head> SEO/OG/Twitter/favicon tags live in src/app.html (the static
     shell), since this app is client-only (ssr=false) and JS-injected head
     tags aren't seen by link-preview scrapers. -->


{#if isMarketing}
	<!-- Marketing routes (landing, /privacy) own their full-bleed dark chrome.
	     The page wraps itself in .marketing-root (see src/app.css) and renders
	     its own nav + footer. No shared light header, no max-w-3xl. -->
	<div class="marketing-root">
		{@render children?.()}
	</div>
{:else}
	<div class="relative min-h-screen bg-neutral-50 text-neutral-900">
		<!-- Ambient gradient overlay (per-active-account). -->
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
{/if}
