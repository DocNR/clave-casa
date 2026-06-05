<!-- Stylized iPhone frame for the marketing page. Renders an <img> when
     `src` is provided (real screenshot), otherwise a styled faux-screen
     passed in via the `screen` snippet. This is the screenshot-swap seam:
     drop a real /screenshots/*.png into `src` later and the faux-screen
     is bypassed. Decorative — aria-hidden. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		src = undefined,
		alt = '',
		tilt = 0,
		glow = 'violet',
		float = true,
		screen = undefined
	}: {
		src?: string;
		alt?: string;
		tilt?: number;
		glow?: 'violet' | 'sky' | 'teal';
		float?: boolean;
		screen?: Snippet;
	} = $props();

	const glowMap = {
		violet: 'rgba(161,74,255,0.30)',
		sky: 'rgba(74,232,255,0.26)',
		teal: 'rgba(46,255,181,0.24)'
	};
</script>

<div
	class="relative mx-auto w-[230px] shrink-0 sm:w-[260px] {float ? 'animate-phone-hover' : ''}"
	style="--phone-tilt: {tilt}deg; transform: rotate({tilt}deg);"
	aria-hidden="true"
>
	<!-- glow -->
	<div
		class="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] blur-2xl"
		style="background: radial-gradient(closest-side, {glowMap[glow]}, transparent 70%);"
	></div>

	<!-- frame -->
	<div
		class="relative overflow-hidden rounded-[2.25rem] border-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
		style="border-color: var(--m-border-2); background: #0b0910;"
	>
		<!-- notch -->
		<div
			class="absolute left-1/2 top-1.5 z-10 h-5 w-[38%] -translate-x-1/2 rounded-full"
			style="background: #0b0910;"
		></div>

		<div class="relative aspect-[10/20.5] w-full overflow-hidden rounded-[1.85rem]">
			{#if src}
				<img {src} {alt} class="h-full w-full object-cover" loading="lazy" />
			{:else if screen}
				{@render screen()}
			{/if}
		</div>
	</div>
</div>
