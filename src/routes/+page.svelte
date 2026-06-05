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
		content="Approve every Nostr signature from your iPhone. Your nsec stays in the Secure Enclave."
	/>
</svelte:head>

<MarketingNav />
<main>
	<HeroSection />
	<HowItWorks />
	<FeaturesSection />
	<Testimonials />
	<PrivacySection />
	<DownloadCTA />
</main>
<MarketingFooter {creditLabel} />
