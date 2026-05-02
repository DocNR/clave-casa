// Three-tier publish + stale-relay scan, on top of nostr-tools' SimplePool.
//
// Tier 1: user's NIP-65 write relays (kind 10002)
// Tier 2: hardcoded broadcast set (purplepag.es etc.)
// Tier 3 (opt-in, phase 2): outbox to follower read relays

import type { Event, VerifiedEvent } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import { getActiveSigner, getPool, getStoredBunkerRelays } from './signer';
import { BROADCAST_SET, SCAN_SET, DEFAULT_READ_SET } from './relays';

// Build the union of relays we should use for read queries: the bunker URI's
// own relay (the one we just connected via — most likely to have the user's
// data) + the broadcast set + the default read set. Deduplicated.
function readDiscoveryRelays(): string[] {
	const active = getActiveSigner();
	const set = new Set<string>([
		...(active?.bunkerRelays ?? []),
		...getStoredBunkerRelays(),
		...BROADCAST_SET,
		...DEFAULT_READ_SET
	]);
	return Array.from(set);
}

export type PerRelayResult = {
	url: string;
	ok: boolean;
	error?: string;
};

export type PublishReport = {
	tier1: PerRelayResult[]; // NIP-65 write
	tier2: PerRelayResult[]; // broadcast set
};

export type ScanReport = {
	updated: PerRelayResult[]; // had stale, now fresh
	synced: string[]; // already had latest
	older: { url: string; createdAt: number }[]; // had older, rebroadcast attempted
	missing: string[]; // returned no kind 0
	offline: string[]; // timed out
};

const RELAY_TIMEOUT_MS = 5_000;

const RELAY_LIST_KIND = 10002;
const METADATA_KIND = 0;

// Read user's kind 10002 (NIP-65) and return their declared write relays.
export async function getWriteRelays(userPubkey: string): Promise<string[]> {
	const event = await fetchRelayList(userPubkey);
	if (!event) return [];
	return relayUrlsForMarker(event, 'write');
}

// Read user's kind 10002 (NIP-65) and return their declared read relays.
// Falls back to DEFAULT_READ_SET when the user hasn't published a NIP-65.
export async function getReadRelays(userPubkey: string): Promise<string[]> {
	const event = await fetchRelayList(userPubkey);
	if (!event) return [...DEFAULT_READ_SET];
	const reads = relayUrlsForMarker(event, 'read');
	return reads.length ? reads : [...DEFAULT_READ_SET];
}

function relayUrlsForMarker(event: Event, marker: 'read' | 'write'): string[] {
	const out: string[] = [];
	for (const tag of event.tags) {
		if (tag[0] !== 'r' || !tag[1]) continue;
		const m = tag[2];
		if (!m || m === marker) out.push(tag[1]);
	}
	return out;
}

async function fetchRelayList(userPubkey: string): Promise<Event | null> {
	// Look across the bunker relay (which definitely served us the connect),
	// the broadcast set (purplepag.es etc. that index profile events), and
	// the default read set. pool.get returns the first matching event.
	const filter: Filter = { kinds: [RELAY_LIST_KIND], authors: [userPubkey], limit: 1 };
	return await getPool().get(readDiscoveryRelays(), filter, { maxWait: RELAY_TIMEOUT_MS });
}

// Publish a signed event to a specific relay. Returns success/failure with reason.
async function publishToRelay(event: VerifiedEvent | Event, url: string): Promise<PerRelayResult> {
	const pool = getPool();
	try {
		const promises = pool.publish([url], event as VerifiedEvent);
		const result = await Promise.race([
			Promise.allSettled(promises),
			new Promise<'timeout'>((resolve) =>
				setTimeout(() => resolve('timeout'), RELAY_TIMEOUT_MS)
			)
		]);
		if (result === 'timeout') return { url, ok: false, error: 'timeout' };
		// pool.publish returns Promise<string>[] where string is OK reason or rejection.
		const settled = result[0];
		if (settled.status === 'fulfilled') return { url, ok: true };
		const reason =
			settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
		return { url, ok: false, error: reason };
	} catch (e) {
		return { url, ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

// Three-tier publish: tier 1 (user write relays) + tier 2 (broadcast set).
export async function publishThreeTier(
	event: VerifiedEvent,
	userPubkey: string
): Promise<PublishReport> {
	const writeRelays = await getWriteRelays(userPubkey);
	const tier1Urls = writeRelays.length ? writeRelays : [...DEFAULT_READ_SET];
	const tier2Urls = [...BROADCAST_SET].filter((u) => !tier1Urls.includes(u));

	const [tier1, tier2] = await Promise.all([
		Promise.all(tier1Urls.map((u) => publishToRelay(event, u))),
		Promise.all(tier2Urls.map((u) => publishToRelay(event, u)))
	]);

	return { tier1, tier2 };
}

// Stale-relay scan. Queries SCAN_SET for the latest kind 0 by author,
// compares to `freshest`, and rebroadcasts to any relay returning older
// or no event.
export async function scanAndRebroadcast(
	freshest: VerifiedEvent,
	userPubkey: string
): Promise<ScanReport> {
	const report: ScanReport = {
		updated: [],
		synced: [],
		older: [],
		missing: [],
		offline: []
	};
	const pool = getPool();

	const tasks = SCAN_SET.map(async (url) => {
		try {
			const filter: Filter = { kinds: [METADATA_KIND], authors: [userPubkey], limit: 1 };
			const found = await Promise.race([
				pool.get([url], filter, { maxWait: RELAY_TIMEOUT_MS }),
				new Promise<null>((resolve) => setTimeout(() => resolve(null), RELAY_TIMEOUT_MS))
			]);

			if (!found) {
				const result = await publishToRelay(freshest, url);
				if (result.ok) {
					report.missing.push(url);
					report.updated.push(result);
				} else {
					report.offline.push(url);
				}
				return;
			}

			if (found.created_at === freshest.created_at) {
				report.synced.push(url);
			} else if (found.created_at < freshest.created_at) {
				report.older.push({ url, createdAt: found.created_at });
				const result = await publishToRelay(freshest, url);
				if (result.ok) report.updated.push(result);
			} else {
				// Relay has a NEWER event — surprising but possible.
				report.synced.push(url);
			}
		} catch {
			report.offline.push(url);
		}
	});

	await Promise.all(tasks);
	return report;
}

// Fetch the latest kind 0 for the user, used to pre-fill the editor. Queries
// the user's NIP-65 read relays UNIONED with the bunker relay + broadcast
// set, since the user's actual data is most likely on the bunker relay
// regardless of what their NIP-65 declares.
export async function fetchLatestProfile(userPubkey: string): Promise<Event | null> {
	const declared = await getReadRelays(userPubkey);
	const set = new Set<string>([...declared, ...readDiscoveryRelays()]);
	const filter: Filter = { kinds: [METADATA_KIND], authors: [userPubkey], limit: 1 };
	return await getPool().get(Array.from(set), filter, { maxWait: RELAY_TIMEOUT_MS });
}

export async function hasNip65(userPubkey: string): Promise<boolean> {
	const writes = await getWriteRelays(userPubkey);
	return writes.length > 0;
}
