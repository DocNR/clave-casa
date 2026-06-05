<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL } from '$lib/marketing';
</script>

<section class="relative overflow-hidden px-6 py-24">
	<div use:reveal class="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] border px-8 py-16 text-center" style="border-color: var(--m-border-2); background: radial-gradient(closest-side at 50% 0%, rgba(161,74,255,0.22), var(--m-surface));">
		<h2 class="font-display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
			Hold your own keys. <span class="gradient-text">Sign with a tap.</span>
		</h2>
		<p class="mx-auto mt-4 max-w-md text-[15px]" style="color: var(--m-text-muted)">
			Clave is free while we are in beta. iOS 16 and up.
		</p>
		<div class="mt-8 flex justify-center">
			<a href={CLAVE_INSTALL_URL} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-transform active:scale-95" style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;">
				<svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" class="h-4 w-4">
					<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
				</svg>
				Download — {CLAVE_INSTALL_LABEL}
			</a>
		</div>
	</div>
</section>
