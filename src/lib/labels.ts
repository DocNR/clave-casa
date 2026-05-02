// src/lib/labels.ts
//
// Single source of truth for human-readable account labels. Mirrors Clave
// iOS `Account.displayLabel` (design-system.md §7) — petname → displayName
// → pubkey-prefix. Use this everywhere we render an account name; never
// inline the chain.

import { npubEncode } from 'nostr-tools/nip19';
import type { Connection } from './connections';

export type LabelInputs = {
	/** Connection record (its `label` field is the petname). */
	connection?: Connection | null;
	/** Kind 0 profile, if loaded. Accepts NIP-24 `display_name` and the
	 *  deprecated camelCase `displayName` alias for forward compat. */
	profile?: { name?: string; display_name?: string; displayName?: string } | null;
	/** Pubkey hex — required as the final fallback. */
	pubkeyHex: string;
};

/**
 * Resolve a human-readable label for an account.
 *
 * Precedence (matches Clave iOS `Account.displayLabel`):
 *   1. Connection.label (the petname the user gave when pairing)
 *   2. profile.display_name / displayName (NIP-24 / deprecated alias)
 *   3. profile.name (NIP-01)
 *   4. npub-prefix(12) — bech32-encoded; readable in mixed contexts
 */
export function displayLabel(inputs: LabelInputs): string {
	const { connection, profile, pubkeyHex } = inputs;
	if (connection?.label && connection.label.trim()) return connection.label.trim();
	const dn = profile?.display_name || profile?.displayName;
	if (dn && dn.trim()) return dn.trim();
	if (profile?.name && profile.name.trim()) return profile.name.trim();
	try {
		return npubEncode(pubkeyHex).slice(0, 12);
	} catch {
		return pubkeyHex.slice(0, 8);
	}
}
