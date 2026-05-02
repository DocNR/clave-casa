<!-- src/lib/components/TextareaField.svelte -->
<script lang="ts">
	type Props = {
		label: string;
		placeholder?: string;
		value: string;
		rows?: number;
	};
	let { label, placeholder = '', value = $bindable(), rows = 3 }: Props = $props();
</script>

<label class="block">
	<span class="text-sm font-semibold">{label}</span>
	<textarea
		{placeholder}
		{rows}
		bind:value
		class="mt-1.5 block w-full rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clave-tint)]/40"
	></textarea>
</label>
