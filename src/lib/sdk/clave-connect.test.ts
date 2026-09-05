import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
// The shipped file IS the unit under test — one source of truth (typed via its JSDoc).
import { buildConnectURI, universalLink, ClaveConnect, CLAVE_RELAY, PENDING_WINDOW_MS } from '../../../static/sdk/clave-connect.js';

const PK = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';
const SECRET = '0123456789abcdef';

describe('buildConnectURI', () => {
	it('builds a nostrconnect URI with the client pubkey as host', () => {
		const uri = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: ['wss://relay.example.com'] });
		expect(uri.startsWith(`nostrconnect://${PK}?`)).toBe(true);
	});

	it('always includes the Clave proxy relay, once, without dropping the partner relays', () => {
		const uri = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: ['wss://relay.example.com', CLAVE_RELAY] });
		const relays = [...new URL(uri.replace('nostrconnect://', 'https://')).searchParams.getAll('relay')];
		expect(relays).toEqual(['wss://relay.example.com', CLAVE_RELAY]);
	});

	it('appends the Clave proxy relay when the partner omits it', () => {
		const uri = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: ['wss://relay.example.com'] });
		const relays = new URL(uri.replace('nostrconnect://', 'https://')).searchParams.getAll('relay');
		expect(relays).toEqual(['wss://relay.example.com', CLAVE_RELAY]);
	});

	it('encodes metadata so spaces survive Swift URLComponents (no "+" for space)', () => {
		const uri = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: [CLAVE_RELAY], name: 'Signin PoC', url: 'https://clave.casa' });
		expect(uri).toContain('name=Signin%20PoC');
		expect(uri).not.toContain('name=Signin+PoC');
		expect(uri).toContain('url=https%3A%2F%2Fclave.casa');
	});

	it('includes perms and image only when provided', () => {
		const bare = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: [CLAVE_RELAY] });
		expect(bare).not.toContain('perms=');
		expect(bare).not.toContain('image=');
		const full = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: [CLAVE_RELAY], perms: ['sign_event:1', 'get_public_key'], image: 'https://clave.casa/i.png' });
		expect(full).toContain('perms=sign_event%3A1%2Cget_public_key');
		expect(full).toContain('image=https%3A%2F%2Fclave.casa%2Fi.png');
	});

	it('rejects a malformed client pubkey or empty secret', () => {
		expect(() => buildConnectURI({ clientPubkey: 'nope', secret: SECRET, relays: [CLAVE_RELAY] })).toThrow();
		expect(() => buildConnectURI({ clientPubkey: PK, secret: '', relays: [CLAVE_RELAY] })).toThrow();
	});
});

describe('buildConnectURI callback= (the return leg)', () => {
	const base = { clientPubkey: PK, secret: SECRET, relays: [CLAVE_RELAY], url: 'https://sell.conduit.market' };
	const param = (uri: string, name: string) => new URL(uri.replace('nostrconnect://', 'https://')).searchParams.get(name);

	it('omits callback= when none is given', () => {
		expect(buildConnectURI(base)).not.toContain('callback=');
	});

	it('carries an https callback on the same host as url, percent-encoded once', () => {
		const uri = buildConnectURI({ ...base, callback: 'https://sell.conduit.market/clave/return?state=abc123' });
		expect(uri).toContain('callback=https%3A%2F%2Fsell.conduit.market%2Fclave%2Freturn%3Fstate%3Dabc123');
		expect(param(uri, 'callback')).toBe('https://sell.conduit.market/clave/return?state=abc123');
	});

	it('treats www. as the same host on either side, like Clave does', () => {
		expect(() => buildConnectURI({ ...base, callback: 'https://www.sell.conduit.market/r' })).not.toThrow();
		expect(() => buildConnectURI({ ...base, url: 'https://www.sell.conduit.market', callback: 'https://sell.conduit.market/r' })).not.toThrow();
	});

	it('carries a custom-scheme callback without needing url', () => {
		const { url: _url, ...noUrl } = base;
		const uri = buildConnectURI({ ...noUrl, callback: 'conduit://clave-return?state=abc123' });
		expect(param(uri, 'callback')).toBe('conduit://clave-return?state=abc123');
	});

	it('refuses an https callback whose host is not exactly the url host (Clave would drop it silently)', () => {
		expect(() => buildConnectURI({ ...base, callback: 'https://evil.example/return' })).toThrow(/host/);
		expect(() => buildConnectURI({ ...base, callback: 'https://api.sell.conduit.market/return' })).toThrow(/host/);
		expect(() => buildConnectURI({ ...base, callback: 'https://conduit.market/return' })).toThrow(/host/);
		const { url: _url, ...noUrl } = base;
		expect(() => buildConnectURI({ ...noUrl, callback: 'https://sell.conduit.market/return' })).toThrow(/url/);
	});

	it('refuses a callback that carries the secret', () => {
		expect(() => buildConnectURI({ ...base, callback: `https://sell.conduit.market/return?s=${SECRET}` })).toThrow(/secret/);
		expect(() => buildConnectURI({ ...base, callback: `conduit://return?s=${SECRET}` })).toThrow(/secret/);
	});

	it('refuses a relative, schemeless or whitespace-bearing callback', () => {
		expect(() => buildConnectURI({ ...base, callback: '/return' })).toThrow(/absolute/);
		expect(() => buildConnectURI({ ...base, callback: 'sell.conduit.market/return' })).toThrow(/absolute/);
		expect(() => buildConnectURI({ ...base, callback: 'https://sell.conduit.market/re turn' })).toThrow(/whitespace/);
		expect(() => buildConnectURI({ ...base, callback: 'https://sell.conduit.market/return\n' })).toThrow(/whitespace/);
	});
});

describe('published copies', () => {
	// The versioned file is what partners pin (immutable + SRI); "latest" must be
	// the same bytes, and the .sri beside it must be the hash of those bytes.
	const VERSION = '0.2.0';
	const sdk = (f: string) => readFileSync(resolve(__dirname, '../../../static/sdk', f));
	const sri = (buf: Buffer) => 'sha384-' + createHash('sha384').update(buf).digest('base64');

	it(`clave-connect-${VERSION}.js is byte-identical to clave-connect.js`, () => {
		expect(sdk(`clave-connect-${VERSION}.js`).equals(sdk('clave-connect.js'))).toBe(true);
	});

	it(`clave-connect-${VERSION}.sri is the sha384 of clave-connect-${VERSION}.js`, () => {
		expect(sdk(`clave-connect-${VERSION}.sri`).toString().trim()).toBe(sri(sdk(`clave-connect-${VERSION}.js`)));
	});

	it('the header names the same version', () => {
		expect(sdk('clave-connect.js').toString().split('\n')[1]).toContain(`v${VERSION}`);
	});

	it('0.1.0 is untouched', () => {
		expect(sdk('clave-connect-0.1.0.sri').toString().trim()).toBe(sri(sdk('clave-connect-0.1.0.js')));
		expect(sri(sdk('clave-connect-0.1.0.js'))).toBe('sha384-4tldMcAb+vDq69JMujdUCNM0KiVVzHwog9FjCqOFfCx81ldwHvs9uTn5X/Y0pecz');
	});
});

describe('universalLink', () => {
	it('wraps the URI once — never double-encodes', () => {
		const uri = buildConnectURI({ clientPubkey: PK, secret: SECRET, relays: [CLAVE_RELAY], name: 'Signin PoC' });
		const link = universalLink(uri);
		expect(link.startsWith('https://clave.casa/connect/?uri=')).toBe(true);
		const decoded = new URL(link).searchParams.get('uri');
		expect(decoded).toBe(uri);
	});

	it('refuses a non-nostrconnect URI', () => {
		expect(() => universalLink('bunker://abc?relay=x')).toThrow();
	});
});

describe('ClaveConnect (attempt lifecycle)', () => {
	const mint = () => ({ clientPubkey: PK, secret: SECRET, relays: [CLAVE_RELAY], name: 'Signin PoC', url: 'https://clave.casa' });

	it('start() mints an attempt and returns the universal link', () => {
		let now = 1_000_000;
		const c = new ClaveConnect({ mint, now: () => now, storage: new Map() });
		const link = c.start();
		expect(link.startsWith('https://clave.casa/connect/?uri=nostrconnect%3A%2F%2F')).toBe(true);
		expect(c.pending()).not.toBeNull();
	});

	it('retry() inside the pending window re-fires the SAME link (same secret)', () => {
		let now = 1_000_000;
		const c = new ClaveConnect({ mint, now: () => now, storage: new Map() });
		const first = c.start();
		now += PENDING_WINDOW_MS - 1000;
		expect(c.retry()).toBe(first);
	});

	it('retry() after the window expires mints a fresh link and scrubs the old attempt', () => {
		let now = 1_000_000;
		let secret = 'aaaaaaaaaaaaaaaa';
		const c = new ClaveConnect({ mint: () => ({ ...mint(), secret }), now: () => now, storage: new Map() });
		const first = c.start();
		now += PENDING_WINDOW_MS + 1;
		secret = 'bbbbbbbbbbbbbbbb';
		const second = c.retry();
		expect(second).not.toBe(first);
		expect(decodeURIComponent(second)).toContain('secret=bbbbbbbbbbbbbbbb');
	});

	it('established() and denied() end the attempt so the next start() re-mints', () => {
		let now = 1_000_000;
		let secret = 'aaaaaaaaaaaaaaaa';
		const c = new ClaveConnect({ mint: () => ({ ...mint(), secret }), now: () => now, storage: new Map() });
		c.start();
		c.established();
		expect(c.pending()).toBeNull();
		secret = 'cccccccccccccccc';
		expect(decodeURIComponent(c.start())).toContain('secret=cccccccccccccccc');
		c.denied();
		expect(c.pending()).toBeNull();
	});

	it('persists the pending attempt so a reload inside the window can still re-fire it', () => {
		let now = 1_000_000;
		const storage = new Map();
		const link = new ClaveConnect({ mint, now: () => now, storage }).start();
		const reloaded = new ClaveConnect({ mint, now: () => now, storage });
		expect(reloaded.retry()).toBe(link);
	});

	it('onReturn fires once per foreground while an attempt is pending, and passes the pending attempt', () => {
		let now = 1_000_000;
		const listeners: Record<string, () => void> = {};
		const doc = { addEventListener: (ev: string, fn: () => void) => { listeners[ev] = fn; }, visibilityState: 'hidden' as string };
		const c = new ClaveConnect({ mint, now: () => now, storage: new Map(), document: doc });
		const cb = vi.fn();
		c.onReturn(cb);
		c.start();
		doc.visibilityState = 'visible';
		listeners['visibilitychange']();
		listeners['visibilitychange'](); // duplicate event in the same foreground — must not double-fire
		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb.mock.calls[0][0].clientPubkey).toBe(PK);
	});

	it('onReturn does not fire when nothing is pending', () => {
		const listeners: Record<string, () => void> = {};
		const doc = { addEventListener: (ev: string, fn: () => void) => { listeners[ev] = fn; }, visibilityState: 'hidden' as string };
		const c = new ClaveConnect({ mint, now: () => 1, storage: new Map(), document: doc });
		const cb = vi.fn();
		c.onReturn(cb);
		doc.visibilityState = 'visible';
		listeners['visibilitychange']();
		expect(cb).not.toHaveBeenCalled();
	});
});
