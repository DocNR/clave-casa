<script lang="ts">
	import {
		TESTFLIGHT_URL,
		CLAVE_REPO_URL,
		CLAVE_CASA_REPO_URL,
		NIP46_SPEC_URL,
		CREDIT_NJUMP_URL
	} from '$lib/marketing';

	let { creditLabel }: { creditLabel: string } = $props();
</script>

<footer class="px-6 pb-12 pt-6">
	<div class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 border-t pt-8 text-xs sm:flex-row sm:items-center" style="border-color: var(--m-border); color: var(--m-text-dim);">
		<div class="space-y-1">
			<div style="color: var(--m-text-muted)">clave.casa</div>
			<div>
				A small thing by
				<a class="underline hover:no-underline" href={CREDIT_NJUMP_URL} target="_blank" rel="noopener noreferrer" style="color: var(--m-text-muted)">{creditLabel}</a>.
			</div>
		</div>
		<div class="flex flex-wrap gap-x-4 gap-y-1">
			<a class="hover:underline" href="/privacy">Privacy</a>
			<a class="hover:underline" href={CLAVE_CASA_REPO_URL} target="_blank" rel="noopener noreferrer">clave.casa</a>
			<a class="hover:underline" href={CLAVE_REPO_URL} target="_blank" rel="noopener noreferrer">Clave iOS</a>
			<a class="hover:underline" href={NIP46_SPEC_URL} target="_blank" rel="noopener noreferrer">NIP-46 spec</a>
			<a class="hover:underline" href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer">TestFlight</a>
		</div>
	</div>
</footer>
