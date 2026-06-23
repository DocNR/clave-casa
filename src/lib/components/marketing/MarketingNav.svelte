<!-- Fixed nav: transparent at top, glass panel once scrolled. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL_SHORT } from '$lib/marketing';

	// Static asset in static/ — referenced by absolute path, not imported.
	const clave = '/clave-icon.png';

	let scrolled = $state(false);
	onMount(() => {
		const onScroll = () => (scrolled = window.scrollY > 16);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<nav
	class="fixed inset-x-0 top-0 z-50 transition-all duration-300 {scrolled
		? 'marketing-glass border-b'
		: ''}"
	style={scrolled ? 'border-color: var(--m-border);' : ''}
>
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-2 font-display text-xl font-bold">
			<img src={clave} alt="" class="h-7 w-7 rounded-[8px]" />
			<span style="color: var(--m-text)">clave</span>
		</a>
		<div class="flex items-center gap-4 sm:gap-5">
			<a
				href="/faq"
				class="text-sm font-semibold transition-colors hover:opacity-100"
				style="color: var(--m-text-muted)">FAQ</a
			>
			<a
				href={CLAVE_INSTALL_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:scale-95"
				style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;"
			>
				<svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" class="h-4 w-4">
					<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
				</svg>
				{CLAVE_INSTALL_LABEL_SHORT}
			</a>
		</div>
	</div>
</nav>
