<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const points = [
		{ title: 'Your nsec never leaves your signer.', body: 'In Clave it lives in the iOS Secure Enclave. Signatures happen on your device.' },
		{ title: 'No analytics, no telemetry, no trackers.', body: 'No third-party scripts, no off-domain fonts or icons. This page is a static bundle.' },
		{ title: 'Live data comes straight from relays.', body: 'The notes shown here load directly from public Nostr relays in your browser — no intermediary.' },
		{ title: 'Open source.', body: 'Clave iOS and clave.casa are both MIT-licensed. Read the code, file issues, send patches.' }
	];
</script>

<section class="relative overflow-hidden px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<div use:reveal class="mb-12 text-center">
			<h2 class="font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
				Privacy by <span class="gradient-text">construction.</span>
			</h2>
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			{#each points as p, i}
				<div use:reveal={{ delay: i * 70 }} class="rounded-3xl border p-6" style="border-color: var(--m-border); background: var(--m-surface);">
					<div class="text-sm font-semibold" style="color: var(--m-text)">{p.title}</div>
					<div class="mt-2 text-sm leading-relaxed" style="color: var(--m-text-muted)">{p.body}</div>
				</div>
			{/each}
		</div>
	</div>
</section>
