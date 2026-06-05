<script lang="ts">
	import { onMount } from 'svelte';
	import { reveal } from '$lib/actions/reveal';
	import { PALETTE } from '$lib/theme';
	import { fetchTestimonials, TESTIMONIALS_SNAPSHOT, type Testimonial } from '$lib/testimonials';

	// Render the build-time snapshot instantly (no spinner, no wait), then
	// quietly swap in the live result once the relay refresh resolves.
	let items = $state<Testimonial[]>(TESTIMONIALS_SNAPSHOT);

	onMount(async () => {
		const fresh = await fetchTestimonials();
		if (fresh.length > 0) items = fresh;
	});

	const tilts = [-1, 1.2, -0.8, 0.6, -1.4, 0.9];
</script>

{#if items.length > 0}
	<section id="love" class="relative overflow-hidden px-6 py-24 md:py-32">
		<div class="spotlight spotlight-violet pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[60vh] w-[60vh] -translate-x-1/2"></div>
		<div class="mx-auto max-w-6xl">
			<div use:reveal class="mb-14 text-center">
				<p class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style="color: var(--m-text-muted)">From people already on it</p>
				<h2 class="font-display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
					Don't just take <span class="gradient-text">our word</span> for it.
				</h2>
				<p class="mx-auto mt-4 max-w-md text-[15px]" style="color: var(--m-text-muted)">
					Every quote is a real, verifiable note loaded live from the Nostr network — in your browser.
				</p>
			</div>

			<div class="columns-1 gap-5 md:columns-2 lg:columns-3">
				{#each items as t, i (t.eventId)}
					{@const theme = PALETTE[i % PALETTE.length]}
					<a
						use:reveal={{ delay: i * 40 }}
						href={`https://njump.me/${t.nevent}`}
						target="_blank"
						rel="noopener noreferrer"
						class="tilt-card mb-5 block break-inside-avoid rounded-3xl border p-6"
						style="border-color: var(--m-border); background: var(--m-surface); transform: rotate({tilts[i % tilts.length]}deg);"
					>
						<div class="mb-4 -mx-6 -mt-6 rounded-t-3xl px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style="background: linear-gradient(120deg, {theme.start}26, transparent); color: var(--m-text-muted)">
							A real note about Clave
						</div>
						<p class="mb-5 text-[15px] leading-[1.7]" style="color: var(--m-text)">"{t.content}"</p>
						<div class="flex items-center gap-2.5">
							{#if t.picture}
								<img src={t.picture} alt="" loading="lazy" class="h-8 w-8 rounded-full border object-cover" style="border-color: var(--m-border-2)" />
							{/if}
							<span class="text-xs font-semibold" style="color: var(--m-text-muted)">{t.displayName}</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}
