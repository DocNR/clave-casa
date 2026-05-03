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

	<!-- 2. What Clave does -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			What Clave does
		</h2>
		<div class="grid gap-4 sm:grid-cols-3">
			<article
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div class="text-3xl" aria-hidden="true">🔒</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Your nsec never leaves your phone
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Stored in the iOS Secure Enclave. Every signature is approved locally on your device.
				</p>
			</article>
			<article
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div class="text-3xl" aria-hidden="true">👥</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Multiple accounts, one signer
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Pair up to four Nostr identities and switch with a tap. Each gets its own gradient
					identity.
				</p>
			</article>
			<article
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div class="text-3xl" aria-hidden="true">🔋</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Always ready, never draining
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Clave wakes only when an app needs you to sign. The rest of the time it's asleep — no
					background activity, no battery drain.
				</p>
			</article>
		</div>
	</section>

	<!-- 3. How it works -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			How it works
		</h2>
		<ol class="grid gap-4 sm:grid-cols-3">
			<li
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
					aria-hidden="true"
				>
					1
				</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Install Clave on iPhone
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					iOS 16+, free via TestFlight while we're in beta.
				</p>
			</li>
			<li
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
					aria-hidden="true"
				>
					2
				</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Add your Nostr account
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Paste an existing nsec or generate a fresh one. It's encrypted and stored on your device.
				</p>
			</li>
			<li
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
					aria-hidden="true"
				>
					3
				</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Sign from any client
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Scan a QR or paste a bunker URI from any NIP-46 compatible Nostr client. Tap to approve.
				</p>
			</li>
		</ol>
	</section>
</div>
