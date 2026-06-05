// Curated #clave testimonial note ids (hex), in display order.
// Single source of truth: consumed by the build-time snapshot generator
// (scripts/snapshot-testimonials.mjs) and the runtime live-refresh in
// testimonials.ts. To add a testimonial: append its id here, then run
// `npm run snapshot:testimonials` and commit the regenerated
// src/lib/testimonials.data.json.
//
// Sourced from the #clave hashtag, curated to genuine user compliments and
// verified live on relays. The Clave team's own note is featured separately
// (FEATURED_NOTE in marketing.ts), so this list is user voices only.

/** @type {readonly string[]} */
export const TESTIMONIAL_EVENT_IDS = [
	// t0ken7 — "Running #Clave remote iOS signer flawlessly across eight clients!"
	'b2b8eb67582aca68aa97851018b616d7fe62d9699e49a420683cf694e940deb3',
	// Bfgreen — "Nice, signing web clients using #clave on iOS."
	'9bf0eed4561ead5eaad694d6434cb3524258111c0989edcfd868aecaeb27f992',
	// djmeistro — "Been using #clave with my iOS device and it's really good!"
	'864c4faf144c3b37d8abe6120e206fa55788f75b8943ae3e16c7b8c17aad138a'
];
