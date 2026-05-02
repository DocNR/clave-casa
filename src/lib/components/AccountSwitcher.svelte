<!-- src/lib/components/AccountSwitcher.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	let confirmingSignOut: Connection | undefined = $state(undefined);
	let containerEl: HTMLElement | undefined = $state();
	let confirmDialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (confirmingSignOut && confirmDialog && !confirmDialog.open) {
			confirmDialog.showModal();
		} else if (!confirmingSignOut && confirmDialog?.open) {
			confirmDialog.close();
		}
	});

	onMount(() => {
		connections = loadConnections();
		activePubkey = getActivePubkey();
		const onStorage = () => {
			connections = loadConnections();
			activePubkey = getActivePubkey();
		};
		const onMouseDown = (e: MouseEvent) => {
			if (!open) return;
			// Ignore clicks inside the floating <dialog>; it lives outside
			// containerEl in the DOM tree.
			if (e.target instanceof Node && confirmDialog?.contains(e.target)) return;
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

	// True when the user is on /connect *and* already has at least one
	// account paired — i.e., they explicitly clicked "Add another account"
	// rather than landing here from a logged-out state. In that mode the
	// trigger displays an "Adding account" pill instead of the previous
	// active-account chip, since the visual contradiction otherwise is
	// confusing (you're entering a new bunker URI but the chip still shows
	// the old account).
	const onConnectAddFlow = $derived(
		page.url?.pathname === '/connect' && connections.length > 0
	);
</script>

{#if connections.length === 0}
	<a href="/connect" class="text-sm font-medium text-[var(--clave-tint)] hover:underline">Connect</a>
{:else}
	<div class="relative" bind:this={containerEl}>
		{#if onConnectAddFlow}
			<button
				type="button"
				class="flex items-center gap-2 rounded-full border border-[var(--clave-tint)]/40 bg-[var(--clave-tint)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--clave-tint)] hover:bg-[var(--clave-tint)]/15"
				onclick={() => (open = !open)}
				title="Adding new account — tap to switch to an existing one"
			>
				<svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
					<path
						d="M8 3v10M3 8h10"
						stroke="currentColor"
						stroke-width="1.8"
						fill="none"
						stroke-linecap="round"
					/>
				</svg>
				<span>Adding account</span>
				<svg viewBox="0 0 12 12" class="h-3 w-3 opacity-60" aria-hidden="true">
					<path
						d="M3 4.5l3 3 3-3"
						stroke="currentColor"
						stroke-width="1.5"
						fill="none"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{:else}
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
		{/if}
		{#if open}
			<div
				class="absolute right-0 z-10 mt-1.5 w-72 overflow-hidden rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] shadow-lg"
			>
				{#each connections as c (c.accountPubkey)}
					<div class="flex items-center gap-1 px-1 py-0.5">
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
						<button
							type="button"
							onclick={() => (confirmingSignOut = c)}
							class="rounded-lg p-1.5 text-[var(--clave-text-muted)] hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
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

<!-- Sign-out confirmation dialog. Native <dialog> handles ESC and a11y.
     fixed/inset/m-auto restore browser default centering after Tailwind 4's
     Preflight resets margin:0 on dialog. -->
<dialog
	bind:this={confirmDialog}
	onclose={() => (confirmingSignOut = undefined)}
	class="fixed inset-0 m-auto rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-0 text-[var(--clave-text-muted)] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
>
	{#if confirmingSignOut}
		{@const c = confirmingSignOut}
		<div class="w-[min(420px,calc(100vw-2rem))] p-5">
			<div class="flex items-center gap-3">
				<Avatar pubkey={c.accountPubkey} size="md" label={c.label} picture={c.pictureUrl} />
				<div class="min-w-0 flex-1">
					<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">
						Sign out {label(c)}?
					</h2>
					<p class="truncate font-mono text-[11px]">{shortPubkey(c.accountPubkey)}</p>
				</div>
			</div>
			<p class="mt-4 text-sm">
				Removes this account from clave.casa on this device. Your data on Nostr is
				unaffected, and your private key never left Clave.
			</p>
			<p class="mt-2 text-xs">
				The pairing stays in Clave's <em>Connected Clients</em> until you also unpair it
				there. Without that step, this device can re-connect using the saved bunker URI
				later.
			</p>
			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (confirmingSignOut = undefined)}
					class="rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-4 py-2 text-sm font-medium hover:bg-[var(--clave-surface)]"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={() => signOut(c.accountPubkey)}
					class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
				>
					Sign out
				</button>
			</div>
		</div>
	{/if}
</dialog>
