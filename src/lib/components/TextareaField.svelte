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
	<span class="text-sm font-medium">{label}</span>
	<textarea
		{placeholder}
		{rows}
		bind:value
		class="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
	></textarea>
</label>
