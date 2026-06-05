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
			<a href={CLAVE_INSTALL_URL} target="_blank" rel="noopener noreferrer" class="rounded-xl px-6 py-3.5 text-sm font-semibold transition-transform active:scale-95" style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;">
				Download — {CLAVE_INSTALL_LABEL}
			</a>
		</div>
	</div>
</section>
