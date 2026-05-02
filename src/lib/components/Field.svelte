<script lang="ts">
	type Props = {
		label: string;
		placeholder?: string;
		value: string;
		type?: string;
	};
	let { label, placeholder = '', value = $bindable(), type = 'text' }: Props = $props();
</script>

<label class="block">
	<span class="text-sm font-medium">{label}</span>
	<input
		{type}
		{placeholder}
		bind:value
		class="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
	/>
</label>
