// Curated, verifiable testimonials about Clave. Each entry is a real
// kind:1 note id; the page renders a build-time snapshot instantly, then
// live-refreshes the event + author profile and links to njump so visitors
// can verify it.
//
// Curated ids live in ./testimonial-ids.js (single source of truth, shared
// with the snapshot generator). The baked snapshot is testimonials.data.json
// — regenerate via `npm run snapshot:testimonials` after editing the ids.

import type { Event } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import { neventEncode } from 'nostr-tools/nip19';
import { getPool } from './signer';
import { SCAN_SET } from './relays';
import { TESTIMONIAL_EVENT_IDS } from './testimonial-ids.js';
import snapshot from './testimonials.data.json';

export { TESTIMONIAL_EVENT_IDS };

export interface Testimonial {
	eventId: string;
	pubkey: string;
	displayName: string;
	picture: string;
	content: string;
	nevent: string;
}

// Build-time snapshot — rendered instantly on first paint, then replaced by
// fetchTestimonials() once the live refresh resolves.
export const TESTIMONIALS_SNAPSHOT: Testimonial[] = snapshot as Testimonial[];

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
