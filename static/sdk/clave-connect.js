/**
 * clave-connect.js — the "Connect with Clave" handoff shim. v0.1.0
 *
 * Deliberately thin. Your app keeps its own NIP-46 transport (nostr-tools,
 * NDK, whatever you already use). This file only does the parts that are
 * Clave-specific and easy to get subtly wrong:
 *
 *   1. build the nostrconnect:// URI from YOUR client keypair + secret +
 *      metadata, with Clave's push-wake relay merged into the relay set;
 *   2. wrap it as the https://clave.casa/connect/?uri= Universal Link, encoded
 *      exactly once;
 *   3. keep the pending attempt for ~10 minutes so a second tap re-fires the
 *      SAME link (same secret) instead of minting a new one — Clave answers a
 *      repeated connect for a pairing it already made without a second
 *      prompt — and re-mints only after denial, expiry, or establishment;
 *   4. tell you when the user comes back to the page so you can send the
 *      get_public_key resume probe (prompt-free for paired clients) and
 *      confirm the session even if the connect ack was lost.
 *
 * Zero dependencies. ES module. Works in any modern browser; the attempt
 * lifecycle is also usable in tests with injected `now`, `storage`, `document`.
 *
 * Connect origin is hardcoded on purpose: a partner must never be able to
 * point users at a look-alike domain.
 */

export const CONNECT_ORIGIN = 'https://clave.casa';
export const CLAVE_RELAY = 'wss://relay.powr.build';
export const PENDING_WINDOW_MS = 10 * 60 * 1000;

const HEX64 = /^[0-9a-f]{64}$/i;
const STORAGE_KEY = 'clave-connect.pending';

/**
 * @typedef {Object} ConnectParams
 * @property {string} clientPubkey  64-hex client pubkey (the keypair YOU persist)
 * @property {string} secret        fresh per-attempt secret Clave echoes back in the ack
 * @property {string[]} relays      relays your client is subscribed on; Clave's relay is merged in
 * @property {string[]=} perms      e.g. ['sign_event:1','get_public_key']
 * @property {string=} name         your app's display name (shown, marked unverified)
 * @property {string=} url          your app's https URL — its domain is what Clave shows largest
 * @property {string=} image        your app's icon URL
 */

/**
 * Build the nostrconnect:// URI. Values are percent-encoded with
 * encodeURIComponent (spaces become %20, never "+", which Clave's parser
 * would keep literally).
 * @param {ConnectParams} p
 * @returns {string}
 */
export function buildConnectURI(p) {
  if (!p || !HEX64.test(p.clientPubkey || '')) {
    throw new Error('clave-connect: clientPubkey must be 64 hex characters');
  }
  if (!p.secret) {
    throw new Error('clave-connect: secret is required');
  }
  /** @type {string[]} */
  const relays = [];
  for (const r of [...(p.relays || []), CLAVE_RELAY]) {
    if (r && !relays.includes(r)) relays.push(r);
  }
  const kv = relays.map((r) => ['relay', r]);
  kv.push(['secret', p.secret]);
  if (p.perms && p.perms.length) kv.push(['perms', p.perms.join(',')]);
  if (p.name) kv.push(['name', p.name]);
  if (p.url) kv.push(['url', p.url]);
  if (p.image) kv.push(['image', p.image]);
  const query = kv.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `nostrconnect://${p.clientPubkey.toLowerCase()}?${query}`;
}

/**
 * Wrap a nostrconnect:// URI as the Clave Universal Link. Encodes once.
 * @param {string} uri
 * @returns {string}
 */
export function universalLink(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('nostrconnect://')) {
    throw new Error('clave-connect: universalLink expects a nostrconnect:// URI');
  }
  return `${CONNECT_ORIGIN}/connect/?uri=${encodeURIComponent(uri)}`;
}

/**
 * Navigate to the link the way iOS needs for a Universal Link to fire: a real
 * same-tab anchor click. Falls back to location.href where there is no DOM.
 * @param {string} link
 */
export function openLink(link) {
  const doc = globalThis.document;
  if (doc && doc.body) {
    const a = doc.createElement('a');
    a.href = link;
    a.target = '_self';
    a.rel = 'noopener';
    a.style.display = 'none';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  if (globalThis.location) globalThis.location.href = link;
}

/**
 * @param {any} storage sessionStorage-like (getItem/setItem/removeItem) or Map-like
 * @returns {{ get: (k: string) => string | null, set: (k: string, v: string) => void, delete: (k: string) => void }}
 */
function storageAdapter(storage) {
  if (!storage) {
    try {
      if (globalThis.sessionStorage) storage = globalThis.sessionStorage;
    } catch {
      /* no storage access (private mode, sandbox) */
    }
  }
  if (!storage) storage = new Map();
  if (typeof storage.getItem === 'function') {
    return {
      get: (k) => storage.getItem(k),
      set: (k, v) => storage.setItem(k, v),
      delete: (k) => storage.removeItem(k),
    };
  }
  return {
    get: (k) => (storage.has(k) ? storage.get(k) : null),
    set: (k, v) => storage.set(k, v),
    delete: (k) => storage.delete(k),
  };
}

/**
 * The attempt lifecycle. One instance per page.
 *
 *   const cc = new ClaveConnect({ mint: () => ({ clientPubkey, secret: freshSecret(), relays, name, url, image }) });
 *   cc.onReturn((attempt) => sendResumeProbe(attempt.clientPubkey)); // get_public_key
 *   button.onclick = () => openLink(cc.retry());                       // first tap = start; later taps re-fire
 *   ...on ack or successful probe: cc.established();  on user denial: cc.denied();
 */
export class ClaveConnect {
  /**
   * @param {Object} o
   * @param {() => ConnectParams} o.mint  returns fresh params (new secret) for a new attempt
   * @param {() => number=} o.now         clock, ms (injectable for tests)
   * @param {any=} o.storage              sessionStorage-like or Map (defaults to sessionStorage)
   * @param {any=} o.document             document-like with addEventListener/visibilityState
   * @param {string=} o.storageKey
   */
  constructor(o) {
    if (!o || typeof o.mint !== 'function') throw new Error('clave-connect: mint() is required');
    this._mint = o.mint;
    this._now = o.now || (() => Date.now());
    this._store = storageAdapter(o.storage);
    this._doc = o.document !== undefined ? o.document : globalThis.document;
    this._key = o.storageKey || STORAGE_KEY;
    /** @type {Array<(attempt: any) => void>} */
    this._returnCbs = [];
    this._firedThisForeground = false;
    this._listening = false;
  }

  _read() {
    const raw = this._store.get(this._key);
    if (!raw) return null;
    try {
      const a = JSON.parse(raw);
      return a && a.link && a.createdAt ? a : null;
    } catch {
      return null;
    }
  }

  _scrub() {
    this._store.delete(this._key);
  }

  /** The pending attempt, or null. An expired attempt is scrubbed and reported as null. */
  pending() {
    const a = this._read();
    if (!a) return null;
    if (this._now() - a.createdAt > PENDING_WINDOW_MS) {
      this._scrub();
      return null;
    }
    return a;
  }

  /** Mint a fresh attempt (new secret), persist it, return the Universal Link. */
  start() {
    const p = this._mint();
    const uri = buildConnectURI(p);
    const attempt = {
      clientPubkey: p.clientPubkey.toLowerCase(),
      secret: p.secret,
      uri,
      link: universalLink(uri),
      createdAt: this._now(),
    };
    this._store.set(this._key, JSON.stringify(attempt));
    this._firedThisForeground = false;
    return attempt.link;
  }

  /** Re-fire the SAME link while the attempt is pending; otherwise start a fresh one. */
  retry() {
    const a = this.pending();
    return a ? a.link : this.start();
  }

  /** The session is live (ack received, or the resume probe answered). */
  established() {
    this._scrub();
  }

  /** The user denied in Clave, or the attempt is otherwise dead. */
  denied() {
    this._scrub();
  }

  /**
   * Called once per return-to-foreground while an attempt is pending. Send
   * your get_public_key resume probe from here; on success call established().
   * @param {(attempt: any) => void} cb
   */
  onReturn(cb) {
    this._returnCbs.push(cb);
    this._listen();
  }

  _listen() {
    if (this._listening || !this._doc || typeof this._doc.addEventListener !== 'function') return;
    this._listening = true;
    const onVisible = () => {
      const state = this._doc.visibilityState;
      if (state === 'hidden') {
        this._firedThisForeground = false;
        return;
      }
      if (state !== 'visible' && state !== undefined) return;
      if (this._firedThisForeground) return;
      const a = this.pending();
      if (!a) return;
      this._firedThisForeground = true;
      for (const cb of this._returnCbs) cb(a);
    };
    this._doc.addEventListener('visibilitychange', onVisible);
    this._doc.addEventListener('pageshow', onVisible);
  }
}
