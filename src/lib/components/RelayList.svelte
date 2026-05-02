<script lang="ts">
	import type { PerRelayResult } from '$lib/propagation';
	type Props = { title: string; results: PerRelayResult[] };
	let { title, results }: Props = $props();
</script>

{#if results.length > 0}
	<div class="mt-3">
		<p class="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
		<ul class="mt-1 space-y-0.5 font-mono text-xs">
			{#each results as r}
				<li class={r.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
					{r.ok ? '✓' : '✗'} {r.url}{#if !r.ok && r.error}{' '}<span class="text-neutral-500">({r.error})</span>{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
