import { describe, expect, it } from 'vitest';
import { normalizeTestimonial, cleanContent } from './testimonials';
import type { Event } from 'nostr-tools/core';

// neventEncode requires 32-byte (64-char) hex strings; use zero-padded ids.
const FAKE_ID = 'abc' + '0'.repeat(61);
const FAKE_PUBKEY = 'def' + '0'.repeat(61);
const FAKE_SIG = 'z' + '0'.repeat(127);

const ev = (over: Partial<Event> = {}): Event =>
	({
		id: FAKE_ID,
		pubkey: FAKE_PUBKEY,
		created_at: 1,
		kind: 1,
		tags: [],
		content: 'Clave is great nostr:nprofile1xxxx   really',
		sig: FAKE_SIG,
		...over
	}) as Event;

describe('cleanContent', () => {
	it('strips nostr: mentions and collapses whitespace', () => {
		expect(cleanContent(ev().content)).toBe('Clave is great really');
	});

	it('strips trailing media URLs', () => {
		expect(cleanContent('Works flawlessly! #clave https://image.nostr.build/abc.jpg')).toBe(
			'Works flawlessly! #clave'
		);
	});
});

describe('normalizeTestimonial', () => {
	it('maps an event + profile into a card model', () => {
		const t = normalizeTestimonial(ev(), { name: 'Alice', picture: 'http://x/a.png' });
		expect(t.eventId).toBe(FAKE_ID);
		expect(t.displayName).toBe('Alice');
		expect(t.picture).toBe('http://x/a.png');
		expect(t.content).toBe('Clave is great really');
		expect(t.nevent.startsWith('nevent1')).toBe(true);
	});

	it('falls back to a short pubkey when no profile name', () => {
		// pubkey padded to 64 hex chars; slice(0,10) should still be '0123456789'
		const t = normalizeTestimonial(ev({ pubkey: '0123456789abcdef' + '0'.repeat(48) }), {});
		expect(t.displayName).toBe('0123456789');
	});
});
