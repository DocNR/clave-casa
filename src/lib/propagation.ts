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

// Stale-relay scan. Queries SCAN_SET *plus* the user's own NIP-65 write
// relays *plus* any caller-provided extras (typically: relays that failed
// during the most recent Save & publish — Sync acts as the safety net for
// partial publish failures). Compares each relay's latest kind 0 to
// `freshest` and rebroadcasts where stale or missing.
export async function scanAndRebroadcast(
	freshest: VerifiedEvent,
	userPubkey: string,
	extraRelays: string[] = []
): Promise<ScanReport> {
	const report: ScanReport = {
		updated: [],
		synced: [],
		older: [],
		missing: [],
		offline: []
	};
	const pool = getPool();

	// Always retry the user's declared write relays — without this, partial
	// failures from publishThreeTier wouldn't be picked up by Sync unless
	// the failing relay happened to also be in SCAN_SET.
	const writeRelays = await getWriteRelays(userPubkey);
	const targets = Array.from(new Set([...SCAN_SET, ...writeRelays, ...extraRelays]));

	const tasks = targets.map(async (url) => {
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

// Fetch the latest kind 0 for the user, used to pre-fill the editor.
//
// Returns a tagged status so the caller can distinguish *"confirmed no kind
// 0 with this pubkey"* (`no-event` — safe to prefill defaults) from *"all
// relays failed / timed out"* (`failed` — risky to prefill, may overwrite
// existing data the user can't see). We track per-relay close reasons:
// EOSE-driven closes mean the relay actually answered "no events match";
// other close reasons (timeouts, websocket errors) mean we couldn't tell.
export type ProfileFetchResult =
	| { status: 'found'; event: Event }
	| { status: 'no-event' }
	| { status: 'failed' };

// Tiered: Pass 1 queries the narrow set (NIP-65 reads + bunker URI relay +
// broadcast set, ~6 relays). If that returns `'found'` we're done — typical
// load is unchanged at ~1s. If Pass 1 came up empty/errored, Pass 2 retries
// with SCAN_SET (16 relays) — adds ~5s but prevents silent data loss for
// users whose kind:0 lives on uncommon relays (e.g. nostr.wine, mom, oxtr,
// nostr.band — none in the default read set).
//
// The motivating bug: external tester reported clave.casa wiping their PFP
// + banner after editing one field, because their kind:0 lived only on
// relays outside the narrow set, fetch returned `no-event`, form populated
// with empty fields + Robohash prefill, save published a fresh kind:0
// missing the banner/picture they actually had.
export async function fetchLatestProfile(userPubkey: string): Promise<ProfileFetchResult> {
	// Pass 1: narrow set (current behavior — declared NIP-65 reads + bunker
	// URI relay + broadcast set).
	const declared = await getReadRelays(userPubkey);
	const narrow = Array.from(new Set([...declared, ...readDiscoveryRelays()]));
	const first = await fetchKind0OnRelays(userPubkey, narrow);
	if (first.status === 'found') return first;

	// Pass 2: wider SCAN_SET only if Pass 1 came up empty or errored.
	const wider = Array.from(new Set([...SCAN_SET, ...narrow]));
	const second = await fetchKind0OnRelays(userPubkey, wider);
	if (second.status === 'found') return second;
	// `failed` carries more uncertainty than `no-event` — if either pass
	// hit `failed`, surface that so the caller refuses to publish.
	if (first.status === 'failed' || second.status === 'failed') {
		return { status: 'failed' };
	}
	return { status: 'no-event' };
}

async function fetchKind0OnRelays(
	userPubkey: string,
	relays: string[]
): Promise<ProfileFetchResult> {
	const filter: Filter = { kinds: [METADATA_KIND], authors: [userPubkey], limit: 1 };
	const maxWait = RELAY_TIMEOUT_MS;

	return new Promise((resolve) => {
		let foundEvent: Event | null = null;
		let settled = false;

		const finish = (result: ProfileFetchResult) => {
			if (settled) return;
			settled = true;
			resolve(result);
		};

		const sub = getPool().subscribeManyEose(relays, filter, {
			onevent: (e) => {
				if (!foundEvent || (e.created_at ?? 0) > (foundEvent.created_at ?? 0)) {
					foundEvent = e;
				}
			},
			onclose: (reasons) => {
				if (foundEvent) {
					finish({ status: 'found', event: foundEvent });
					return;
				}
				// Reasons array is one entry per relay (in input order). EOSE is
				// the clean "no events" signal; anything else means we couldn't
				// confirm.
				const cleanCount = reasons.filter(
					(r) => r === 'closed by caller' || /eose/i.test(r ?? '')
				).length;
				finish({ status: cleanCount > 0 ? 'no-event' : 'failed' });
			},
			maxWait
		});

		// Safety net: if onclose somehow doesn't fire within the wait window
		// (rare, but websocket libraries vary), resolve based on what we have.
		setTimeout(() => {
			if (settled) return;
			sub.close();
			if (foundEvent) finish({ status: 'found', event: foundEvent });
			else finish({ status: 'failed' });
		}, maxWait + 1000);
	});
}

export async function hasNip65(userPubkey: string): Promise<boolean> {
	const writes = await getWriteRelays(userPubkey);
	return writes.length > 0;
}
