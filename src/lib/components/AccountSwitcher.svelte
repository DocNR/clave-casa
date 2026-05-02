<!-- src/lib/components/AccountSwitcher.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadConnections,
		getActivePubkey,
		setActivePubkey,
		type Connection
	} from '$lib/connections';
	import Avatar from './Avatar.svelte';

	let connections: Connection[] = $state([]);
	let activePubkey: string | undefined = $state(undefined);
	let open = $state(false);
	let containerEl: HTMLElement | undefined = $state();

	onMount(() => {
		connections = loadConnections();
		activePubkey = getActivePubkey();
		const onStorage = () => {
			connections = loadConnections();
			activePubkey = getActivePubkey();
		};
		const onMouseDown = (e: MouseEvent) => {
			if (!open) return;
			if (containerEl && e.target instanceof Node && !containerEl.contains(e.target)) {
				open = false;
			}
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('mousedown', onMouseDown);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('mousedown', onMouseDown);
		};
	});

	function shortPubkey(hex: string): string {
		return hex.slice(0, 8) + '…';
	}

	function label(c: Connection): string {
		return c.label ?? shortPubkey(c.accountPubkey);
	}

	function pick(pubkey: string) {
		setActivePubkey(pubkey);
		activePubkey = pubkey;
		open = false;
		window.dispatchEvent(new StorageEvent('storage', { key: 'clave-casa.activeAccount.v1' }));
	}

	const active = $derived(connections.find((c) => c.accountPubkey === activePubkey));
</script>

{#if connections.length === 0}
	<a href="/connect" class="text-sm font-medium text-[var(--clave-tint)] hover:underline">Connect</a>
{:else}
	<div class="relative" bind:this={containerEl}>
		<button
			type="button"
			class="flex items-center gap-2 rounded-full border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] py-1 pl-1 pr-3 text-sm font-medium hover:bg-[var(--clave-surface)]"
			onclick={() => (open = !open)}
		>
			{#if active}
				<Avatar pubkey={active.accountPubkey} size="sm" label={active.label} />
				<span>{label(active)}</span>
			{:else}
				<span class="px-2">Pick account</span>
			{/if}
			<svg viewBox="0 0 12 12" class="h-3 w-3 opacity-50" aria-hidden="true">
				<path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		{#if open}
			<div
				class="absolute right-0 z-10 mt-1.5 w-64 overflow-hidden rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] shadow-lg"
			>
				{#each connections as c}
					<button
						type="button"
						class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--clave-surface)]"
						class:font-semibold={c.accountPubkey === activePubkey}
						onclick={() => pick(c.accountPubkey)}
					>
						<Avatar pubkey={c.accountPubkey} size="sm" label={c.label} />
						<span class="flex-1 truncate">{label(c)}</span>
						{#if c.accountPubkey === activePubkey}
							<svg viewBox="0 0 16 16" class="h-3.5 w-3.5 text-[var(--clave-tint)]" aria-hidden="true">
								<path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						{/if}
					</button>
				{/each}
				<a
					href="/connect"
					class="block border-t border-[var(--clave-border)] px-3 py-2.5 text-sm font-medium text-[var(--clave-tint)] hover:bg-[var(--clave-surface)]"
				>
					+ Add another account
				</a>
			</div>
		{/if}
	</div>
{/if}
