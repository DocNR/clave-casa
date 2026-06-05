<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const steps = [
		{ n: 1, title: 'Install Clave on iPhone', body: 'iOS 16+, free via TestFlight while we are in beta.' },
		{ n: 2, title: 'Add your Nostr account', body: 'Paste an existing nsec or generate a fresh one. It is stored in the Secure Enclave on your device.' },
		{ n: 3, title: 'Sign on behalf of your clients', body: 'Connect a NIP-46 client with a QR code or bunker URI. When it needs a signature, Clave asks you — tap to approve.' }
	];
</script>

<section id="how" class="relative overflow-hidden px-6 py-24 md:py-28">
	<div class="mx-auto max-w-6xl">
		<div use:reveal class="mb-14 text-center">
			<p class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style="color: var(--m-text-muted)">How it works</p>
			<h2 class="font-display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
				Three steps, then forget about it.
			</h2>
		</div>
		<div class="grid gap-5 md:grid-cols-3">
			{#each steps as step, i}
				<div use:reveal={{ delay: i * 90 }} class="rounded-3xl border p-7" style="border-color: var(--m-border); background: var(--m-surface);">
					<div class="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold" style="background: var(--m-violet); color: #fff">{step.n}</div>
					<h3 class="font-display mt-5 text-lg font-semibold" style="color: var(--m-text)">{step.title}</h3>
					<p class="mt-2 text-[15px] leading-relaxed" style="color: var(--m-text-muted)">{step.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
