// NIP-46 client + relay pool, built on nostr-tools.
//
// Why nostr-tools and not NDK: nostr-tools' BunkerSigner accepts both the
// "ack" and "echoed-secret" connect responses (Clave currently sends the
// latter for legacy NIP-46 compatibility). NDK 3.x rejects everything except
// "ack", which manifested as our "couldn't connect undefined" error.
//
// Lazy relay management: we don't preload broadcast relays into the pool.
// The bunker URI's relay is opened during connect, and other relays are
// added by the propagation layer only when actually publishing/fetching.

import { SimplePool } from 'nostr-tools/pool';
import {
	BunkerSigner,
	createNostrConnectURI,
	parseBunkerInput,
	type BunkerPointer
} from 'nostr-tools/nip46';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import * as nip04 from 'nostr-tools/nip04';
import * as nip44 from 'nostr-tools/nip44';
import type { Event, EventTemplate, VerifiedEvent } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';

let pool: SimplePool | undefined;
let activeSigner: BunkerSigner | undefined;
let activeUserPubkey: string | undefined;
let activeBunkerRelays: string[] = [];
let activeBp: BunkerPointer | undefined;
let activeLocalKey: Uint8Array | undefined;

export function getPool(): SimplePool {
	if (!pool) pool = new SimplePool();
	return pool;
}

export function getActiveSigner():
	| { signer: BunkerSigner; userPubkey: string; bunkerRelays: string[] }
	| undefined {
	if (!activeSigner || !activeUserPubkey) return undefined;
	return { signer: activeSigner, userPubkey: activeUserPubkey, bunkerRelays: activeBunkerRelays };
}

// Synchronously extract bunker relay URLs from the active connection's URI
// without requiring a running BunkerSigner. Used by the propagation layer
// for reads (profile fetch, NIP-65 lookup) so the bunker relay is in the
// query set even before a signer is established.
export function getStoredBunkerRelays(): string[] {
	if (typeof localStorage === 'undefined') return [];
	const raw = localStorage.getItem('clave-casa.connections.v1');
	const activePubkey = localStorage.getItem('clave-casa.activeAccount.v1');
	if (!raw || !activePubkey) return [];
	try {
		const all = JSON.parse(raw) as Array<{ accountPubkey: string; bunkerUri: string }>;
		const conn = Array.isArray(all)
			? all.find((c) => c.accountPubkey === activePubkey)
			: undefined;
		if (!conn) return [];
		const m = conn.bunkerUri.match(/^bunker:\/\/[0-9a-fA-F]{64}\?(.*)$/);
		if (!m) return [];
		const params = new URLSearchParams(m[1]);
		return params.getAll('relay');
	} catch {
		return [];
	}
}

// Re-export for stable import path; we accept the same set of inputs as
// nostr-tools' parseBunkerInput (bunker:// URLs and NIP-05 identifiers).
export { parseBunkerInput };
export type { BunkerPointer };

export type ConnectStage =
	| 'parsing'
	| 'opening-relay'
	| 'sending-connect'
	| 'awaiting-ack'
	| 'fetching-pubkey'
	| 'ready';

export type ConnectOptions = {
	timeoutMs?: number;
	onStage?: (stage: ConnectStage, detail?: string) => void;
};

export type StoredConnection = {
	accountPubkey: string; // user pubkey (filled in after connect)
	bunkerUri: string;
	label?: string;
	addedAt: number;
};

const DEFAULT_CONNECT_TIMEOUT_MS = 45_000;

// Establish a NIP-46 signer from a stored connection. The local NIP-46 keypair
// is persisted per *bunker pubkey* so reloads don't force a re-pair.
export async function connectSigner(
	conn: StoredConnection,
	opts: ConnectOptions = {}
): Promise<{ signer: BunkerSigner; userPubkey: string; bp: BunkerPointer }> {
	const { timeoutMs = DEFAULT_CONNECT_TIMEOUT_MS, onStage } = opts;
	const stage = (s: ConnectStage, detail?: string) => {
		console.debug('[clave.casa] connect stage:', s, detail ?? '');
		onStage?.(s, detail);
	};

	stage('parsing');
	const bp = await parseBunkerInput(conn.bunkerUri);
	if (!bp) throw new Error('Invalid bunker URI');

	const localKey = loadOrCreateLocalKey(bp.pubkey);
	const localPubkey = getPublicKey(localKey);
	console.debug('[clave.casa] local pubkey (what Clave sees as the client):', localPubkey);

	stage('opening-relay', bp.relays.join(', '));
	const p = getPool();
	// Touch the relays to prompt connection; nostr-tools will lazily open.
	await Promise.all(
		bp.relays.map((url) =>
			p.ensureRelay(url, { connectionTimeout: 5_000 }).catch((e: unknown) => {
				console.warn('[clave.casa] relay connect failed:', url, e);
			})
		)
	);

	const signer = BunkerSigner.fromBunker(localKey, bp, {
		pool: p,
		onauth: (url: string) => {
			console.warn('[clave.casa] bunker auth_url:', url);
		}
	});

	stage('sending-connect', `bunker=${bp.pubkey.slice(0, 8)}…`);
	stage('awaiting-ack');
	const connectPromise = signer.connect();
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(
			() =>
				reject(
					new Error(
						`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the signer to acknowledge. ` +
							`Things to check: (1) your signer app is open and online, ` +
							`(2) the bunker URI hasn't been used elsewhere already, ` +
							`(3) the relay ${bp.relays.join(', ')} is reachable from this browser.`
					)
				),
			timeoutMs
		)
	);
	await Promise.race([connectPromise, timeoutPromise]);

	stage('fetching-pubkey');
	const userPubkey = await signer.getPublicKey();
	stage('ready', userPubkey);

	activeSigner = signer;
	activeUserPubkey = userPubkey;
	activeBunkerRelays = [...bp.relays];
	activeBp = bp;
	activeLocalKey = localKey;

	// Fire-and-forget: publish a kind 0 for the local NIP-46 client key so
	// Clave (and any signer that resolves names via kind 0 lookup) shows
	// "Clave.Casa" instead of the bare npub. One-time per local key.
	void publishClientIdentityIfNeeded(localKey, bp.relays);

	return { signer, userPubkey, bp };
}

// Default relays for the nostrconnect:// flow. These are the relays the
// nostrconnect URI advertises — the signer needs to monitor at least one
// of them to see our connect request. Multi-relay choice maximizes the
// chance any signer (Clave, Amber, nsec.app, …) sees us. Clave's primary
// is included so Clave users get a fast hop.
const NOSTRCONNECT_RELAYS: readonly string[] = [
	'wss://relay.nsec.app',
	'wss://relay.damus.io',
	'wss://relay.powr.build'
];

// Establish a NIP-46 signer via the nostrconnect:// flow — we generate a
// nostrconnect URI, the user scans/pastes it into their signer, the signer
// publishes a connect response back to our local pubkey on the advertised
// relays, and BunkerSigner.fromURI resolves with a working signer.
export type NostrConnectOptions = {
	timeoutMs?: number;
	onUri?: (uri: string) => void;
	onStage?: (stage: ConnectStage, detail?: string) => void;
	signal?: AbortSignal;
	clientName?: string;
};

export async function connectViaNostrConnect(
	opts: NostrConnectOptions = {}
): Promise<{ signer: BunkerSigner; userPubkey: string; bp: BunkerPointer; uri: string }> {
	const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
	const stage = (s: ConnectStage, detail?: string) => {
		console.debug('[clave.casa] nostrconnect stage:', s, detail ?? '');
		opts.onStage?.(s, detail);
	};

	stage('parsing');
	const localKey = generateSecretKey();
	const localPubkey = getPublicKey(localKey);
	const secret = bytesToHex(generateSecretKey()).slice(0, 16);

	const uri = createNostrConnectURI({
		clientPubkey: localPubkey,
		relays: [...NOSTRCONNECT_RELAYS],
		secret,
		name: opts.clientName ?? 'clave.casa',
		url: typeof location !== 'undefined' ? location.origin : 'https://clave.casa'
	});

	stage('opening-relay', NOSTRCONNECT_RELAYS.join(', '));
	opts.onUri?.(uri);

	stage('awaiting-ack');
	const p = getPool();
	const signer = await BunkerSigner.fromURI(localKey, uri, { pool: p }, opts.signal ?? timeoutMs);

	stage('fetching-pubkey');
	const userPubkey = await signer.getPublicKey();
	const bp: BunkerPointer = signer.bp;
	stage('ready', userPubkey);

	// Persist the local key under the *bunker* pubkey we just learned so a
	// subsequent reload via connectSigner can find it. Matches the bunker://
	// flow's persistence model.
	const LOCAL_KEY_PREFIX = 'clave-casa.localKey.';
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(LOCAL_KEY_PREFIX + bp.pubkey, bytesToHex(localKey));
	}

	activeSigner = signer;
	activeUserPubkey = userPubkey;
	activeBunkerRelays = [...bp.relays];
	activeBp = bp;
	activeLocalKey = localKey;

	// Fire-and-forget kind 0 publish — see connectSigner for rationale. The
	// nostrconnect URI already carried `name: clave.casa`, so this is mainly
	// belt-and-suspenders for signers that prefer kind 0 lookup over URI
	// metadata. Same per-local-key dedupe applies.
	void publishClientIdentityIfNeeded(localKey, bp.relays);

	return { signer, userPubkey, bp, uri };
}

// Sign an event with retry-on-approval-pending. The first sign of a given
// kind from a fresh connection often returns "permission denied" while the
// signer queues the request for user approval. We retry on a fixed schedule
// so the user sees "Waiting for approval…" instead of a confusing error.
export type SignAwaitOptions = {
	maxWaitMs?: number; // total budget across all retries (default 2 min)
	retryDelayMs?: number; // delay between retries (default 8s)
	onWait?: (attempt: number, elapsedMs: number) => void;
};

const PERMISSION_ERROR_PATTERNS = [
	/permission denied/i,
	/permission not granted/i,
	/not authorized/i,
	/awaiting approval/i,
	/queued for approval/i
];

function isPermissionPendingError(msg: string): boolean {
	return PERMISSION_ERROR_PATTERNS.some((p) => p.test(msg));
}

export async function signWithApprovalWait<T>(
	doSign: () => Promise<T>,
	opts: SignAwaitOptions = {}
): Promise<T> {
	const maxWaitMs = opts.maxWaitMs ?? 120_000;
	const retryDelayMs = opts.retryDelayMs ?? 8_000;
	const startedAt = Date.now();
	let attempt = 0;
	let lastError: unknown;

	while (Date.now() - startedAt < maxWaitMs) {
		attempt += 1;
		try {
			return await doSign();
		} catch (e) {
			lastError = e;
			const msg = e instanceof Error ? e.message : String(e);
			if (!isPermissionPendingError(msg)) throw e;
			opts.onWait?.(attempt, Date.now() - startedAt);
			const remaining = maxWaitMs - (Date.now() - startedAt);
			if (remaining < retryDelayMs) break;
			await new Promise((r) => setTimeout(r, retryDelayMs));
		}
	}
	throw (
		lastError ??
		new Error(`Timed out waiting for approval after ${Math.round(maxWaitMs / 1000)}s`)
	);
}

// signEventViaBunker — kind 24133 sign_event RPC that handles Clave's
// two-stage response pattern. Sends one request, subscribes to ALL responses
// on the same request ID, loops past intermediate "permission_denied"/queued
// responses, and resolves only when a signed event arrives.
//
// Why we don't use BunkerSigner.signEvent: nostr-tools' RPC resolves on the
// FIRST response with a matching request ID and removes the listener. When
// Clave returns "Permission denied — open Clave to approve" first and the
// signed event later (after user taps Approve), the second response is
// dropped. Our subscription stays alive until success or timeout.

export type ApprovalProgressCallback = (info: {
	stage: 'sent' | 'pending' | 'signed';
	startedAt: number;
}) => void;

export async function signEventViaBunker(
	template: EventTemplate,
	opts: {
		timeoutMs?: number;
		onProgress?: ApprovalProgressCallback;
	} = {}
): Promise<VerifiedEvent> {
	const active = getActiveSigner();
	if (!active) throw new Error('No active signer');
	const bp = activeBp;
	if (!bp) throw new Error('Active signer has no bunker pointer');
	const localKey = activeLocalKey;
	if (!localKey) throw new Error('Active signer has no local key');

	const timeoutMs = opts.timeoutMs ?? 120_000;
	const startedAt = Date.now();
	const requestId = generateRequestId();
	const localPubkey = getPublicKey(localKey);

	const requestPayload = JSON.stringify({
		id: requestId,
		method: 'sign_event',
		params: [JSON.stringify(template)]
	});

	// Encrypt with the same scheme the active signer is using. We track this
	// on the signer module — most modern bunkers use NIP-44; Clave auto-detects
	// based on the request encryption.
	const encrypted = nip44.v2.encrypt(
		requestPayload,
		nip44.v2.utils.getConversationKey(localKey, bp.pubkey)
	);

	const requestEvent: VerifiedEvent = finalizeEvent(
		{
			kind: 24133,
			content: encrypted,
			tags: [['p', bp.pubkey]],
			created_at: Math.floor(Date.now() / 1000)
		},
		localKey
	);

	const pool = getPool();

	return new Promise<VerifiedEvent>((resolve, reject) => {
		let settled = false;
		const settle = (fn: () => void) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			sub.close();
			fn();
		};

		const timer = setTimeout(() => {
			settle(() =>
				reject(
					new Error(
						`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for signer response. ` +
							`If you see an approval prompt in Clave, tap Approve or Always allow.`
					)
				)
			);
		}, timeoutMs);

		const filter: Filter = {
			kinds: [24133],
			'#p': [localPubkey],
			since: requestEvent.created_at - 5
		};

		const sub = pool.subscribeMany(bp.relays, filter, {
			onevent: async (event: Event) => {
				if (event.pubkey !== bp.pubkey) return;
				let plaintext: string;
				try {
					plaintext = await tryDecrypt(event.content, localKey, bp.pubkey);
				} catch {
					return; // can't decrypt — not for us
				}
				let parsed: { id?: string; result?: string; error?: string };
				try {
					parsed = JSON.parse(plaintext);
				} catch {
					return;
				}
				if (parsed.id !== requestId) return;

				// Permission-denied / queued / auth-url: keep listening
				if (parsed.error || parsed.result === 'auth_url' || !parsed.result) {
					if (parsed.error) {
						console.debug('[clave.casa] sign_event intermediate response:', parsed.error);
						opts.onProgress?.({ stage: 'pending', startedAt });
					}
					return;
				}

				// Success — parse signed event
				let signed: VerifiedEvent;
				try {
					signed = JSON.parse(parsed.result) as VerifiedEvent;
				} catch (e) {
					settle(() => reject(new Error(`Bunker returned malformed result: ${e}`)));
					return;
				}
				opts.onProgress?.({ stage: 'signed', startedAt });
				settle(() => resolve(signed));
			},
			onclose: () => {
				if (!settled) {
					settle(() => reject(new Error('Subscription closed before signer responded')));
				}
			}
		});

		opts.onProgress?.({ stage: 'sent', startedAt });
		// Publish the request — fire and forget, the response arrives on the subscription
		Promise.allSettled(pool.publish(bp.relays, requestEvent)).catch(() => {
			// Errors here surface via timeout if no response arrives
		});
	});
}

// Try NIP-44 first, then fall back to NIP-04. Mirrors Clave's auto-detect.
async function tryDecrypt(
	ciphertext: string,
	privateKey: Uint8Array,
	otherPubkey: string
): Promise<string> {
	// NIP-04 envelopes contain "?iv=" — use that as a sniff
	if (ciphertext.includes('?iv=')) {
		return await nip04.decrypt(privateKey, otherPubkey, ciphertext);
	}
	const conversationKey = nip44.v2.utils.getConversationKey(privateKey, otherPubkey);
	return nip44.v2.decrypt(ciphertext, conversationKey);
}

function generateRequestId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function disconnectActiveSigner() {
	if (activeSigner) {
		try {
			await activeSigner.close();
		} catch {
			// ignore
		}
	}
	activeSigner = undefined;
	activeUserPubkey = undefined;
	activeBunkerRelays = [];
	activeBp = undefined;
	activeLocalKey = undefined;
}

// Per-bunker-pubkey local NIP-46 keypair. The local signer is the ephemeral
// keypair the web client uses for NIP-46 wire encryption — NOT the user's
// identity. Keyed by bunker pubkey because that's what we know from the URI
// alone (user pubkey is only revealed after the connect handshake succeeds).
const LOCAL_KEY_PREFIX = 'clave-casa.localKey.';

function loadOrCreateLocalKey(bunkerPubkey: string): Uint8Array {
	const k = LOCAL_KEY_PREFIX + bunkerPubkey;
	const stored = localStorage.getItem(k);
	if (stored) {
		try {
			return hexToBytes(stored);
		} catch {
			// fall through to regenerate
		}
	}
	const fresh = generateSecretKey();
	localStorage.setItem(k, bytesToHex(fresh));
	return fresh;
}

export function clearLocalKey(bunkerPubkey: string) {
	localStorage.removeItem(LOCAL_KEY_PREFIX + bunkerPubkey);
}

// Publish a kind 0 metadata event for the local NIP-46 client keypair so the
// signer can resolve "who is this connecting client?" via standard pubkey
// lookup. Without this, signers see only the bare client npub for bunker://
// pairs (the nostrconnect:// flow already carries `name` in the URI itself,
// but bunker:// has no equivalent — the signer generated the URI and learned
// nothing about us).
//
// One kind 0 per local key. Local keys are scoped per-bunker-pubkey
// (loadOrCreateLocalKey), so this fires once per unique pairing — subsequent
// reloads reuse the cached key and skip the publish via the localStorage flag.
//
// Fire and forget: relay-publish errors don't block the connect flow. Failure
// just leaves the flag unset so the next connect retries.
const KIND0_PUBLISHED_PREFIX = 'clave-casa.localKeyKind0Published.';

const CLAVE_CASA_PROFILE = {
	// NIP-01 username handle. Most clients fall back to this if `display_name`
	// is unset. We keep it lowercase to match the domain.
	name: 'clave.casa',
	// NIP-24 display name. Capitalized form for friendlier in-app rendering.
	display_name: 'Clave.Casa',
	about: 'Web companion to Clave — kind 0 profile editor at https://clave.casa',
	website: 'https://clave.casa'
} as const;

async function publishClientIdentityIfNeeded(
	localKey: Uint8Array,
	relays: string[]
): Promise<void> {
	if (typeof localStorage === 'undefined') return;
	if (relays.length === 0) return;
	const localPubkey = getPublicKey(localKey);
	const flagKey = KIND0_PUBLISHED_PREFIX + localPubkey;
	if (localStorage.getItem(flagKey)) return;

	const event: VerifiedEvent = finalizeEvent(
		{
			kind: 0,
			content: JSON.stringify(CLAVE_CASA_PROFILE),
			tags: [],
			created_at: Math.floor(Date.now() / 1000)
		},
		localKey
	);

	try {
		await Promise.allSettled(getPool().publish(relays, event));
		localStorage.setItem(flagKey, '1');
		console.debug(
			'[clave.casa] published client-identity kind 0 for local key',
			localPubkey.slice(0, 8) + '…'
		);
	} catch (e) {
		// Don't set the flag — next connect retries.
		console.warn('[clave.casa] failed to publish client-identity kind 0:', e);
	}
}
