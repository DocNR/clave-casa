<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import FeatureRow from './FeatureRow.svelte';
	import { FEATURE_ROWS } from '$lib/marketing';
</script>

<section id="features" class="relative overflow-hidden px-6 py-24 md:py-32">
	<div class="mx-auto max-w-6xl">
		<div use:reveal class="mb-20 text-center">
			<p class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style="color: var(--m-text-muted)">
				What Clave does
			</p>
			<h2 class="font-display mx-auto max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
				A signer that stays out of your way <span class="gradient-text">until it matters.</span>
			</h2>
		</div>

		<div class="flex flex-col gap-28 md:gap-36">
			{#each FEATURE_ROWS as row, i}
				<FeatureRow {row} index={i} />
			{/each}
		</div>
	</div>
</section>
