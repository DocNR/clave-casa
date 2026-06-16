<!-- src/routes/privacy/+page.svelte
     Privacy Policy, served at /privacy. Rendered inside the dark
     .marketing-root chrome (see +layout.svelte's route-aware branch), so it
     shares the landing's background, fonts, color tokens, nav, and footer —
     it reads as part of the site, not a bolt-on. Prerendered to static HTML
     (see +page.ts) so the policy text is in the initial response. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { npubEncode } from 'nostr-tools/nip19';
	import { fetchLatestProfile } from '$lib/propagation';
	import { displayLabel } from '$lib/labels';
	import { CREDIT_PUBKEY_HEX, CREDIT_NJUMP_URL, CLAVE_REPO_URL } from '$lib/marketing';
	import { reveal } from '$lib/actions/reveal';

	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';

	const CONTACT_NPUB = 'npub1xy54p83r6wnpyhs52xjeztd7qyyeu9ghymz8v66yu8kt3jzx75rqhf3urc';
	const CONTACT_EMAIL = 'thehypoxicdrive@gmail.com';

	// Same maintainer-credit resolution the landing footer uses: start with the
	// npub prefix, upgrade to the kind-0 display name once relays answer.
	let creditLabel = $state(npubEncode(CREDIT_PUBKEY_HEX).slice(0, 12));

	onMount(() => {
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

	// Short-version highlights — rendered as a card to echo the landing's
	// "Privacy by construction" section.
	const highlights = [
		'Your private key is generated and stored in your iPhone’s Keychain and never leaves your device. We never have access to it.',
		'Clave has no accounts, no sign-up, and no logins. We don’t ask for your name, email, or any personal details.',
		'Clave contains no third-party analytics, advertising, or tracking.',
		'To sign while the app is closed, Clave uses a push proxy and Apple’s Push Notification service. These can see that an encrypted request arrived for your public key and when — never its contents, and they can never sign on your behalf.'
	];
</script>

<svelte:head>
	<title>Privacy — Clave</title>
	<meta
		name="description"
		content="How Clave — the open-source NIP-46 remote signer for iOS — handles your data: your private key never leaves your device, no accounts, no analytics, no tracking."
	/>
	<link rel="canonical" href="https://clave.casa/privacy" />
</svelte:head>

<MarketingNav />

<main class="relative px-6 pb-24 pt-28 md:pt-32">
	<div class="mx-auto max-w-3xl">
		<header use:reveal class="mb-10">
			<h1
				class="font-display text-[clamp(2.25rem,5.5vw,3.5rem)] font-bold leading-[1.04]"
				style="color: var(--m-text)"
			>
				Privacy <span class="gradient-text">Policy</span>
			</h1>
			<p class="mt-4 text-sm" style="color: var(--m-text-dim)">Last updated: June 16, 2026</p>
			<p class="mt-6 text-lg leading-relaxed" style="color: var(--m-text-muted)">
				Clave is an open-source NIP-46 remote signer for iOS, built so that your Nostr private key
				stays on your device and under your control. This policy explains what data Clave does and
				doesn’t handle.
			</p>
		</header>

		<!-- The short version — highlighted card -->
		<section
			use:reveal
			class="rounded-3xl border p-6 md:p-8"
			style="border-color: var(--m-border); background: var(--m-surface);"
		>
			<h2 class="font-display text-xl font-semibold md:text-2xl" style="color: var(--m-text)">
				The short version
			</h2>
			<ul class="mt-5 space-y-3">
				{#each highlights as point}
					<li
						class="flex gap-3 text-[15px] leading-relaxed md:text-base"
						style="color: var(--m-text-muted)"
					>
						<span
							class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
							style="background: var(--m-violet)"
							aria-hidden="true"
						></span>
						<span>{point}</span>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Full policy -->
		<div class="policy">
			<h2>Your key</h2>
			<p>
				Your Nostr private key is created on your device and stored in the iOS Keychain with a
				this-device-only protection setting. It is not synced to iCloud and is not included in
				device backups. The key never leaves your phone, and neither the developer nor the Clave
				servers ever receive or store it.
			</p>

			<h2>Information stored on your device</h2>
			<p>
				The following stays local to your device and is not transmitted to us: your key(s), the
				list of apps you’ve paired, the permissions and trust levels you set for them, and your
				signing activity log. You can remove any of it at any time from within the app.
			</p>

			<h2>The push proxy and relays</h2>
			<p>Clave can respond to signing requests even when the app is closed. To do this:</p>
			<ul>
				<li>
					Requests are delivered to you as Nostr events through public relays. These events are
					end-to-end encrypted (NIP-44) and addressed to your public key.
				</li>
				<li>
					A push proxy (operated by the Clave project at proxy.clave.casa) watches for events
					addressed to public keys whose devices have registered for push, and asks Apple to wake
					your device. The push notification itself carries no readable request content.
				</li>
				<li>
					To register for push, your device sends the proxy its Apple-issued push token and the
					public key(s) it should watch. This registration is authenticated (NIP-98), so no one can
					register a push token for a public key they don’t control.
				</li>
			</ul>
			<p>
				What these services can see: that an encrypted request arrived for a given public key, and
				roughly when. What they cannot do: read the contents of your requests, or sign anything on
				your behalf — they never hold your key.
			</p>

			<h2>Apple Push Notification service</h2>
			<p>
				Push delivery uses Apple’s Push Notification service (APNs). Apple’s handling of push
				tokens and delivery is governed by Apple’s own privacy policy.
			</p>

			<h2>Data sharing</h2>
			<p>
				We do not sell, rent, or share your data. Clave has no advertising and no third-party
				analytics. The only server involved is the project’s own push proxy, described above.
			</p>

			<h2>Children</h2>
			<p>
				Clave is not directed to children under 13 and does not knowingly collect information from
				them.
			</p>

			<h2>Open source</h2>
			<p>
				Clave’s full source code, including the entire signing path, is public under the MIT
				license at
				<a href={CLAVE_REPO_URL} target="_blank" rel="noopener noreferrer">github.com/DocNR/clave</a>.
				You’re welcome to verify these claims yourself.
			</p>

			<h2>Changes</h2>
			<p>
				We may update this policy as the app evolves. Material changes will be reflected here with a
				new “last updated” date.
			</p>

			<h2>Contact</h2>
			<p>Questions about privacy?</p>
			<ul>
				<li>
					Nostr:
					<a
						class="break-all"
						href={CREDIT_NJUMP_URL}
						target="_blank"
						rel="noopener noreferrer">{CONTACT_NPUB}</a>
				</li>
				<li>Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
			</ul>
		</div>
	</div>
</main>

<MarketingFooter {creditLabel} />

<style>
	/* Long-form prose for the policy body. Type sizes and rhythm come from
	   Tailwind on the bespoke header above; here we lean on the marketing
	   tokens (defined on .marketing-root in src/app.css) so headings, body
	   copy, links, and list markers match the rest of the dark site. */
	.policy h2 {
		font-family: var(--font-display);
		letter-spacing: -0.02em;
		font-weight: 600;
		font-size: 1.375rem;
		line-height: 1.2;
		color: var(--m-text);
		margin-top: 3rem;
		margin-bottom: 0.25rem;
	}

	.policy p {
		color: var(--m-text-muted);
		font-size: 15px;
		line-height: 1.75;
		margin-top: 1rem;
	}

	.policy ul {
		margin-top: 1rem;
		padding-left: 1.25rem;
		list-style: disc;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.policy li {
		color: var(--m-text-muted);
		font-size: 15px;
		line-height: 1.75;
	}

	.policy li::marker {
		color: var(--m-violet);
	}

	.policy a {
		color: var(--m-violet-soft);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.policy a:hover {
		text-decoration: none;
	}

	@media (min-width: 768px) {
		.policy h2 {
			font-size: 1.5rem;
		}
		.policy p,
		.policy li {
			font-size: 16px;
		}
	}
</style>
