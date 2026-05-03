// src/lib/marketing.ts
//
// Constants and helpers for the marketing landing page at `/`.
// Kept out of `theme.ts` because they're page-specific, not core
// theming primitives.

import { ambientGradientCss, fgForHex, PALETTE } from './theme';

export const MARKETING_BRAND_INDEX = 0; // Violet
export const MARKETING_BRAND_THEME = PALETTE[MARKETING_BRAND_INDEX];

// Demo pubkey for the EditorMockup avatar in section 4.
// Picked so gradientIndexForPubkey() returns 0 (Violet ring) AND the
// pubkey-hue interior lands in the purple range (271° / 271°). See
// the design spec for derivation. Not a real Nostr account.
export const DEMO_PUBKEY =
	'c0000003c0000000000000000000000000000000000000000000000000000003';

// External URLs.
export const TESTFLIGHT_URL = 'https://testflight.apple.com/join/5Mx5AZx7';
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
