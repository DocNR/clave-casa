// src/lib/marketing.ts
//
// Constants and helpers for the marketing landing page at `/`.
// Kept out of `theme.ts` because they're page-specific, not core
// theming primitives.

import { ambientGradientCss, fgForHex, PALETTE } from './theme';

export const MARKETING_BRAND_INDEX = 0; // Violet
export const MARKETING_BRAND_THEME = PALETTE[MARKETING_BRAND_INDEX];

// External URLs.
export const TESTFLIGHT_URL = 'https://testflight.apple.com/join/5Mx5AZx7';
// Set this when Clave ships to the App Store. While undefined, surfaces that
// recommend installing Clave fall back to TESTFLIGHT_URL via CLAVE_INSTALL_URL.
export const CLAVE_APP_STORE_URL: string | undefined = undefined;
// Use this anywhere we want "the recommended way to install Clave for end users".
// Resolves to App Store if set, TestFlight otherwise.
export const CLAVE_INSTALL_URL: string = CLAVE_APP_STORE_URL ?? TESTFLIGHT_URL;
// Human-readable label for the install link — "App Store" once Clave ships,
// "TestFlight (beta)" while we're still gating distribution through TestFlight.
export const CLAVE_INSTALL_LABEL: string = CLAVE_APP_STORE_URL ? 'App Store' : 'TestFlight (beta)';
// Short label for compact surfaces (e.g. the nav button on mobile) — drops the
// "(beta)" qualifier so it stays tidy next to the logo.
export const CLAVE_INSTALL_LABEL_SHORT: string = CLAVE_APP_STORE_URL ? 'App Store' : 'TestFlight';
export const AMBER_PLAY_STORE_URL =
	'https://play.google.com/store/apps/details?id=com.greenart7c3.nostrsigner';
export const NSEC_APP_URL = 'https://nsec.app';
export const CLAVE_REPO_URL = 'https://github.com/DocNR/clave';
export const CLAVE_CASA_REPO_URL = 'https://github.com/DocNR/clave-casa';
export const DESIGN_SYSTEM_URL =
	'https://github.com/DocNR/clave-casa/blob/main/docs/design-system.md';
export const NIP46_SPEC_URL = 'https://github.com/nostr-protocol/nips/blob/master/46.md';

// Maintainer credit ("Made in the open and with love by …").
// Hex of npub1xy54p83r6wnpyhs52xjeztd7qyyeu9ghymz8v66yu8kt3jzx75rqhf3urc.
// We resolve the kind 0 display name at runtime via fetchLatestProfile;
// while loading we render the npub-prefix as a graceful fallback.
export const CREDIT_PUBKEY_HEX =
	'3129509e23d3a6125e1451a5912dbe01099e151726c4766b44e1ecb8c846f506';
export const CREDIT_NJUMP_URL = `https://njump.me/npub1xy54p83r6wnpyhs52xjeztd7qyyeu9ghymz8v66yu8kt3jzx75rqhf3urc`;

// Featured Clave-team note, shown as a standalone statement right after the
// hero (component: FeaturedNote.svelte). It's a real, verifiable Nostr note —
// the `verifyUrl` links to the original so visitors can confirm it. Rendered
// statically (no relay dependency) so this key moment always shows instantly;
// the link keeps it honest. `lead` + `emphasis` compose the full note text
// minus the trailing #clave hashtag; `emphasis` gets the gradient treatment.
export const FEATURED_NOTE = {
	lead: 'Hello Nostr.',
	emphasis: 'The keys stayed home today.',
	hashtag: '#clave',
	author: 'Clave',
	verifyUrl:
		'https://njump.me/nevent1qqsw7y6z9pmnpmcz0de2g5tha7nqz3y326t5n856x5yj2xrqurdushqd5vp45'
} as const;

/**
 * Apply Violet brand theme to :root for the marketing route.
 * Called from +layout.svelte when no account is active and we're on `/`.
 */
export function applyMarketingTheme(): void {
	const root = document.documentElement;
	root.style.setProperty('--clave-tint', MARKETING_BRAND_THEME.accent);
	root.style.setProperty('--clave-tint-fg', fgForHex(MARKETING_BRAND_THEME.accent));
	root.style.setProperty('--clave-ambient', ambientGradientCss(MARKETING_BRAND_THEME, 'light'));
}

/**
 * Clear marketing theme overrides (return to neutral defaults).
 * Called when navigating away from `/` without an active account.
 */
export function clearMarketingTheme(): void {
	const root = document.documentElement;
	root.style.removeProperty('--clave-tint');
	root.style.removeProperty('--clave-tint-fg');
	root.style.removeProperty('--clave-ambient');
}

// Feature-row content for the landing page. `accent` indexes PALETTE
// (src/lib/theme.ts) so each row pulls a distinct Clave gradient.
export interface FeatureRowContent {
	eyebrow: string;
	title: string;
	body: string;
	bullets: string[];
	accent: number; // PALETTE index
	glow: 'violet' | 'sky' | 'teal';
	// Optional real screenshot (path under static/). When set, FeatureRow renders
	// it inside the phone frame instead of the styled placeholder.
	screenshot?: string;
}

export const FEATURE_ROWS: readonly FeatureRowContent[] = [
	{
		eyebrow: 'On-device keys',
		title: 'Your nsec never leaves your phone',
		body: 'Your private key is generated on your iPhone and kept in the iOS Keychain — device-only, so it never syncs to iCloud or lands in a backup. Every signature is produced locally; clave.casa, relays, and the apps you use never see it.',
		bullets: ['Stored in the iOS Keychain', 'Device-only — never synced or backed up', 'No key export unless you want it'],
		accent: 0,
		glow: 'violet',
		screenshot: '/screenshots/account.webp'
	},
	{
		eyebrow: 'Approve to sign',
		title: 'Nothing gets signed without you',
		body: 'When a Nostr client asks for a signature, Clave shows you exactly what it is — the kind, the content, who is asking — and waits. Tap to approve, or decline.',
		bullets: ['See every request in plain language', 'One tap to sign or reject', 'Set always-allow per app and kind'],
		accent: 4,
		glow: 'sky',
		screenshot: '/screenshots/approve.webp'
	},
	{
		eyebrow: 'Multi-account',
		title: 'Many identities, one signer',
		body: 'Pair several Nostr accounts and switch between them with a tap. Each identity gets its own deterministic gradient, so you always know which key is about to sign.',
		bullets: ['Up to 4 accounts', 'A distinct gradient per identity', 'Same colors on iOS and on the web'],
		accent: 1,
		glow: 'teal',
		screenshot: '/screenshots/choose-accounts.webp'
	},
	{
		eyebrow: 'NIP-46',
		title: 'Works with most Nostr clients',
		body: 'Clave is a standard NIP-46 remote signer. Scan a QR code or paste a bunker URI from a client that supports NIP-46 and it just connects — Clave signs on its behalf. No browser extension, no copy-pasting keys.',
		bullets: ['Scan a QR or paste a bunker URI', 'Signs on behalf of any NIP-46 client', 'No browser extension required'],
		accent: 7,
		glow: 'violet',
		screenshot: '/screenshots/pairing.webp'
	},
	{
		eyebrow: 'Home Screen apps',
		title: 'Use Nostr web apps the way they’re meant to be',
		body: 'Because Clave signs remotely, you can add a Nostr web app to your Home Screen and open it like a real app — full-screen, no browser bar — and it can still sign. Browser-extension signers can’t do that on iPhone.',
		bullets: ['Launch web clients from your Home Screen', 'Full-screen and native-like, no browser chrome', 'No browser extension needed'],
		accent: 2,
		glow: 'sky'
	},
	{
		eyebrow: 'Open or closed',
		title: 'Signs whether the app is open or closed',
		body: 'Clave works in the background. A push notification wakes it the moment a client needs a signature — whether Clave is open, backgrounded, or your phone is locked — it handles the request and goes back to sleep. No polling, no battery drain.',
		bullets: ['Works in the background, even when closed', 'Push-woken, not always-on', 'No background battery cost'],
		accent: 8,
		glow: 'teal',
		screenshot: '/screenshots/activity.webp'
	}
];
