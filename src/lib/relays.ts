// Hardcoded relay sets used by clave.casa. Revisit if any of these become
// unreliable; long-term, this could pull from nostr.watch dynamically.
//
// 2026-05-01: relay.nostr.band has been flaky lately, demoted from primary
// sets. Kept in SCAN_SET because for stale-relay scans we tolerate timeouts.

export const BROADCAST_SET: readonly string[] = [
	'wss://purplepag.es', // purpose-built profile aggregator
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://nostr.wine',
	'wss://relay.primal.net'
];

// Default fallback set when a user has no NIP-65 (kind 10002).
export const DEFAULT_READ_SET: readonly string[] = [
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://purplepag.es',
	'wss://relay.primal.net'
];

// Wider set used for stale-relay scans. Picked for diversity (different
// operators, geographies). Anything paywalled or rate-limited removed.
export const SCAN_SET: readonly string[] = [
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://purplepag.es',
	'wss://relay.primal.net',
	'wss://nostr.wine',
	'wss://relay.snort.social',
	'wss://nostr.mom',
	'wss://nostr.fmt.wiz.biz',
	'wss://relay.nostr.bg',
	'wss://nostr-pub.wellorder.net',
	'wss://nostr.oxtr.dev',
	'wss://relay.nostr.band', // kept for scan tolerance
	'wss://nostr.bitcoiner.social',
	'wss://relay.plebstr.com',
	'wss://nostr.coracle.social',
	'wss://relay.nostrich.de'
];
