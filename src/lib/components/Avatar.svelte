<!-- src/lib/components/Avatar.svelte -->
<script lang="ts">
	import { themeForPubkey, gradientCss, fgForHex } from '$lib/theme';

	type Size = 'sm' | 'md' | 'lg';

	let {
		pubkey,
		size = 'md',
		label
	}: { pubkey: string; size?: Size; label?: string } = $props();

	const dimensions: Record<Size, { px: number; ring: number; font: string }> = {
		sm: { px: 24, ring: 1.5, font: '11px' },
		md: { px: 32, ring: 2, font: '13px' },
		lg: { px: 44, ring: 2, font: '17px' }
	};

	const theme = $derived(themeForPubkey(pubkey));
	const dim = $derived(dimensions[size]);
	const initial = $derived(
		(label ?? '').trim().slice(0, 1).toUpperCase() ||
			pubkey.slice(0, 1).toUpperCase()
	);
	const fg = $derived(fgForHex(theme.start));
</script>

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
