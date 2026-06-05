<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import PhoneMockup from './PhoneMockup.svelte';
	import { PALETTE } from '$lib/theme';
	import type { FeatureRowContent } from '$lib/marketing';

	let { row, index }: { row: FeatureRowContent; index: number } = $props();

	const theme = $derived(PALETTE[row.accent]);
	const isEven = $derived(index % 2 === 0);
	const tilt = $derived(isEven ? -3 : 3);
</script>

<div class="grid items-center gap-12 md:grid-cols-2 md:gap-16">
	<div use:reveal class={isEven ? '' : 'md:order-2'}>
		<div
			class="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
			style="border-color: {theme.start}55; background: {theme.start}1a; color: {theme.start};"
		>
			<span class="h-1.5 w-1.5 rounded-full" style="background: {theme.start}"></span>
			{row.eyebrow}
		</div>
		<h3 class="font-display mb-5 text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-[1.1]" style="color: var(--m-text)">
			{row.title}
		</h3>
		<p class="mb-6 max-w-lg text-[17px] leading-relaxed" style="color: var(--m-text-muted)">
			{row.body}
		</p>
		<ul class="space-y-2.5">
			{#each row.bullets as b}
				<li class="flex items-start gap-3 text-[15px]" style="color: var(--m-text-muted)">
					<span class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style="background: {theme.start}1a; color: {theme.start}">✓</span>
					{b}
				</li>
			{/each}
		</ul>
	</div>

	<div use:reveal={{ delay: 120 }} class="flex justify-center {isEven ? '' : 'md:order-1'}">
		<PhoneMockup tilt={tilt} glow={row.glow}>
			{#snippet screen()}
				<div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" style="background: linear-gradient(160deg, {theme.start}26, #0b0910);">
					<div class="h-12 w-12 rounded-2xl" style="background: linear-gradient(135deg, {theme.start}, {theme.end})"></div>
					<p class="font-display text-base font-semibold" style="color: var(--m-text)">{row.eyebrow}</p>
					<p class="text-[10px] uppercase tracking-[0.2em]" style="color: var(--m-text-dim)">screenshot soon</p>
				</div>
			{/snippet}
		</PhoneMockup>
	</div>
</div>
