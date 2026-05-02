<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadConnections,
		getActivePubkey,
		setActivePubkey,
		type Connection
	} from '$lib/connections';

	let connections: Connection[] = $state([]);
	let activePubkey: string | undefined = $state(undefined);
	let open = $state(false);

	onMount(() => {
		connections = loadConnections();
		activePubkey = getActivePubkey();
		const onStorage = () => {
			connections = loadConnections();
			activePubkey = getActivePubkey();
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});

	function shortPubkey(hex: string): string {
		return hex.slice(0, 8) + '…' + hex.slice(-4);
	}

	function label(c: Connection): string {
		return c.label ?? shortPubkey(c.accountPubkey);
	}

	function pick(pubkey: string) {
		setActivePubkey(pubkey);
		activePubkey = pubkey;
		open = false;
		// Trigger a refresh so any active page re-reads connection state.
		window.dispatchEvent(new StorageEvent('storage', { key: 'clave-casa.activeAccount.v1' }));
	}

	const active = $derived(connections.find((c) => c.accountPubkey === activePubkey));
</script>

{#if connections.length === 0}
	<a href="/connect" class="text-sm text-blue-600 hover:underline dark:text-blue-400">Connect</a>
{:else}
	<div class="relative">
		<button
			type="button"
			class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
			onclick={() => (open = !open)}
		>
			{active ? label(active) : 'Pick account'}
			<span aria-hidden="true" class="ml-1 text-neutral-500">▾</span>
		</button>
		{#if open}
			<div
				class="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
			>
				{#each connections as c}
					<button
						type="button"
						class="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
						class:font-semibold={c.accountPubkey === activePubkey}
						onclick={() => pick(c.accountPubkey)}
					>
						{label(c)}
					</button>
				{/each}
				<a
					href="/connect"
					class="block border-t border-neutral-200 px-3 py-2 text-left text-sm text-blue-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-blue-400 dark:hover:bg-neutral-800"
				>
					+ Add another account
				</a>
			</div>
		{/if}
	</div>
{/if}
