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
import { BunkerSigner, parseBunkerInput, type BunkerPointer } from 'nostr-tools/nip46';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';

let pool: SimplePool | undefined;
let activeSigner: BunkerSigner | undefined;
let activeUserPubkey: string | undefined;
let activeBunkerRelays: string[] = [];

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
	return { signer, userPubkey, bp };
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
