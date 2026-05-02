<!-- src/lib/components/FormSectionCard.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { label, children }: { label?: string; children?: Snippet } = $props();
</script>

<section
	class="space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface)] p-4"
>
	{#if label}
		<!-- Sentence-case headline (design-system.md §5: textCase(nil), .headline weight).
		     iOS uses Form Section headers with overridden text-case; web matches. -->
		<p class="text-sm font-semibold text-[var(--clave-text)]">
			{label}
		</p>
	{/if}
	{@render children?.()}
</section>
