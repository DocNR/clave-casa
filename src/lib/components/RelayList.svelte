<!-- src/lib/components/RelayList.svelte -->
<script lang="ts">
	import StatusPill from './StatusPill.svelte';
	import type { PerRelayResult } from '$lib/propagation';
	type Props = { title: string; results: PerRelayResult[] };
	let { title, results }: Props = $props();

	function shorten(url: string): string {
		return url.replace(/^wss:\/\//, '');
	}
</script>

{#if results.length > 0}
	<div class="mt-3">
		<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--clave-text-muted)]">
			{title}
		</p>
		<div class="mt-2 flex flex-wrap gap-1.5">
			{#each results as r}
				<StatusPill tone={r.ok ? 'ok' : 'fail'}>
					{r.ok ? '✓' : '✗'} {shorten(r.url)}
					{#if !r.ok && r.error}
						<span class="opacity-70">({r.error})</span>
					{/if}
				</StatusPill>
			{/each}
		</div>
	</div>
{/if}
