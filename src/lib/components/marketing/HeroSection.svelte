<!-- Hero: gradient headline, CTAs, trust chips, 3-phone cluster, blobs. -->
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import PhoneMockup from './PhoneMockup.svelte';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL } from '$lib/marketing';

	const chips = [
		{ label: 'nsec secured in Clave', color: 'var(--m-violet)' },
		{ label: 'Works in the background', color: 'var(--m-sky)' },
		{ label: 'Works with most NIP-46 clients', color: 'var(--m-teal)' },
		{ label: 'Open source', color: 'var(--m-violet-soft)' }
	];

	function scrollToFeatures() {
		document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<section class="relative flex min-h-svh items-center overflow-hidden px-6 pb-20 pt-28 md:pt-32">
	<!-- ambient blobs -->
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="spotlight spotlight-violet animate-blob-drift absolute -left-[10%] top-[8%] h-[55vh] w-[55vh]"></div>
		<div class="spotlight spotlight-sky animate-blob-drift absolute -right-[6%] top-[22%] h-[60vh] w-[60vh]" style="animation-delay: -6s"></div>
		<div class="spotlight spotlight-teal animate-blob-drift absolute bottom-[-10%] left-[22%] h-[45vh] w-[45vh]" style="animation-delay: -12s"></div>
	</div>

	<div class="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
		<div class="text-center lg:text-left">
			<h1
				use:reveal={{ delay: 60 }}
				class="font-display mb-6 text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.98]"
				style="color: var(--m-text)"
			>
				Sign every Nostr event<br />without exposing your
				<span class="gradient-text">keys</span>.
			</h1>
			<p
				use:reveal={{ delay: 150 }}
				class="mx-auto mb-9 max-w-xl text-lg leading-relaxed lg:mx-0"
				style="color: var(--m-text-muted)"
			>
				Clave is a remote Nostr signer. Your private key is generated and stored in the iOS
				Secure Enclave — and never leaves it.
			</p>

			<div use:reveal={{ delay: 240 }} class="mb-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
				<a
					href={CLAVE_INSTALL_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
					style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;"
				>
					<svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" class="h-4 w-4">
						<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
					</svg>
					Download — {CLAVE_INSTALL_LABEL}
				</a>
				<button
					type="button"
					onclick={scrollToFeatures}
					class="rounded-xl border px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
					style="border-color: var(--m-border-2); color: var(--m-text)"
				>
					See how it works
				</button>
			</div>

			<div use:reveal={{ delay: 360 }} class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs lg:justify-start" style="color: var(--m-text-dim)">
				{#each chips as chip}
					<span class="inline-flex items-center gap-1.5">
						<span class="h-1.5 w-1.5 rounded-full" style="background: {chip.color}"></span>
						{chip.label}
					</span>
				{/each}
			</div>
		</div>

		<!-- phone cluster -->
		<div use:reveal={{ delay: 200 }} class="relative hidden lg:block">
			<div class="relative mx-auto flex h-[560px] w-full max-w-md items-center justify-center">
				<div class="absolute left-0 top-10">
					<PhoneMockup tilt={-8} glow="sky">
						{#snippet screen()}
							{@render fauxScreen('Account switcher', 'switch identities')}
						{/snippet}
					</PhoneMockup>
				</div>
				<div class="absolute right-0 top-24 z-10">
					<PhoneMockup tilt={6} glow="teal">
						{#snippet screen()}
							{@render fauxScreen('Connect', 'scan a QR or paste a bunker URI')}
						{/snippet}
					</PhoneMockup>
				</div>
				<div class="relative z-20">
					<PhoneMockup tilt={-2} glow="violet">
						{#snippet screen()}
							{@render approvalScreen()}
						{/snippet}
					</PhoneMockup>
				</div>
			</div>
		</div>
		<div use:reveal={{ delay: 300 }} class="flex justify-center lg:hidden">
			<PhoneMockup tilt={-2} glow="violet">
				{#snippet screen()}
					{@render approvalScreen()}
				{/snippet}
			</PhoneMockup>
		</div>
	</div>
</section>

{#snippet fauxScreen(title: string, subtitle: string)}
	<div class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center" style="background: linear-gradient(160deg, var(--m-surface-2), #0b0910);">
		<div class="h-3 w-3 rounded-full" style="background: var(--m-violet)"></div>
		<p class="font-display text-lg font-semibold" style="color: var(--m-text)">{title}</p>
		<p class="text-[11px]" style="color: var(--m-text-muted)">{subtitle}</p>
	</div>
{/snippet}

{#snippet approvalScreen()}
	<div class="flex h-full flex-col p-4" style="background: linear-gradient(160deg, var(--m-surface-2), #0b0910);">
		<div class="mt-6 rounded-2xl border p-4" style="border-color: var(--m-border-2); background: var(--m-surface);">
			<div class="text-[9px] font-semibold uppercase tracking-wide" style="color: var(--m-text-dim)">Sign event from</div>
			<div class="mt-1 font-mono text-xs font-semibold" style="color: var(--m-text)">jumble.social</div>
			<hr class="my-3" style="border-color: var(--m-border)" />
			<div class="text-[10px] leading-relaxed" style="color: var(--m-text-muted)">kind:1 note · signed locally on your device</div>
			<div class="mt-4 flex flex-col gap-1.5">
				<div class="rounded-xl py-2 text-center text-xs font-semibold" style="background: var(--m-violet); color: #fff">Sign</div>
				<div class="rounded-xl border py-2 text-center text-xs font-semibold" style="border-color: var(--m-border-2); color: var(--m-text-muted)">Decline</div>
			</div>
		</div>
	</div>
{/snippet}
