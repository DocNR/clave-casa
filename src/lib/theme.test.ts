// src/lib/theme.test.ts
//
// Cross-platform parity tests for the AccountTheme palette + gradient
// derivation. Mirrors Clave iOS's `ClaveTests/AccountThemeTests.swift`.
//
// The PUBKEY → palette index mapping is a public-facing identity — same npub
// MUST resolve to the same palette entry on iOS and on the web. These tests
// pin specific known-good (pubkey, index) pairs so any palette reorder or
// hash-algorithm change is caught immediately.
//
// When iOS adds new fixtures to AccountThemeTests.swift, mirror them here.
// When web changes a fixture's expected index, the iOS test must change too.

import { describe, expect, it } from 'vitest';
import {
	PALETTE,
	gradientIndexForPubkey,
	pubkeyHueGradient,
	themeForPubkey,
	fgForHex,
	hexToRgba
} from './theme';

describe('PALETTE', () => {
	it('has exactly 12 entries', () => {
		// Mirrors iOS testPalette_hasTwelveEntries. Changing this requires a
		// coordinated palette update on both platforms — every existing user's
		// account color shifts under modulo arithmetic.
		expect(PALETTE).toHaveLength(12);
	});

	it('every entry has start, end, accent, name, and stable index', () => {
		PALETTE.forEach((entry, i) => {
			expect(entry.start).toMatch(/^#[0-9A-F]{6}$/i);
			expect(entry.end).toMatch(/^#[0-9A-F]{6}$/i);
			expect(entry.accent).toMatch(/^#[0-9A-F]{6}$/i);
			expect(entry.name).toBeTruthy();
			// `index` field must match its position in the array — used by
			// debug surfaces and the parity tests below.
			expect(entry.index).toBe(i);
		});
	});

	it('palette names are in the locked iOS order — DO NOT REORDER', () => {
		// The order is load-bearing: changing it reassigns every existing
		// account's color. If you need to add a color, append at the end.
		expect(PALETTE.map((e) => e.name)).toEqual([
			'Violet',
			'Teal',
			'Coral',
			'Magenta',
			'Sky',
			'Lime',
			'Red',
			'Fuchsia',
			'Emerald',
			'Orchid',
			'Navy',
			'Peach'
		]);
	});
});

describe('gradientIndexForPubkey — cross-platform parity', () => {
	// These fixtures MUST produce the same index on iOS. When updating, run
	// the web computation AND verify against ClaveTests/AccountThemeTests.swift
	// (or a quick Swift Playground using AccountTheme.forAccount).
	const PARITY_FIXTURES: Array<{ pubkey: string; index: number; note: string }> = [
		{
			pubkey: 'd6a4f1b71acb4c0b989ed61a695cd438f219463d3983b5b457791e5e6d681449',
			index: 7,
			note: 'iOS test pubkey from AccountThemeTests.swift → Fuchsia'
		},
		{
			pubkey: 'c7facc81b54b812a0e1086d114d21d2f8183c2e718286d3fd9d9607baef15d2a',
			index: 2,
			note: 'vanity npub1clave… → Coral (warm orange — fitting for the brand)'
		},
		{
			pubkey: '55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21',
			index: 11,
			note: 'POWR test account from MEMORY.md → Peach'
		}
	];

	for (const { pubkey, index, note } of PARITY_FIXTURES) {
		it(`${pubkey.slice(0, 8)}… → palette[${index}] (${note})`, () => {
			expect(gradientIndexForPubkey(pubkey)).toBe(index);
		});
	}

	it('is deterministic — same pubkey always returns the same index', () => {
		// Mirrors iOS testForAccount_isDeterministic.
		const pk = 'd6a4f1b71acb4c0b989ed61a695cd438f219463d3983b5b457791e5e6d681449';
		const a = gradientIndexForPubkey(pk);
		const b = gradientIndexForPubkey(pk);
		const c = gradientIndexForPubkey(pk);
		expect(a).toBe(b);
		expect(b).toBe(c);
	});

	it('is case-insensitive — uppercase and lowercase produce the same index', () => {
		// Mirrors iOS testForAccount_isCaseInsensitive. The web normalizes via
		// `.toLowerCase()` before hashing; iOS lowercases before SHA-256 too.
		const lower = 'd6a4f1b71acb4c0b989ed61a695cd438f219463d3983b5b457791e5e6d681449';
		expect(gradientIndexForPubkey(lower)).toBe(gradientIndexForPubkey(lower.toUpperCase()));
	});

	it('falls back to index 0 for empty input', () => {
		// Mirrors iOS testForAccount_emptyHexReturnsFirstPaletteEntry.
		expect(gradientIndexForPubkey('')).toBe(0);
	});

	it('falls back to index 0 for non-hex input', () => {
		// Mirrors iOS testForAccount_invalidInputReturnsFirstPaletteEntry.
		expect(gradientIndexForPubkey('not-hex-at-all')).toBe(0);
		expect(gradientIndexForPubkey('contains spaces')).toBe(0);
		expect(gradientIndexForPubkey('zzz')).toBe(0);
	});

	it('distributes across the palette for random pubkeys', () => {
		// Mirrors iOS testForAccount_distributesAcrossPalette. 100 random
		// 64-char hex strings should hit at least 8 of the 12 palette entries.
		const seen = new Set<number>();
		for (let i = 0; i < 100; i++) {
			let hex = '';
			for (let j = 0; j < 32; j++) {
				hex += Math.floor(Math.random() * 256)
					.toString(16)
					.padStart(2, '0');
			}
			seen.add(gradientIndexForPubkey(hex));
		}
		expect(seen.size).toBeGreaterThanOrEqual(8);
	});
});

describe('themeForPubkey', () => {
	it('returns the AccountTheme at the computed index', () => {
		const pk = 'c7facc81b54b812a0e1086d114d21d2f8183c2e718286d3fd9d9607baef15d2a';
		const theme = themeForPubkey(pk);
		expect(theme.index).toBe(2);
		expect(theme.name).toBe('Coral');
		expect(theme.start).toBe('#FF8C4A');
	});
});

describe('pubkeyHueGradient', () => {
	it('returns a 135deg HSL linear-gradient for valid pubkeys', () => {
		const result = pubkeyHueGradient(
			'c7facc81b54b812a0e1086d114d21d2f8183c2e718286d3fd9d9607baef15d2a'
		);
		expect(result.css).toMatch(/^linear-gradient\(135deg, hsl\(\d+ 70% 60%\), hsl\(\d+ 60% 45%\)\)$/);
		expect(result.fg).toBe('#ffffff');
	});

	it('is deterministic for the same pubkey', () => {
		const pk = '55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21';
		expect(pubkeyHueGradient(pk).css).toBe(pubkeyHueGradient(pk).css);
	});

	it('produces different gradients for different pubkeys', () => {
		// Two pubkeys with sufficiently different first/9th bytes — sanity check
		// that pubkey-hue isn't accidentally collapsing inputs.
		const a = pubkeyHueGradient(
			'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'
		);
		const b = pubkeyHueGradient(
			'112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00'
		);
		expect(a.css).not.toBe(b.css);
	});

	it('is case-insensitive', () => {
		const lower = '55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21';
		expect(pubkeyHueGradient(lower).css).toBe(pubkeyHueGradient(lower.toUpperCase()).css);
	});

	it('falls back to neutral grey for malformed input', () => {
		expect(pubkeyHueGradient('').css).toBe('linear-gradient(135deg, #999, #666)');
		expect(pubkeyHueGradient('zzz').css).toBe('linear-gradient(135deg, #999, #666)');
		// 11 hex chars — below the 12-char minimum we slice from
		expect(pubkeyHueGradient('abcdef012345').css).not.toBe('linear-gradient(135deg, #999, #666)');
		expect(pubkeyHueGradient('abcdef01234').css).toBe('linear-gradient(135deg, #999, #666)');
	});
});

describe('fgForHex', () => {
	it('returns near-black on light backgrounds', () => {
		// Lime end (#C2FF4A) — luminance ≈ 0.83 — contrasts with dark text.
		expect(fgForHex('#C2FF4A')).toBe('rgba(0,0,0,0.7)');
	});

	it('returns white on dark backgrounds', () => {
		// Violet accent (#592EFF) — luminance ≈ 0.21 — contrasts with white.
		expect(fgForHex('#592EFF')).toBe('#ffffff');
	});

	it('returns white for malformed input as a safe default', () => {
		expect(fgForHex('not a hex')).toBe('#ffffff');
		expect(fgForHex('')).toBe('#ffffff');
	});
});

describe('hexToRgba', () => {
	it('converts #RRGGBB + alpha to rgb(r g b / a) string', () => {
		expect(hexToRgba('#FF8C4A', 0.42)).toBe('rgb(255 140 74 / 0.42)');
	});

	it('falls back to transparent black for malformed input', () => {
		expect(hexToRgba('not a hex', 0.5)).toBe('rgb(0 0 0 / 0.5)');
	});
});
