import { describe, it, expect, vi } from 'vitest';
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
