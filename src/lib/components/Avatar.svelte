<!-- src/lib/components/Avatar.svelte -->
<script lang="ts">
	import { themeForPubkey, gradientCss, fgForHex } from '$lib/theme';

	type Size = 'sm' | 'md' | 'lg' | 'xl';

	let {
		pubkey,
		size = 'md',
		label,
		picture
	}: { pubkey: string; size?: Size; label?: string; picture?: string } = $props();

	const dimensions: Record<Size, { px: number; ring: number; font: string }> = {
		sm: { px: 24, ring: 1.5, font: '11px' },
		md: { px: 32, ring: 2, font: '13px' },
		lg: { px: 44, ring: 2, font: '17px' },
		xl: { px: 96, ring: 3, font: '36px' }
	};

	let imgFailed = $state(false);
	const theme = $derived(themeForPubkey(pubkey));
	const dim = $derived(dimensions[size]);
	const initial = $derived(
		(label ?? '').trim().slice(0, 1).toUpperCase() || pubkey.slice(0, 1).toUpperCase()
	);
	const fg = $derived(fgForHex(theme.start));
	const showImage = $derived(!!picture && !imgFailed);

	// Reset failure state when the picture URL changes (e.g. switching accounts)
	$effect(() => {
		picture; // declare dependency
		imgFailed = false;
	});
</script>

{#if showImage}
	<img
		src={picture}
		alt=""
		class="inline-block shrink-0 select-none rounded-full object-cover"
		style:width="{dim.px}px"
		style:height="{dim.px}px"
		style:border="{dim.ring}px solid {theme.accent}"
		onerror={() => (imgFailed = true)}
		aria-hidden="true"
	/>
{:else}
	<span
		class="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
		style:width="{dim.px}px"
		style:height="{dim.px}px"
		style:background={gradientCss(theme)}
		style:border="{dim.ring}px solid {theme.accent}"
		style:font-size={dim.font}
		style:color={fg}
		aria-hidden="true"
	>
		{initial}
	</span>
{/if}
