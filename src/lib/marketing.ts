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
