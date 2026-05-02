<!-- src/lib/components/AccountSwitcher.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { npubEncode } from 'nostr-tools/nip19';
	import {
		loadConnections,
		getActivePubkey,
		setActivePubkey,
		removeConnection,
		type Connection
	} from '$lib/connections';
	import { clearLocalKey, disconnectActiveSigner, parseBunkerInput } from '$lib/signer';
	import Avatar from './Avatar.svelte';

	let connections: Connection[] = $state([]);
	let activePubkey: string | undefined = $state(undefined);
	let open = $state(false);
	let confirmingSignOut: string | undefined = $state(undefined);
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
				confirmingSignOut = undefined;
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
		try {
			const npub = npubEncode(hex);
			return npub.slice(0, 12) + '…';
		} catch {
			return hex.slice(0, 8) + '…';
		}
	}

	function label(c: Connection): string {
		return c.label ?? shortPubkey(c.accountPubkey);
	}

	function pick(pubkey: string) {
		setActivePubkey(pubkey);
		activePubkey = pubkey;
		open = false;
		confirmingSignOut = undefined;
		window.dispatchEvent(new StorageEvent('storage', { key: 'clave-casa.activeAccount.v1' }));
	}

	async function signOut(pubkey: string) {
		const conn = connections.find((c) => c.accountPubkey === pubkey);
		const wasActive = pubkey === activePubkey;

		// Best-effort: parse the bunker URI to find the bunker pubkey, then
		// drop the local NIP-46 keypair we generated for it. The bunker URI
		// is parsed async because nostr-tools may resolve NIP-05 — we don't
		// block sign-out on that.
		if (conn) {
			try {
				const bp = await parseBunkerInput(conn.bunkerUri);
				if (bp) clearLocalKey(bp.pubkey);
			} catch {
				// non-fatal — local key just stays orphaned
			}
		}

		if (wasActive) await disconnectActiveSigner();
		removeConnection(pubkey);

		// Refresh local state
		connections = loadConnections();
		activePubkey = getActivePubkey();
		open = false;
		confirmingSignOut = undefined;

		// Notify other listeners (layout tint, profile page reload)
		window.dispatchEvent(new StorageEvent('storage', { key: 'clave-casa.activeAccount.v1' }));

		if (wasActive && connections.length === 0) {
			goto('/connect', { replaceState: true });
		}
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
				<Avatar pubkey={active.accountPubkey} size="sm" label={active.label} picture={active.pictureUrl} />
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
				class="absolute right-0 z-10 mt-1.5 w-72 overflow-hidden rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] shadow-lg"
			>
				{#each connections as c (c.accountPubkey)}
					<div class="group flex items-center gap-1 px-1 py-0.5">
						<button
							type="button"
							class="flex flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-[var(--clave-surface)]"
							class:font-semibold={c.accountPubkey === activePubkey}
							onclick={() => pick(c.accountPubkey)}
						>
							<Avatar
								pubkey={c.accountPubkey}
								size="sm"
								label={c.label}
								picture={c.pictureUrl}
							/>
							<span class="flex-1 truncate">{label(c)}</span>
							{#if c.accountPubkey === activePubkey}
								<svg
									viewBox="0 0 16 16"
									class="h-3.5 w-3.5 text-[var(--clave-tint)]"
									aria-hidden="true"
								>
									<path
										d="M3 8.5l3.5 3.5 6.5-7"
										stroke="currentColor"
										stroke-width="2"
										fill="none"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							{/if}
						</button>
						{#if confirmingSignOut === c.accountPubkey}
							<button
								type="button"
								onclick={() => signOut(c.accountPubkey)}
								class="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/25 dark:text-red-400"
								title="Confirm sign out"
							>
								Confirm
							</button>
							<button
								type="button"
								onclick={() => (confirmingSignOut = undefined)}
								class="rounded-lg px-2 py-1 text-xs text-[var(--clave-text-muted)] hover:bg-[var(--clave-surface)]"
								title="Cancel"
							>
								Cancel
							</button>
						{:else}
							<button
								type="button"
								onclick={() => (confirmingSignOut = c.accountPubkey)}
								class="rounded-lg p-1.5 text-[var(--clave-text-muted)] opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
								title="Sign out this account"
								aria-label="Sign out {label(c)}"
							>
								<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
									<path
										d="M9.5 3h2.5a1 1 0 011 1v8a1 1 0 01-1 1H9.5M4 8h7m-2-2.5L11.5 8 9 10.5"
										stroke="currentColor"
										stroke-width="1.5"
										fill="none"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}
				<a
					href="/connect"
					class="block border-t border-[var(--clave-border)] px-3 py-2.5 text-sm font-medium text-[var(--clave-tint)] hover:bg-[var(--clave-surface)]"
				>
					+ Add another account
				</a>
				<p
					class="border-t border-[var(--clave-border)] px-3 py-2 text-[10px] text-[var(--clave-text-muted)]"
				>
					Signing out clears this device only. To fully revoke, also unpair from
					Clave's <em>Connected Clients</em>.
				</p>
			</div>
		{/if}
	</div>
{/if}
