<!-- Fixed nav: transparent at top, glass panel once scrolled. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL } from '$lib/marketing';

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
		<a
			href={CLAVE_INSTALL_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-full px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5"
			style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;"
		>
			Download — {CLAVE_INSTALL_LABEL}
		</a>
	</div>
</nav>
