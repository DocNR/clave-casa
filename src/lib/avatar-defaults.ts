// Default avatar URL when a user hasn't set their own kind 0 `picture`.
// Robohash deterministic robot keyed on the npub — same robot for the
// same account in every client that uses this convention.
//
// We auto-save this URL to the user's kind 0 picture on publish so that
// other Nostr clients viewing the profile also display the robot, rather
// than falling back to whatever default they happen to use (initials,
// silhouettes, etc.).

import { npubEncode } from 'nostr-tools/nip19';

export function defaultAvatarUrl(hexPubkey: string): string {
	try {
		return `https://robohash.org/${npubEncode(hexPubkey)}?size=200x200`;
	} catch {
		return '';
	}
}
