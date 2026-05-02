// Default avatar URL when a user hasn't set their own kind 0 `picture`.
// Robohash deterministic robot (or monster / kitten / abstract / human,
// per user-chosen style) keyed on the npub — same image for the same
// account in every client that uses this convention.
//
// We prefill the picture URL field with this on load (when kind 0 has
// no picture). Save publishes whatever's in the field — including empty,
// so users who want no PFP can clear it.

import { npubEncode } from 'nostr-tools/nip19';

export type RobohashSet = 'set1' | 'set2' | 'set3' | 'set4' | 'set5';

export const ROBOHASH_SETS: { id: RobohashSet; label: string }[] = [
	{ id: 'set1', label: 'Robots' },
	{ id: 'set2', label: 'Monsters' },
	{ id: 'set3', label: 'Abstract' },
	{ id: 'set4', label: 'Kittens' },
	{ id: 'set5', label: 'Humans' }
];

export const ROBOHASH_SET_KEY = 'clave-casa.robohashSet.v1';

export function getRobohashSet(): RobohashSet {
	if (typeof localStorage === 'undefined') return 'set1';
	const stored = localStorage.getItem(ROBOHASH_SET_KEY) as RobohashSet | null;
	return stored && ROBOHASH_SETS.some((s) => s.id === stored) ? stored : 'set1';
}

export function setRobohashSet(set: RobohashSet) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(ROBOHASH_SET_KEY, set);
	// Notify Avatar instances to re-derive their effectivePicture.
	window.dispatchEvent(new StorageEvent('storage', { key: ROBOHASH_SET_KEY }));
}

// Build the per-account Robohash URL. Optional `set` overrides the stored
// preference (used by the picker so a hovered/clicked option can preview
// without persisting until commit).
export function defaultAvatarUrl(hexPubkey: string, set?: RobohashSet): string {
	try {
		const useSet = set ?? getRobohashSet();
		return `https://robohash.org/${npubEncode(hexPubkey)}?size=200x200&set=${useSet}`;
	} catch {
		return '';
	}
}

// True when the URL points at robohash.org. Used to decide whether to show
// the style picker (only relevant when the user is using a Robohash) and
// whether to regenerate the URL when they change style.
export function isRobohashUrl(url: string): boolean {
	return /^https?:\/\/(www\.)?robohash\.org\//i.test(url);
}
