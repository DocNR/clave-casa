<!-- src/lib/components/FormSectionCard.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { label, children }: { label?: string; children?: Snippet } = $props();
</script>

<section
	class="space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface)] p-4"
>
	{#if label}
		<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--clave-text-muted)]">
			{label}
		</p>
	{/if}
	{@render children?.()}
</section>
