// src/lib/theme.ts
//
// Per-account gradient palette — 12 deterministic gradient pairs lifted
// verbatim from Clave iOS's AccountTheme.swift. Indexed by SHA-256 of the
// lowercased pubkey hex, taking the first 2 bytes as a uint16 mod 12.
//
// Same npub → same gradient on iOS, on web, on any future client. The order
// of the palette is locked — never reorder, that would reassign every
// existing account's color.

import { sha256 } from '@noble/hashes/sha2.js';

export type AccountTheme = {
	start: string;
	end: string;
	accent: string; // darker tone — used as button background and focus rings
	name: string;
	index: number;
};

export const PALETTE: readonly AccountTheme[] = [
	{ start: '#7A8CFF', end: '#A14AFF', accent: '#592EFF', name: 'Violet', index: 0 },
	{ start: '#00C7FF', end: '#2EFFB5', accent: '#005966', name: 'Teal', index: 1 },
	{ start: '#FF8C4A', end: '#FFC24A', accent: '#C75900', name: 'Coral', index: 2 },
	{ start: '#FF4A8C', end: '#FF78A8', accent: '#C71A66', name: 'Magenta', index: 3 },
	{ start: '#4AA3FF', end: '#4AE8FF', accent: '#1A73D9', name: 'Sky', index: 4 },
	{ start: '#4AFF8C', end: '#C2FF4A', accent: '#1A8C33', name: 'Lime', index: 5 },
	{ start: '#FF6B6B', end: '#FF9E4F', accent: '#C72E2E', name: 'Red', index: 6 },
	{ start: '#8C4AFF', end: '#ED6BFF', accent: '#661AC7', name: 'Fuchsia', index: 7 },
	{ start: '#1AC799', end: '#66ED66', accent: '#0D664D', name: 'Emerald', index: 8 },
	{ start: '#C76BED', end: '#FF8CC7', accent: '#8C2EB5', name: 'Orchid', index: 9 },
	{ start: '#4A6BD9', end: '#8CB5FF', accent: '#1A33A6', name: 'Navy', index: 10 },
	{ start: '#FF6BB5', end: '#FFB56B', accent: '#C73373', name: 'Peach', index: 11 }
];

// SHA-256(lowercased hex pubkey) → first 2 bytes as uint16 → mod 12.
// Matches Clave iOS AccountTheme.forAccount(pubkeyHex:) exactly.
export function gradientIndexForPubkey(hexPubkey: string): number {
	const normalized = hexPubkey.toLowerCase();
	// Matches iOS AccountTheme.swift: non-empty + all hex digits.
	if (!normalized || !/^[0-9a-f]+$/.test(normalized)) return 0;
	const digest = sha256(new TextEncoder().encode(normalized));
	return ((digest[0] << 8) | digest[1]) % PALETTE.length;
}

export function themeForPubkey(hexPubkey: string): AccountTheme {
	return PALETTE[gradientIndexForPubkey(hexPubkey)];
}

// Pick a foreground color (white or near-black) that contrasts with the
// given hex background, used for text/initials laid over a gradient.
// Simple luminance heuristic — good enough for the curated palette.
export function fgForHex(hex: string): string {
	const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
	if (!m) return '#ffffff';
	const r = parseInt(m[1], 16);
	const g = parseInt(m[2], 16);
	const b = parseInt(m[3], 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6 ? 'rgba(0,0,0,0.7)' : '#ffffff';
}

// Build a CSS linear-gradient(135deg, ...) string from a theme. 135° matches
// Clave iOS's gradient direction (top-left → bottom-right).
export function gradientCss(theme: AccountTheme): string {
	return `linear-gradient(135deg, ${theme.start}, ${theme.end})`;
}

export type PubkeyHueGradient = {
	/** CSS linear-gradient string (135° to match avatar gradient direction). */
	css: string;
	/** Foreground color (white) for text overlaid on this gradient. */
	fg: string;
};

// Generate a deterministic gradient from a pubkey for empty-avatar fallback.
// Mirrors Clave iOS AvatarView (design-system.md §2 "Pubkey-hue derivation").
// ~65k unique combinations from the first 12 hex chars, distinct from the
// 12-entry AccountTheme palette so the avatar interior reads differently
// from the ring around it.
//
// iOS uses HSB(brightness 0.9 / 0.7); CSS uses HSL(lightness). The
// approximation HSB(B=0.9, S=0.7) ≈ HSL(L=60%, S=70%) and HSB(B=0.7, S=0.6)
// ≈ HSL(L=45%, S=60%) reads as the same hue family across both color spaces
// (won't be pixel-identical to iOS but the perceptual hue matches).
export function pubkeyHueGradient(hexPubkey: string): PubkeyHueGradient {
	const normalized = hexPubkey.toLowerCase();
	if (!/^[0-9a-f]{12,}$/.test(normalized)) {
		// Fallback for malformed pubkey — neutral grey gradient.
		return { css: 'linear-gradient(135deg, #999, #666)', fg: '#ffffff' };
	}
	const hue1 = parseInt(normalized.slice(0, 2), 16) / 255;
	const hue2 = parseInt(normalized.slice(8, 10), 16) / 255;
	const c1 = `hsl(${(hue1 * 360).toFixed(0)} 70% 60%)`;
	const c2 = `hsl(${(hue2 * 360).toFixed(0)} 60% 45%)`;
	return {
		css: `linear-gradient(135deg, ${c1}, ${c2})`,
		fg: '#ffffff'
	};
}

// Convert a #RRGGBB hex to an `rgb(r g b / alpha)` string for translucent
// surfaces. Alpha is 0..1.
export function hexToRgba(hex: string, alpha: number): string {
	const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
	if (!m) return `rgb(0 0 0 / ${alpha})`;
	const r = parseInt(m[1], 16);
	const g = parseInt(m[2], 16);
	const b = parseInt(m[3], 16);
	return `rgb(${r} ${g} ${b} / ${alpha})`;
}

// Build the page-background ambient gradient CSS for the active account.
// Matches Clave iOS HomeView ambient gradient (design-system.md §6) —
// top → bottom progressive fade with four alpha stops carries the account
// color into the upper half of the screen and dies off at the bottom for
// legibility against form content.
//
// Stops at 0%/35%/70%/100% with alphas 0.38/0.26/0.12/0.06 (light mode)
// alternating start → end → end → start. Dark mode is currently unused
// (Tailwind 4 `@variant dark` set up but never applied) — values tuned
// for parity if dark mode is ever re-enabled.
export function ambientGradientCss(theme: AccountTheme, scheme: 'light' | 'dark'): string {
	const a = scheme === 'light' ? [0.38, 0.26, 0.12, 0.06] : [0.3, 0.2, 0.1, 0.05];
	return [
		`linear-gradient(to bottom,`,
		`${hexToRgba(theme.start, a[0])} 0%,`,
		`${hexToRgba(theme.end, a[1])} 35%,`,
		`${hexToRgba(theme.end, a[2])} 70%,`,
		`${hexToRgba(theme.start, a[3])} 100%)`
	].join(' ');
}
