<!-- src/lib/components/Avatar.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { themeForPubkey, gradientCss, fgForHex } from '$lib/theme';
	import { defaultAvatarUrl, ROBOHASH_SET_KEY } from '$lib/avatar-defaults';

	type Size = 'sm' | 'md' | 'lg' | 'xl';

	let {
		pubkey,
		size = 'md',
		label,
		picture
	}: { pubkey: string; size?: Size; label?: string; picture?: string } = $props();

	// Bump on robohash-set storage events so the $derived effectivePicture
	// re-evaluates with the new set when the user changes their style.
	let robohashSetVersion = $state(0);

	onMount(() => {
		const onStorage = (e: StorageEvent) => {
			if (e.key === ROBOHASH_SET_KEY) robohashSetVersion += 1;
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});

	const dimensions: Record<Size, { px: number; ring: number; font: string }> = {
		sm: { px: 24, ring: 1.5, font: '11px' },
		md: { px: 32, ring: 2, font: '13px' },
		lg: { px: 44, ring: 2, font: '17px' },
		xl: { px: 96, ring: 3, font: '36px' }
	};

	// Render priority:
	//   1. User's kind 0 `picture` URL, if set.
	//   2. Robohash deterministic robot via defaultAvatarUrl(pubkey) — the
	//      same URL we auto-save to kind 0 on publish, so the visual here
	//      matches what other clients show after the first publish.
	//   3. If both fail to load, fall back to the gradient + initial.

	let imgFailed = $state(false);
	const theme = $derived(themeForPubkey(pubkey));
	const dim = $derived(dimensions[size]);
	const initial = $derived(
		(label ?? '').trim().slice(0, 1).toUpperCase() || pubkey.slice(0, 1).toUpperCase()
	);
	const fg = $derived(fgForHex(theme.start));
	// `robohashSetVersion` referenced inside the function so a set change
	// invalidates the derived value and re-fetches with the new set.
	const effectivePicture = $derived.by(() => {
		void robohashSetVersion; // reactive dependency
		return picture || defaultAvatarUrl(pubkey);
	});
	const showImage = $derived(!!effectivePicture && !imgFailed);

	// Reset failure state when the underlying account or picture changes.
	$effect(() => {
		picture;
		pubkey;
		imgFailed = false;
	});
</script>

{#if showImage}
	<img
		src={effectivePicture}
		alt=""
		class="inline-block shrink-0 select-none rounded-full bg-white object-cover dark:bg-neutral-900"
		style:width="{dim.px}px"
		style:height="{dim.px}px"
		style:border="{dim.ring}px solid {theme.accent}"
		onerror={() => (imgFailed = true)}
		loading="lazy"
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
