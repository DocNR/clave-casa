// Build-time snapshot generator for testimonials.
//
// Fetches the curated #clave notes + their authors' profiles from relays and
// writes src/lib/testimonials.data.json — a static snapshot the landing page
// renders INSTANTLY (no spinner, no runtime relay round-trip on first paint).
// The page still live-refreshes in the background, so this is just the seed.
//
// Run after editing src/lib/testimonial-ids.js:
//   npm run snapshot:testimonials
// then commit the regenerated testimonials.data.json.

import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import { neventEncode } from 'nostr-tools/nip19';
import WebSocket from 'ws';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { TESTIMONIAL_EVENT_IDS } from '../src/lib/testimonial-ids.js';

useWebSocketImplementation(WebSocket);

const RELAYS = [
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://relay.primal.net',
	'wss://purplepag.es',
	'wss://nostr.wine'
];

// Mirror of cleanContent() in src/lib/testimonials.ts — keep in sync.
function cleanContent(content) {
	return content
		.replace(/nostr:n(profile|pub|event|ote)1[a-z0-9]+/gi, '')
		.replace(/https?:\/\/\S+/gi, '')
		.replace(/\s+([.,!?;:])/g, '$1')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../src/lib/testimonials.data.json');
const ids = [...TESTIMONIAL_EVENT_IDS];

const pool = new SimplePool();
try {
	const notes = await pool.querySync(RELAYS, { ids });
	const byId = new Map(notes.map((n) => [n.id, n]));

	const authors = [...new Set(notes.map((n) => n.pubkey))];
	const profileEvents = authors.length ? await pool.querySync(RELAYS, { kinds: [0], authors }) : [];
	const profiles = new Map();
	for (const pe of profileEvents) {
		const existing = profiles.get(pe.pubkey);
		if (!existing || pe.created_at > existing._ts) {
			try {
				profiles.set(pe.pubkey, { ...JSON.parse(pe.content), _ts: pe.created_at });
			} catch {
				// ignore malformed kind:0
			}
		}
	}

	const out = ids
		.map((id) => byId.get(id))
		.filter(Boolean)
		.map((n) => {
			const p = profiles.get(n.pubkey) || {};
			return {
				eventId: n.id,
				pubkey: n.pubkey,
				displayName: p.display_name || p.name || n.pubkey.slice(0, 10),
				picture: p.picture || '',
				content: cleanContent(n.content),
				nevent: neventEncode({ id: n.id, author: n.pubkey })
			};
		});

	if (out.length < ids.length) {
		console.warn(`⚠️  Only resolved ${out.length}/${ids.length} notes — relays may be slow. Re-run if needed.`);
	}

	writeFileSync(outPath, JSON.stringify(out, null, '\t') + '\n');
	console.log(`✅ Wrote ${out.length} testimonials → ${outPath}`);
} finally {
	pool.close(RELAYS);
}

process.exit(0);
