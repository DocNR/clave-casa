/**
 * Inbound connect-request helpers for /connect — the non-SDK degradation path
 * of "Sign in with Clave". A partner's Universal Link
 * (https://clave.casa/connect/?uri=nostrconnect://…) lands here when Clave
 * isn't installed (or the AASA hasn't propagated). These helpers:
 *
 * - parse the nostrconnect URI the way Clave's own parser does
 *   (Clave/Shared/NostrConnectParser.swift — including keeping "+" literal);
 * - derive the caller display under the same domain-first rules as the iOS
 *   ApprovalSheet / onboarding banner, so every surface agrees on who is asking;
 * - build the clave://connect re-fire link and the Smart App Banner content;
 * - keep the inbound request in sessionStorage (tab-scoped, device-local,
 *   10-minute TTL, dropped after one re-fire) so it survives the App Store
 *   round trip — the documented relaxation of "memory only".
 *
 * Pure functions + one small class; everything is unit-tested.
 */

export const CLAVE_APP_STORE_ID = '6762104155';
export const INBOUND_TTL_MS = 10 * 60 * 1000;
export const INBOUND_STASH_KEY = 'clave-casa.inbound.v1';

const HEX64 = /^[0-9a-f]{64}$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
/** The only characters a displayed host may contain. Punycode (xn--…) is ASCII and shows literally. */
const HOST_ASCII = /^[a-z0-9.-]+$/;

export interface ParsedNostrconnect {
	clientPubkey: string;
	relays: string[];
	secret: string;
	perms: string[];
	name?: string;
	url?: string;
	image?: string;
}

/**
 * Parse a nostrconnect:// URI exactly like Clave does. Notably `+` is NOT
 * turned into a space (URLSearchParams would), because Swift's URLComponents
 * doesn't either — a partner that emits `name=My+Client` sees "My+Client" in
 * Clave, and this page must show the same thing.
 */
export function parseNostrconnect(uri: string): ParsedNostrconnect | null {
	if (typeof uri !== 'string' || !uri.startsWith('nostrconnect://')) return null;
	const rest = uri.slice('nostrconnect://'.length);
	const q = rest.indexOf('?');
	const host = q >= 0 ? rest.slice(0, q) : rest;
	const query = q >= 0 ? rest.slice(q + 1) : '';
	if (!HEX64.test(host)) return null;

	const relays: string[] = [];
	let secret = '';
	let perms: string[] = [];
	let name: string | undefined;
	let url: string | undefined;
	let image: string | undefined;

	for (const pair of query.split('&')) {
		if (!pair) continue;
		const eq = pair.indexOf('=');
		const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
		const rawVal = eq >= 0 ? pair.slice(eq + 1) : '';
		let key: string;
		let val: string;
		try {
			key = decodeURIComponent(rawKey);
			val = decodeURIComponent(rawVal);
		} catch {
			continue;
		}
		switch (key) {
			case 'relay':
				if (val) relays.push(val);
				break;
			case 'secret':
				secret = val;
				break;
			case 'perms':
				perms = val ? val.split(',').filter(Boolean) : [];
				break;
			case 'name':
				// A whitespace-only name counts as absent, like on iOS.
				name = val.trim() || undefined;
				break;
			case 'url':
				url = val || undefined;
				break;
			case 'image':
				image = val || undefined;
				break;
		}
	}
	if (relays.length === 0 || !secret) return null;
	return { clientPubkey: host.toLowerCase(), relays, secret, perms, name, url, image };
}

/**
 * The host of a self-asserted `url`, for domain-first display. Same rules as
 * the iOS CallerIdentity helper: http(s) only; lowercase; the FULL host minus
 * one leading "www." — never collapsed to a "registrable" part, because
 * public-suffix platforms (github.io, pages.dev, vercel.app, …) would launder
 * attacker.github.io into github.io; ASCII only, so a Unicode host shows as
 * its literal punycode (xn--…) instead of a homograph of a trusted domain;
 * null for IPs, localhost, single-label hosts, non-http(s) schemes, and
 * unparseable input. Userinfo tricks ("clave.casa@evil.com") and path tricks
 * ("evil.com/clave.casa") resolve to the real host by construction.
 * Not a security boundary — a verified-caller badge is a later feature.
 */
export function displayDomain(url: string | undefined | null): string | null {
	if (!url) return null;
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return null;
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	// WHATWG URL already yields the ASCII (punycode) hostname; the guard keeps
	// that a hard rule so nothing outside [a-z0-9.-] can reach the headline
	// (IPv6 literals come back bracketed and fail it too).
	let host = u.hostname.toLowerCase().replace(/\.$/, '');
	if (!host || !HOST_ASCII.test(host) || host === 'localhost' || IPV4.test(host)) return null;
	if (host.startsWith('www.')) host = host.slice(4);
	if (host.split('.').filter(Boolean).length < 2) return null;
	return host;
}

/** Short client-pubkey fingerprint, same shape as Clave's ClientIdentityHeader. */
export function fingerprint(pubkey: string): string {
	if (!pubkey || pubkey.length <= 12) return pubkey;
	return `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`;
}

/**
 * Domain first; else the client-pubkey fingerprint. The self-asserted name
 * NEVER occupies the headline slot — a name like "clave.casa" would otherwise
 * be indistinguishable from the real domain headline. It only ever appears in
 * the unverified caption (see callerCaption).
 */
export function callerHeadline(p: ParsedNostrconnect): string {
	return displayDomain(p.url) ?? fingerprint(p.clientPubkey);
}

/** True when the headline is already the fingerprint, so the separate fingerprint line should be suppressed. */
export function callerHeadlineIsFingerprint(p: ParsedNostrconnect): boolean {
	return displayDomain(p.url) === null;
}

/**
 * The unverified caption, split so the marker can be rendered as a fixed,
 * non-truncating sibling: `{ lead: 'calls itself “name”', marker: '· unverified' }`
 * for a named caller, `{ lead: 'icon', marker: '· unverified' }` for an
 * icon-only caller (a self-asserted image deserves the marker too), null when
 * nothing self-asserted is shown.
 */
export function callerCaption(p: ParsedNostrconnect): { lead: string; marker: string } | null {
	if (p.name) return { lead: `calls itself “${p.name}”`, marker: '· unverified' };
	if (p.image) return { lead: 'icon', marker: '· unverified' };
	return null;
}

/** The reserved-scheme re-fire link Clave handles (clave://connect?uri=…), encoded once. */
export function claveOpenLink(uri: string): string {
	return `clave://connect?uri=${encodeURIComponent(uri)}`;
}

/**
 * Content for <meta name="apple-itunes-app">. With a URI, `app-argument` is the
 * clave://connect link so the banner's OPEN (shown only when Clave is
 * installed) lands the request in the app. Commas inside the URI are
 * percent-encoded by encodeURIComponent, so the comma-separated meta syntax
 * stays intact.
 */
export function smartBannerContent(uri: string | null | undefined): string {
	return uri ? `app-id=${CLAVE_APP_STORE_ID}, app-argument=${claveOpenLink(uri)}` : `app-id=${CLAVE_APP_STORE_ID}`;
}

export type Platform = 'ios' | 'android' | 'desktop';

/** Coarse platform detection for the install panel. iPadOS Safari reports itself as a Mac with touch points. */
export function detectPlatform(userAgent: string, platform: string, maxTouchPoints: number): Platform {
	if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
	// Android before the iPad-as-Mac heuristic: a desktop-hosted Android
	// emulation keeps navigator.platform = "MacIntel" with touch points.
	if (/Android/.test(userAgent)) return 'android';
	if (platform === 'MacIntel' && maxTouchPoints > 1) return 'ios';
	return 'desktop';
}

export interface InboundRecord {
	uri: string;
	parsed: ParsedNostrconnect | null;
	/** True when the request outlived the 10-minute window; the record is returned once so the page can name the caller in the expiry copy. */
	expired: boolean;
}

interface StoredStash {
	uri: string;
	storedAt: number;
	refired: boolean;
}

type MapLike = { get(k: string): string | undefined | null; set(k: string, v: string): unknown; delete(k: string): unknown; has?(k: string): boolean };
type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

/**
 * The tab-scoped stash. Storage is injectable (Map in tests, sessionStorage in
 * the page). Rules: 10-minute TTL; an expired record is reported once (with
 * the parsed caller, for copy) and scrubbed; after one re-fire the record is
 * served for the current view and then dropped.
 */
export class InboundStash {
	private readonly key: string;
	private readonly now: () => number;
	private readonly store: { get: (k: string) => string | null; set: (k: string, v: string) => void; delete: (k: string) => void };

	constructor(storage: MapLike | StorageLike, now: () => number = () => Date.now(), key = INBOUND_STASH_KEY) {
		this.key = key;
		this.now = now;
		if ('getItem' in storage) {
			const s = storage as StorageLike;
			this.store = { get: (k) => s.getItem(k), set: (k, v) => s.setItem(k, v), delete: (k) => s.removeItem(k) };
		} else {
			const m = storage as MapLike;
			this.store = { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v), delete: (k) => m.delete(k) };
		}
	}

	stash(uri: string): void {
		const rec: StoredStash = { uri, storedAt: this.now(), refired: false };
		this.store.set(this.key, JSON.stringify(rec));
	}

	private load(): StoredStash | null {
		const raw = this.store.get(this.key);
		if (!raw) return null;
		try {
			const rec = JSON.parse(raw) as StoredStash;
			if (!rec || typeof rec.uri !== 'string' || typeof rec.storedAt !== 'number') throw new Error('shape');
			return rec;
		} catch {
			this.clear();
			return null;
		}
	}

	read(): InboundRecord | null {
		const rec = this.load();
		if (!rec) return null;
		const parsed = parseNostrconnect(rec.uri);
		if (this.now() - rec.storedAt > INBOUND_TTL_MS) {
			this.clear();
			return { uri: rec.uri, parsed, expired: true };
		}
		if (rec.refired) {
			this.clear();
		}
		return { uri: rec.uri, parsed, expired: false };
	}

	/** The user tapped "Open Clave": serve the request for this view, then drop it. */
	markRefired(): void {
		const rec = this.load();
		if (!rec) return;
		this.store.set(this.key, JSON.stringify({ ...rec, refired: true }));
	}

	clear(): void {
		this.store.delete(this.key);
	}
}
