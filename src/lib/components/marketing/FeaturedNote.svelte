<!-- The featured Clave note, rendered to look like a real Nostr post (header
     with avatar + author, body, footer) and centered after the hero. Built
     from static constants so it always shows instantly, but the footer links
     to the original note so it stays verifiable. -->
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import { FEATURED_NOTE } from '$lib/marketing';

	const clave = '/clave-icon.png';
</script>

<section class="relative overflow-hidden px-6 py-20 md:py-24">
	<div
		class="spotlight spotlight-violet pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[55vh] w-[55vh] -translate-x-1/2 -translate-y-1/2"
	></div>

	<figure
		use:reveal
		class="mx-auto max-w-xl rounded-3xl border p-7 md:p-8"
		style="border-color: var(--m-border-2); background: var(--m-surface); box-shadow: 0 24px 60px -28px rgba(89,46,255,0.55);"
	>
		<!-- post header -->
		<div class="flex items-center gap-3">
			<img src={clave} alt="" class="h-11 w-11 rounded-full border" style="border-color: var(--m-border-2)" />
			<div class="min-w-0 leading-tight">
				<div class="flex items-center gap-1.5">
					<span class="text-[15px] font-semibold" style="color: var(--m-text)">{FEATURED_NOTE.author}</span>
					<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="h-4 w-4" style="color: var(--m-violet)">
						<path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
					</svg>
				</div>
				<span class="text-[13px]" style="color: var(--m-text-dim)">on Nostr</span>
			</div>
		</div>

		<!-- post body -->
		<blockquote
			class="font-display mt-5 text-[clamp(1.5rem,3.4vw,2.4rem)] font-bold leading-[1.15]"
			style="color: var(--m-text)"
		>
			{FEATURED_NOTE.lead}
			<span class="gradient-text">{FEATURED_NOTE.emphasis}</span>
			<span style="color: var(--m-violet)">{FEATURED_NOTE.hashtag}</span>
		</blockquote>

		<!-- post footer -->
		<figcaption class="mt-6 flex items-center justify-between border-t pt-4 text-sm" style="border-color: var(--m-border)">
			<span style="color: var(--m-text-dim)">A real note from the Clave team</span>
			<a
				href={FEATURED_NOTE.verifyUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium hover:underline"
				style="color: var(--m-text-muted)"
			>
				verified on Nostr ↗
			</a>
		</figcaption>
	</figure>
</section>
