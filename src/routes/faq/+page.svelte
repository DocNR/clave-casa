<!-- src/routes/faq/+page.svelte
     FAQ, served at /faq. Rendered inside the dark .marketing-root chrome (see
     +layout.svelte's route-aware branch), so it shares the landing's
     background, fonts, color tokens, nav, and footer. Prerendered to static
     HTML (see +page.ts) so the questions, answers, and FAQPage JSON-LD are in
     the initial response — readable by search/AI crawlers and link-preview
     scrapers, not just the browser.

     This is a curated port of the canonical FAQ in the Clave iOS repo
     (CLAVE_FAQ_URL). Keep it faithful to that source; when the two drift, the
     repo FAQ wins and this should be re-synced. Answer bodies are authored,
     static, trusted HTML (links + <strong> only) rendered with {@html}; there
     is no user input on this page. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { npubEncode } from 'nostr-tools/nip19';
	import { fetchLatestProfile } from '$lib/propagation';
	import { displayLabel } from '$lib/labels';
	import {
		CREDIT_PUBKEY_HEX,
		CLAVE_FAQ_URL,
		CLAVE_REPO_URL,
		CLAVE_SECURITY_URL,
		CLAVE_NIP46_COMPAT_URL,
		CLAVE_ISSUES_URL,
		CLAVE_APP_STORE_URL,
		CLAVE_INSTALL_URL,
		CLAVE_INSTALL_LABEL,
		NIP46_SPEC_URL,
		TESTFLIGHT_URL
	} from '$lib/marketing';
	import { reveal } from '$lib/actions/reveal';

	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';

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

	interface QA {
		id: string; // deep-link anchor (#id)
		q: string;
		body: string[]; // paragraphs; may contain trusted inline HTML (links/<strong>)
		steps?: string[]; // optional ordered list; items may contain trusted inline HTML
	}
	interface Section {
		id: string;
		title: string;
		items: QA[];
	}

	const ext = (href: string, text: string) =>
		`<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

	const sections: Section[] = [
		{
			id: 'basics',
			title: 'The basics',
			items: [
				{
					id: 'what-is-clave',
					q: 'What is Clave?',
					body: [
						'An iOS app that keeps your Nostr private key (your nsec) locked in your iPhone’s Keychain. Other Nostr apps pair with it and ask it to sign things on your behalf — post a note, log in, decrypt a DM — but they never receive the key itself. In Nostr terms, it’s a NIP-46 “remote signer.”'
					]
				},
				{
					id: 'why-remote-signer',
					q: 'Why would I want that?',
					body: [
						'Your Nostr key is your identity, and unlike a password it can’t be rotated — if it leaks, that identity is gone for good. The common habit is pasting your nsec into every app you try, which leaves a copy of that irreplaceable secret in each one. Clave replaces that with a single place that holds your key; your apps connect to it instead of each keeping their own copy. Fewer places your key lives means fewer ways it can leak.'
					]
				},
				{
					id: 'what-is-nip46',
					q: 'What’s NIP-46?',
					body: [
						`The open Nostr ${ext(NIP46_SPEC_URL, 'standard')} for exactly this: apps request signatures from a separate signer rather than holding your key themselves. Clave implements it on iOS, Amber implements it on Android, and various web signers implement it too — they all interoperate with any client that supports the standard.`
					]
				}
			]
		},
		{
			id: 'security',
			title: 'Security & privacy',
			items: [
				{
					id: 'key-storage',
					q: 'Where is my key stored? Does it ever leave my phone?',
					body: [
						'It’s stored in the iOS Keychain with a this-device-only flag — not synced to iCloud, not included in device backups. It never leaves your device.'
					]
				},
				{
					id: 'server-access',
					q: 'Does Clave’s server see my key or my messages?',
					body: [
						'No. Clave uses a small push proxy whose only job is to notice that an encrypted request arrived for you and send your phone a wake-up notification. That notification carries no readable content. The proxy never holds any key, can’t decrypt your requests (they’re end-to-end encrypted), and can’t sign anything as you.'
					]
				},
				{
					id: 'why-a-server',
					q: 'Then why does it need a server at all? Doesn’t that make it centralized?',
					body: [
						'iOS aggressively suspends background apps, so a signer needs <strong>something</strong> to wake it when a request arrives — and Apple’s push system is the only reliable mechanism, which requires a small relay-watching server. It’s designed to know as little as possible (that an encrypted request arrived, never what’s in it), the code is open source, and you can run your own proxy. We’d rather be upfront about that trade-off than pretend it isn’t there.'
					]
				},
				{
					id: 'data-collected',
					q: 'What data does Clave collect?',
					body: [
						'The proxy stores which pubkeys have a registered device token and sees when an encrypted request arrives for one. It can’t read request contents and holds no keys. There are no analytics or trackers in the app.',
						`The full security model is in the ${ext(CLAVE_REPO_URL, 'README')}; for how this website handles data, see our <a href="/privacy">Privacy Policy</a>.`
					]
				},
				{
					id: 'open-source-audit',
					q: 'Is it open source? Has it been audited?',
					body: [
						`Yes — ${ext(CLAVE_REPO_URL, 'open source under the MIT license')}, so anyone can read the signing path. It’s had an internal security audit and runs automated weekly checks, and it’s been in real-world use for months. An independent third-party audit is on the roadmap; it depends on funding and time, so we won’t claim it’s done until it is.`
					]
				},
				{
					id: 'main-key-or-throwaway',
					q: 'Can I use my main key, or should I use a throwaway?',
					body: [
						'Use whichever you’re comfortable with. The honest way to think about it: trusting Clave with your key deserves the same consideration as any app you’d hand your nsec to — the difference is that Clave becomes the <strong>one</strong> place holding it, instead of every client you’ve ever pasted it into. The independent audit is still ahead of us, so go in informed. If you’re cautious, starting with a secondary key is a perfectly reasonable way to try it.'
					]
				},
				{
					id: 'report-security',
					q: 'How do I report a security problem?',
					body: [
						`Privately, please — not via a public GitHub issue. See ${ext(CLAVE_SECURITY_URL, 'SECURITY.md')} for the contacts (Nostr DM or email).`
					]
				}
			]
		},
		{
			id: 'using',
			title: 'Using Clave',
			items: [
				{
					id: 'compatible-clients',
					q: 'Which Nostr clients work with Clave?',
					body: [
						`Verified working today: Nostur, Primal (web), Coracle, Jumble, noStrudel, Jank, fevela.me, zap.cooking, and YakiHonne. Others may work too — the live, honest ${ext(CLAVE_NIP46_COMPAT_URL, 'compatibility matrix')} (including known per-client quirks) is kept in the repo. If you try a client that isn’t listed, tell us what happens.`
					]
				},
				{
					id: 'connection-troubleshooting',
					q: 'My Nostr app won’t connect to Clave — what should I check?',
					body: ['A few things to try, in order:'],
					steps: [
						'<strong>Start the connection from Clave, not from the other app.</strong> Open Clave, tap <strong>Connect</strong>, and copy the code it shows you (or scan its QR code). Then paste or scan that into your Nostr app, usually under an option like “log in with a remote signer,” “connect bunker,” or “Nostr Connect.” Going this direction is the most reliable — especially when Clave and your Nostr app are on the <strong>same</strong> iPhone, where starting from the other app tends to fail for technical reasons no signer can fully work around.',
						'<strong>Make sure Clave is allowed to send notifications.</strong> Clave wakes up to sign when it receives a notification, so if notifications are switched off it can’t respond. Open <strong>iOS Settings → Notifications → Clave</strong> and turn them on.',
						'<strong>Still stuck?</strong> Tell us what happened — include the name of the app you were trying to connect and what you saw on screen. That’s exactly what we need to help.'
					]
				},
				{
					id: 'multiple-accounts',
					q: 'Can I use more than one account?',
					body: [
						'Yes. Clave holds multiple keys and lets you switch between them. With clients that support the multi-account pairing — Jank today — you pair once and sign in with all your accounts in a single flow; with other clients you pair each account separately. Either way, every key stays on your phone.'
					]
				},
				{
					id: 'why-ios-only',
					q: 'Why is it iOS only? Is there an Android version?',
					body: [
						'Android already has an excellent signer — Amber. Clave exists because iOS didn’t have an equivalent: Amber relies on Android’s NIP-55 app-to-app intents, which iOS has no equivalent for, and iOS suspends background apps, so a different approach (push-woken signing) was needed. We’re focused on doing the iOS side well.'
					]
				},
				{
					id: 'vs-other-signers',
					q: 'How is Clave different from Amber, nsec.app, or nsecBunker?',
					body: [
						'They’re all NIP-46 signers with different trade-offs about where your key lives: Amber keeps it on your Android device (Clave is the iOS counterpart), web signers like nsec.app keep it in your browser, and hosted signers like nsecBunker keep it on a server you trust. Clave keeps it in your iPhone’s Keychain. Different models for different people — and they’re allies in making “don’t paste your nsec everywhere” the norm.'
					]
				},
				{
					id: 'cost',
					q: 'How much does it cost?',
					body: ['Clave is free and open source (MIT licensed).']
				},
				{
					id: 'availability',
					q: 'Clave isn’t in the App Store in my country — now what?',
					body: [
						`Clave is live on the ${ext(CLAVE_APP_STORE_URL ?? CLAVE_INSTALL_URL, 'App Store')}, but not yet in every country — most notably not in the European Union, where listing an app involves extra steps we haven’t completed yet. If the listing doesn’t show up for you, you can install the same app through the ${ext(TESTFLIGHT_URL, 'TestFlight beta')} — it works everywhere TestFlight does. We’ll update this answer as availability expands.`
					]
				},
				{
					id: 'report-bug',
					q: 'How do I report a bug or request a feature?',
					body: [
						`Open an issue on ${ext(CLAVE_ISSUES_URL, 'GitHub')}. For NIP-46 interop problems with a specific client, there’s a dedicated interop issue template available.`
					]
				}
			]
		}
	];

	// FAQPage structured data so search/AI crawlers can index each Q&A. Built
	// from the same `sections`, with inline HTML stripped to plain text for the
	// answer bodies. The closing tag is split so it can't terminate this script.
	const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '');
	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: sections
			.flatMap((s) => s.items)
			.map((item) => ({
				'@type': 'Question',
				name: item.q,
				acceptedAnswer: {
					'@type': 'Answer',
					text: [...item.body, ...(item.steps ?? [])].map(stripHtml).join(' ')
				}
			}))
	};
	const faqJsonLd = `<script type="application/ld+json">${JSON.stringify(faqSchema)}<\/script>`;
</script>

<svelte:head>
	<title>FAQ — Clave</title>
	<meta
		name="description"
		content="Answers about Clave, the open-source NIP-46 remote signer for iOS: is it secure, where your key is stored, whether it’s been audited, which Nostr clients work, and how to get started."
	/>
	<link rel="canonical" href="https://clave.casa/faq" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, static JSON-LD -->
	{@html faqJsonLd}
</svelte:head>

<MarketingNav />

<main class="relative px-6 pb-24 pt-28 md:pt-32">
	<div class="mx-auto max-w-3xl">
		<header use:reveal class="mb-12">
			<p
				class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]"
				style="color: var(--m-text-dim)"
			>
				FAQ
			</p>
			<h1
				class="font-display text-[clamp(2.25rem,5.5vw,3.5rem)] font-bold leading-[1.04]"
				style="color: var(--m-text)"
			>
				Is it <span class="gradient-text">safe?</span>
			</h1>
			<p class="mt-6 text-lg leading-relaxed" style="color: var(--m-text-muted)">
				The honest answers to the questions people actually ask before trusting Clave with a Nostr
				key — what it is, where your key lives, whether it’s been audited, and which clients work. We
				keep the longer, always-current version in the repo: read the
				<a
					class="link"
					href={CLAVE_FAQ_URL}
					target="_blank"
					rel="noopener noreferrer">full FAQ on GitHub</a
				>.
			</p>
		</header>

		<!-- Jump links — quick deep-links into each section -->
		<nav
			use:reveal
			aria-label="FAQ sections"
			class="mb-12 flex flex-wrap gap-2 rounded-2xl border p-4"
			style="border-color: var(--m-border); background: var(--m-surface);"
		>
			{#each sections as section}
				<a
					href={`#${section.id}`}
					class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
					style="color: var(--m-text-muted); background: var(--m-surface-2, transparent); border: 1px solid var(--m-border);"
				>
					{section.title}
				</a>
			{/each}
		</nav>

		<div class="faq">
			{#each sections as section, si}
				<section id={section.id} use:reveal={{ delay: si * 40 }}>
					<h2>{section.title}</h2>
					{#each section.items as item}
						<div class="faq-item">
							<h3 id={item.id} class="faq-q">
								<a href={`#${item.id}`}>{item.q}</a>
							</h3>
							{#each item.body as p}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, static FAQ copy -->
								<p>{@html p}</p>
							{/each}
							{#if item.steps}
								<ol>
									{#each item.steps as step}
										<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, static FAQ copy -->
										<li>{@html step}</li>
									{/each}
								</ol>
							{/if}
						</div>
					{/each}
				</section>
			{/each}
		</div>

		<!-- Closing CTA — same install path as the rest of the site -->
		<div
			use:reveal
			class="mt-16 rounded-3xl border p-6 text-center md:p-8"
			style="border-color: var(--m-border); background: var(--m-surface);"
		>
			<h2 class="font-display text-xl font-semibold md:text-2xl" style="color: var(--m-text)">
				Still have a question?
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed" style="color: var(--m-text-muted)">
				Open an issue on
				<a class="link" href={CLAVE_ISSUES_URL} target="_blank" rel="noopener noreferrer">GitHub</a>,
				or just try it — it’s free.
			</p>
			<a
				href={CLAVE_INSTALL_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:scale-95"
				style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;"
			>
				<svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" class="h-4 w-4">
					<path
						d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
					/>
				</svg>
				Install Clave — {CLAVE_INSTALL_LABEL}
			</a>
		</div>
	</div>
</main>

<MarketingFooter {creditLabel} />

<style>
	/* Long-form Q&A prose. Mirrors the .policy block on /privacy so headings,
	   body copy, links, and list markers match the rest of the dark site (tokens
	   defined on .marketing-root in src/app.css). */
	.faq :global(h2) {
		font-family: var(--font-display);
		letter-spacing: -0.02em;
		font-weight: 700;
		font-size: 1.5rem;
		line-height: 1.2;
		color: var(--m-text);
		margin-top: 3.5rem;
		margin-bottom: 0.5rem;
	}

	.faq section:first-child :global(h2) {
		margin-top: 0;
	}

	.faq .faq-item {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--m-border);
	}

	.faq .faq-q {
		font-family: var(--font-display);
		letter-spacing: -0.01em;
		font-weight: 600;
		font-size: 1.0625rem;
		line-height: 1.35;
		color: var(--m-text);
		scroll-margin-top: 6rem; /* clear the fixed nav when deep-linked */
	}

	.faq .faq-q :global(a) {
		color: inherit;
		text-decoration: none;
	}

	.faq .faq-q :global(a:hover) {
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--m-violet);
	}

	.faq :global(p) {
		color: var(--m-text-muted);
		font-size: 15px;
		line-height: 1.75;
		margin-top: 0.75rem;
	}

	.faq :global(ol) {
		margin-top: 0.75rem;
		padding-left: 1.25rem;
		list-style: decimal;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.faq :global(li) {
		color: var(--m-text-muted);
		font-size: 15px;
		line-height: 1.75;
	}

	.faq :global(li)::marker {
		color: var(--m-violet);
	}

	.faq :global(a),
	.link {
		color: var(--m-violet-soft);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.faq :global(a:hover),
	.link:hover {
		text-decoration: none;
	}

	/* Keep the self-link headings from inheriting the violet body-link color. */
	.faq .faq-q :global(a) {
		color: inherit;
	}

	@media (min-width: 768px) {
		.faq :global(h2) {
			font-size: 1.625rem;
		}
		.faq .faq-q {
			font-size: 1.125rem;
		}
		.faq :global(p),
		.faq :global(li) {
			font-size: 16px;
		}
	}
</style>
