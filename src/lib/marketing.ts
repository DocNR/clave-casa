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
}

export const FEATURE_ROWS: readonly FeatureRowContent[] = [
	{
		eyebrow: 'Secure Enclave',
		title: 'Your nsec never leaves your phone',
		body: 'Your private key is generated and stored in the iOS Secure Enclave. Every signature is produced locally on your device — clave.casa, relays, and the apps you use never see it.',
		bullets: ['Hardware-backed key storage', 'No key export, ever', 'Nothing to leak server-side'],
		accent: 0,
		glow: 'violet'
	},
	{
		eyebrow: 'Approve to sign',
		title: 'Nothing gets signed without you',
		body: 'When a Nostr client asks for a signature, Clave shows you exactly what it is — the kind, the content, who is asking — and waits. Tap to approve, or decline.',
		bullets: ['See every request in plain language', 'One tap to sign or reject', 'Set always-allow per app and kind'],
		accent: 4,
		glow: 'sky'
	},
	{
		eyebrow: 'Multi-account',
		title: 'Many identities, one signer',
		body: 'Pair several Nostr accounts and switch between them with a tap. Each identity gets its own deterministic gradient, so you always know which key is about to sign.',
		bullets: ['Up to multiple accounts', 'A distinct gradient per identity', 'Same colors on iOS and on the web'],
		accent: 1,
		glow: 'teal'
	},
	{
		eyebrow: 'NIP-46',
		title: 'Works with any Nostr client',
		body: 'Clave is a standard NIP-46 remote signer. Scan a QR code or paste a bunker URI from any compatible client and it just connects — no browser extension, no copy-pasting keys.',
		bullets: ['Scan a QR or paste a bunker URI', 'No extension required', 'Compatible across the NIP-46 ecosystem'],
		accent: 7,
		glow: 'violet'
	},
	{
		eyebrow: 'Battery-friendly',
		title: 'Always ready, never draining',
		body: 'Clave wakes only when an app needs you to sign, handles the request, and goes back to sleep. No background polling, no battery drain.',
		bullets: ['Push-woken, not always-on', 'No background battery cost', 'Instant when you need it'],
		accent: 8,
		glow: 'teal'
	}
];
