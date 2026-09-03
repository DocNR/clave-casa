import { describe, it, expect } from 'vitest';
import {
	parseNostrconnect,
	displayDomain,
	fingerprint,
	callerHeadline,
	callerHeadlineIsFingerprint,
	callerCaption,
	claveOpenLink,
	smartBannerContent,
	detectPlatform,
	InboundStash,
	INBOUND_TTL_MS,
	CLAVE_APP_STORE_ID
} from './connect-inbound';

const PK = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';
const URI = `nostrconnect://${PK}?relay=wss%3A%2F%2Frelay.example.com&secret=topsecret&perms=sign_event%3A1%2Cget_public_key&name=Signin%20PoC&url=https%3A%2F%2Fshop.conduit.market&image=https%3A%2F%2Fclave.casa%2Fi.png`;

describe('parseNostrconnect (mirrors Clave/Shared/NostrConnectParser.swift)', () => {
	it('parses every field', () => {
		const p = parseNostrconnect(URI);
		expect(p).not.toBeNull();
		expect(p!.clientPubkey).toBe(PK);
		expect(p!.relays).toEqual(['wss://relay.example.com']);
		expect(p!.secret).toBe('topsecret');
		expect(p!.perms).toEqual(['sign_event:1', 'get_public_key']);
		expect(p!.name).toBe('Signin PoC');
		expect(p!.url).toBe('https://shop.conduit.market');
		expect(p!.image).toBe('https://clave.casa/i.png');
	});

	it('collects repeated relay params in order', () => {
		const p = parseNostrconnect(`nostrconnect://${PK}?relay=wss%3A%2F%2Fa&secret=s&relay=wss%3A%2F%2Fb`);
		expect(p!.relays).toEqual(['wss://a', 'wss://b']);
	});

	it('keeps "+" literal in values, like Clave does (URLSearchParams would turn it into a space)', () => {
		const p = parseNostrconnect(`nostrconnect://${PK}?relay=wss%3A%2F%2Fa&secret=s&name=My+Client`);
		expect(p!.name).toBe('My+Client');
	});

	it('treats a whitespace-only name as absent, like iOS', () => {
		const p = parseNostrconnect(`nostrconnect://${PK}?relay=wss%3A%2F%2Fa&secret=s&name=%20%20`);
		expect(p!.name).toBeUndefined();
	});

	it('lowercases the client pubkey', () => {
		const p = parseNostrconnect(`nostrconnect://${PK.toUpperCase()}?relay=wss%3A%2F%2Fa&secret=s`);
		expect(p!.clientPubkey).toBe(PK);
	});

	it('returns null for a wrong scheme, a bad pubkey, no relay, or no secret', () => {
		expect(parseNostrconnect(`bunker://${PK}?relay=wss%3A%2F%2Fa&secret=s`)).toBeNull();
		expect(parseNostrconnect(`nostrconnect://nope?relay=wss%3A%2F%2Fa&secret=s`)).toBeNull();
		expect(parseNostrconnect(`nostrconnect://${PK}?secret=s`)).toBeNull();
		expect(parseNostrconnect(`nostrconnect://${PK}?relay=wss%3A%2F%2Fa`)).toBeNull();
		expect(parseNostrconnect('')).toBeNull();
	});
});

describe('displayDomain (same rules as the iOS CallerIdentity helper)', () => {
	it.each([
		['https://clave.casa', 'clave.casa'],
		['https://www.clave.casa/connect', 'clave.casa'],
		['https://shop.conduit.market', 'shop.conduit.market'],
		['https://SELL.Conduit.Market:8443/x?y=1', 'sell.conduit.market'],
		['https://app.example.co.uk', 'app.example.co.uk'],
		['http://example.com', 'example.com'],
		['https://clave.casa.evil.com', 'clave.casa.evil.com'],
		['https://clave.casa@evil.com/', 'evil.com'],
		['https://example.com.', 'example.com']
	])('%s → %s (full host, never collapsed)', (input, expected) => {
		expect(displayDomain(input)).toBe(expected);
	});

	it('never launders a public-suffix platform subdomain into the platform', () => {
		expect(displayDomain('https://attacker.github.io')).toBe('attacker.github.io');
		expect(displayDomain('https://attacker.pages.dev')).toBe('attacker.pages.dev');
	});

	it.each([
		[undefined],
		[''],
		['not a url'],
		['ftp://example.com'],
		['javascript:alert(1)'],
		['https://127.0.0.1'],
		['https://[::1]/'],
		['https://localhost:3000'],
		['https://intranet'],
		['https://']
	])('%s → null', (input) => {
		expect(displayDomain(input as string | undefined)).toBeNull();
	});

	it('never lets a path segment masquerade as the domain', () => {
		expect(displayDomain('https://evil.com/clave.casa')).toBe('evil.com');
	});

	it('shows a Unicode host as its literal punycode, never as a homograph of a trusted domain', () => {
		// Cyrillic с ӏ а ѵ е — pixel-identical to "clave" in most fonts.
		const shown = displayDomain('https://сӏаѵе.casa');
		expect(shown).not.toBe('clave.casa');
		expect(shown).toMatch(/^xn--[a-z0-9-]+\.casa$/);
		expect(displayDomain('https://xn--80ak8a1oqq.casa')).toMatch(/^xn--/);
	});

	it('rejects hosts carrying invisible or bidi characters instead of rendering them', () => {
		const rlo = displayDomain('https://clave.casa‮evil.com');
		expect(rlo === null || /^[a-z0-9.-]+$/.test(rlo)).toBe(true);
		const zwsp = displayDomain('https://clave.casa​evil.com');
		expect(zwsp).not.toBe('clave.casa');
		if (zwsp !== null) expect(zwsp).toMatch(/^[a-z0-9.-]+$/);
	});
});

describe('fingerprint + callerHeadline', () => {
	it('fingerprint is 8…4 of the client pubkey', () => {
		expect(fingerprint(PK)).toBe('abc123de…abcd');
	});

	it('headline is the domain, else the fingerprint — never the self-asserted name', () => {
		const p = parseNostrconnect(URI)!;
		expect(callerHeadline(p)).toBe('shop.conduit.market');
		expect(callerHeadline({ ...p, url: undefined })).toBe('abc123de…abcd');
		expect(callerHeadline({ ...p, url: undefined, name: 'clave.casa' })).toBe('abc123de…abcd');
		expect(callerHeadline({ ...p, url: 'https://localhost', name: 'clave.casa' })).toBe('abc123de…abcd');
	});

	it('flags when the headline already is the fingerprint, so the fingerprint line can be suppressed', () => {
		const p = parseNostrconnect(URI)!;
		expect(callerHeadlineIsFingerprint(p)).toBe(false);
		expect(callerHeadlineIsFingerprint({ ...p, url: undefined })).toBe(true);
	});

	it('caption: named → "calls itself" + fixed marker; icon-only → "icon" + marker; nothing self-asserted → null', () => {
		const p = parseNostrconnect(URI)!;
		expect(callerCaption(p)).toEqual({ lead: 'calls itself “Signin PoC”', marker: '· unverified' });
		expect(callerCaption({ ...p, name: undefined })).toEqual({ lead: 'icon', marker: '· unverified' });
		expect(callerCaption({ ...p, name: undefined, image: undefined })).toBeNull();
	});
});

describe('claveOpenLink + smartBannerContent', () => {
	it('builds the clave://connect scheme link, encoded once', () => {
		const link = claveOpenLink(URI);
		expect(link.startsWith('clave://connect?uri=nostrconnect%3A%2F%2F')).toBe(true);
		expect(decodeURIComponent(link.slice('clave://connect?uri='.length))).toBe(URI);
	});

	it('smart banner content carries the app id and the scheme link as app-argument', () => {
		const c = smartBannerContent(URI);
		expect(c.startsWith(`app-id=${CLAVE_APP_STORE_ID}, app-argument=clave://connect?uri=`)).toBe(true);
		expect(CLAVE_APP_STORE_ID).toBe('6762104155');
	});

	it('smart banner without a URI is just the app id', () => {
		expect(smartBannerContent(null)).toBe(`app-id=${CLAVE_APP_STORE_ID}`);
	});
});

describe('detectPlatform', () => {
	const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
	const ipadAsMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
	const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';
	const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

	it('iPhone → ios', () => expect(detectPlatform(iphone, 'iPhone', 5)).toBe('ios'));
	it('iPad presenting as Mac (touch points) → ios', () => expect(detectPlatform(ipadAsMac, 'MacIntel', 5)).toBe('ios'));
	it('Android → android', () => expect(detectPlatform(android, 'Linux armv8l', 5)).toBe('android'));
	it('Android UA emulated on a Mac host (platform still MacIntel + touch) → android, not ios', () =>
		expect(detectPlatform(android, 'MacIntel', 5)).toBe('android'));
	it('desktop Mac → desktop', () => expect(detectPlatform(mac, 'MacIntel', 0)).toBe('desktop'));
});

describe('InboundStash (sessionStorage, tab-scoped, 10-minute TTL, one re-fire)', () => {
	const t0 = 1_000_000;

	it('stores and reads back within the TTL', () => {
		let now = t0;
		const s = new InboundStash(new Map(), () => now);
		s.stash(URI);
		now += INBOUND_TTL_MS - 1;
		expect(s.read()?.uri).toBe(URI);
	});

	it('reports expired past the TTL, scrubs, and still remembers the caller for the expiry copy', () => {
		let now = t0;
		const s = new InboundStash(new Map(), () => now);
		s.stash(URI);
		now += INBOUND_TTL_MS + 1;
		const r = s.read();
		expect(r?.expired).toBe(true);
		expect(r?.parsed?.name).toBe('Signin PoC');
		expect(s.read()).toBeNull();
	});

	it('markRefired keeps the stash for the current view but drops it on the next read (one re-fire)', () => {
		const s = new InboundStash(new Map(), () => t0);
		s.stash(URI);
		s.markRefired();
		expect(s.read()?.uri).toBe(URI); // still rendering this page
		expect(s.read()).toBeNull(); // a later visit does not re-fire again
	});

	it('clear scrubs', () => {
		const s = new InboundStash(new Map(), () => t0);
		s.stash(URI);
		s.clear();
		expect(s.read()).toBeNull();
	});

	it('ignores an unparseable stash value', () => {
		const m = new Map<string, string>();
		m.set('clave-casa.inbound.v1', '{not json');
		expect(new InboundStash(m, () => t0).read()).toBeNull();
	});
});
