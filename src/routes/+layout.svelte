<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
	<header class="border-b border-neutral-200 dark:border-neutral-800">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<a href="/" class="font-semibold tracking-tight">clave.casa</a>
			<AccountSwitcher />
		</div>
	</header>
	<main class="mx-auto max-w-3xl px-4 py-6">
		{@render children?.()}
	</main>
</div>
