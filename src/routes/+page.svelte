<!-- src/routes/+page.svelte
     Marketing landing (Clave iOS-led, dark redesign). First-time visitors
     see the full page; users with a stored connection auto-redirect to
     /edit. The dark .marketing-root wrapper is provided by +layout.svelte's
     route-aware branch for `/`. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { npubEncode } from 'nostr-tools/nip19';
	import { loadConnections, getActiveConnection } from '$lib/connections';
	import { fetchLatestProfile } from '$lib/propagation';
	import { displayLabel } from '$lib/labels';
	import { CREDIT_PUBKEY_HEX } from '$lib/marketing';

	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import HeroSection from '$lib/components/marketing/HeroSection.svelte';
	import FeaturedNote from '$lib/components/marketing/FeaturedNote.svelte';
	import FeaturesSection from '$lib/components/marketing/FeaturesSection.svelte';
	import HowItWorks from '$lib/components/marketing/HowItWorks.svelte';
	import Testimonials from '$lib/components/marketing/Testimonials.svelte';
	import PrivacySection from '$lib/components/marketing/PrivacySection.svelte';
	import DownloadCTA from '$lib/components/marketing/DownloadCTA.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';

	let creditLabel = $state(npubEncode(CREDIT_PUBKEY_HEX).slice(0, 12));

	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/edit', { replaceState: true });
			return;
		}
		void (async () => {
			try {
				const result = await fetchLatestProfile(CREDIT_PUBKEY_HEX);
				if (result.status !== 'found') return;
				const profile = JSON.parse(result.event.content);
				creditLabel = displayLabel({ profile, pubkeyHex: CREDIT_PUBKEY_HEX });
			} catch {
				// keep npub-prefix fallback
			}
		})();
	});
</script>

<svelte:head>
	<title>Clave — A NIP-46 remote signer for iPhone</title>
	<meta
		name="description"
		content="Sign every Nostr event without exposing your keys. Your nsec stays on your iPhone in the iOS Keychain — device-only, never synced or backed up."
	/>
	<link rel="canonical" href="https://clave.casa/" />

	<!-- Open Graph (rich link previews) -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Clave" />
	<meta property="og:url" content="https://clave.casa/" />
	<meta property="og:title" content="Clave — Nostr remote signer for iOS" />
	<meta
		property="og:description"
		content="Sign every Nostr event without exposing your keys. Your nsec stays on your iPhone in the iOS Keychain — device-only, never synced or backed up."
	/>
	<meta property="og:image" content="https://clave.casa/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Clave — a NIP-46 Nostr remote signer for iOS" />

	<!-- Twitter / X card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Clave — Nostr remote signer for iOS" />
	<meta
		name="twitter:description"
		content="Sign every Nostr event without exposing your keys. Your nsec stays on your iPhone in the iOS Keychain — device-only, never synced or backed up."
	/>
	<meta name="twitter:image" content="https://clave.casa/og-image.png" />
</svelte:head>

<MarketingNav />
<main>
	<HeroSection />
	<FeaturedNote />
	<HowItWorks />
	<FeaturesSection />
	<Testimonials />
	<PrivacySection />
	<DownloadCTA />
</main>
<MarketingFooter {creditLabel} />
