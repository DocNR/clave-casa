<!-- A single featured Clave-team note, shown as a standalone statement right
     after the hero. Rendered from static constants (always shows instantly),
     but links to the real Nostr note so it stays verifiable. -->
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import { FEATURED_NOTE } from '$lib/marketing';

	const clave = '/clave-icon.png';
</script>

<section class="relative overflow-hidden px-6 py-20 md:py-24">
	<div
		class="spotlight spotlight-violet pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[55vh] w-[55vh] -translate-x-1/2 -translate-y-1/2"
	></div>

	<figure use:reveal class="mx-auto max-w-3xl text-center">
		<blockquote
			class="font-display text-[clamp(1.75rem,4.5vw,3.25rem)] font-bold leading-[1.1]"
			style="color: var(--m-text)"
		>
			{FEATURED_NOTE.lead}
			<span class="gradient-text">{FEATURED_NOTE.emphasis}</span>
		</blockquote>

		<figcaption class="mt-7 flex items-center justify-center gap-2.5">
			<img src={clave} alt="" class="h-7 w-7 rounded-[8px]" />
			<span class="text-sm font-semibold" style="color: var(--m-text)">{FEATURED_NOTE.author}</span>
			<span aria-hidden="true" style="color: var(--m-text-dim)">·</span>
			<a
				href={FEATURED_NOTE.verifyUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm hover:underline"
				style="color: var(--m-text-muted)"
			>
				verified on Nostr ↗
			</a>
		</figcaption>
	</figure>
</section>
