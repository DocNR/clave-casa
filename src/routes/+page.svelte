<!-- src/routes/+page.svelte
     Marketing landing page (Clave iOS-led). First-time visitors see the
     full page; users with a stored connection auto-redirect to /edit.
     Brand color (Violet, palette[0]) is applied by +layout.svelte's
     route-aware $effect — see src/lib/marketing.ts. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadConnections, getActiveConnection } from '$lib/connections';
	import HeroPhone from '$lib/components/marketing/HeroPhone.svelte';
	import { TESTFLIGHT_URL } from '$lib/marketing';

	// Preserve the original auto-redirect: signed-in users with an active
	// connection skip the marketing page and go straight to /edit.
	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/edit', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Clave — A NIP-46 remote signer for iPhone</title>
	<meta
		name="description"
		content="Approve every Nostr signature from your iPhone. Your nsec stays in the Secure Enclave."
	/>
</svelte:head>

<div class="space-y-16 pb-16 sm:space-y-24">
	<!-- 1. Hero -->
	<section class="flex flex-col items-center pt-6 text-center sm:pt-12">
		<HeroPhone />

		<h1
			class="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl"
			style="color: var(--clave-text)"
		>
			Clave
		</h1>
		<p class="mx-auto mt-4 max-w-md text-lg leading-snug" style="color: var(--clave-text)">
			Approve every Nostr signature from your iPhone.<br class="hidden sm:inline" />
			Your nsec stays in the Secure Enclave.
		</p>

		<div class="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
			<a
				href={TESTFLIGHT_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
				style="background: var(--clave-tint); color: var(--clave-tint-fg)"
			>
				Download for iOS
			</a>
			<a
				href="/connect"
				class="rounded-xl border px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
				style="border-color: var(--clave-border); color: var(--clave-text)"
			>
				Edit your profile
			</a>
		</div>
	</section>
</div>
