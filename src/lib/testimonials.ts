// Curated, verifiable testimonials about Clave. Each entry is a real
// kind:1 note id; the page fetches the live event + author profile and
// links to njump so visitors can verify it. Ships empty — backfill ids
// once sourced (via nak) and approved.

import type { Event } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import { neventEncode } from 'nostr-tools/nip19';
import { getPool } from './signer';
import { SCAN_SET } from './relays';

// Hand-picked event ids (hex) of real notes about Clave, in display order.
// Sourced from the #clave hashtag, curated to genuine user compliments and
// verified live on relays (2026-06-05). The Clave team's own note is featured
// separately (see FEATURED_NOTE in marketing.ts), so this list is user voices
// only. Add more as organic praise grows.
export const TESTIMONIAL_EVENT_IDS: readonly string[] = [
	// t0ken7 — "Running #Clave remote iOS signer flawlessly across eight clients!"
	'b2b8eb67582aca68aa97851018b616d7fe62d9699e49a420683cf694e940deb3',
	// Bfgreen — "Nice, signing web clients using #clave on iOS."
	'9bf0eed4561ead5eaad694d6434cb3524258111c0989edcfd868aecaeb27f992',
	// djmeistro — "Been using #clave with my iOS device and it's really good!"
	'864c4faf144c3b37d8abe6120e206fa55788f75b8943ae3e16c7b8c17aad138a'
];

export interface Testimonial {
	eventId: string;
	pubkey: string;
	displayName: string;
	picture: string;
	content: string;
	nevent: string;
}

export function cleanContent(content: string): string {
	return content
		.replace(/nostr:n(profile|pub|event|ote)1[a-z0-9]+/gi, '')
		.replace(/https?:\/\/\S+/gi, '') // strip URLs (trailing media links etc.)
		.replace(/\s{2,}/g, ' ')
		.trim();
}

export function normalizeTestimonial(
	event: Event,
	profile: { name?: string; display_name?: string; picture?: string }
): Testimonial {
	const displayName =
		profile.display_name || profile.name || event.pubkey.slice(0, 10);
	return {
		eventId: event.id,
		pubkey: event.pubkey,
		displayName,
		picture: profile.picture || '',
		content: cleanContent(event.content),
		nevent: neventEncode({ id: event.id, author: event.pubkey })
	};
}

const FETCH_TIMEOUT_MS = 4000;

// Fetch the curated notes + their author profiles live. Returns [] on any
// failure or when the curated list is empty — the UI degrades gracefully.
export async function fetchTestimonials(): Promise<Testimonial[]> {
	if (TESTIMONIAL_EVENT_IDS.length === 0) return [];

	const notes = await collect({ ids: [...TESTIMONIAL_EVENT_IDS] });
	if (notes.length === 0) return [];

	const authors = Array.from(new Set(notes.map((n) => n.pubkey)));
	const profileEvents = await collect({ kinds: [0], authors });
	const profiles = new Map<string, { name?: string; display_name?: string; picture?: string }>();
	for (const pe of profileEvents) {
		try {
			profiles.set(pe.pubkey, JSON.parse(pe.content));
		} catch {
			// ignore malformed kind:0
		}
	}

	// Preserve the curated order.
	const byId = new Map(notes.map((n) => [n.id, n]));
	return TESTIMONIAL_EVENT_IDS.map((id) => byId.get(id))
		.filter((n): n is Event => Boolean(n))
		.map((n) => normalizeTestimonial(n, profiles.get(n.pubkey) ?? {}));
}

function collect(filter: Filter): Promise<Event[]> {
	return new Promise((resolve) => {
		const out: Event[] = [];
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			resolve(out);
		};
		const sub = getPool().subscribeManyEose([...SCAN_SET], filter, {
			onevent: (e) => out.push(e),
			onclose: finish,
			maxWait: FETCH_TIMEOUT_MS
		});
		setTimeout(() => {
			sub.close();
			finish();
		}, FETCH_TIMEOUT_MS + 500);
	});
}
