// localStorage CRUD for paired NIP-46 connections. One entry per Clave
// account (or any other NIP-46 signer). Per the plan, the iOS-side gate
// enforces account scoping at sign time — this is purely UI metadata.

import { browser } from '$app/environment';

export type Connection = {
	accountPubkey: string; // hex
	bunkerUri: string;     // bunker://... or nostrconnect://...
	label?: string;        // user-set or derived from kind 0
	pictureUrl?: string;   // cached kind 0 `picture` URL
	addedAt: number;       // unix ms
};

const STORAGE_KEY = 'clave-casa.connections.v1';
const ACTIVE_KEY = 'clave-casa.activeAccount.v1';

export function loadConnections(): Connection[] {
	if (!browser) return [];
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveConnections(conns: Connection[]) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
}

export function upsertConnection(conn: Connection) {
	const all = loadConnections();
	const idx = all.findIndex((c) => c.accountPubkey === conn.accountPubkey);
	if (idx >= 0) {
		all[idx] = { ...all[idx], ...conn };
	} else {
		all.push(conn);
	}
	saveConnections(all);
	if (!getActivePubkey()) setActivePubkey(conn.accountPubkey);
}

export function removeConnection(accountPubkey: string) {
	const all = loadConnections().filter((c) => c.accountPubkey !== accountPubkey);
	saveConnections(all);
	if (getActivePubkey() === accountPubkey) {
		setActivePubkey(all[0]?.accountPubkey);
	}
}

export function getActivePubkey(): string | undefined {
	if (!browser) return undefined;
	return localStorage.getItem(ACTIVE_KEY) ?? undefined;
}

export function setActivePubkey(pubkey: string | undefined) {
	if (!browser) return;
	if (pubkey) {
		localStorage.setItem(ACTIVE_KEY, pubkey);
	} else {
		localStorage.removeItem(ACTIVE_KEY);
	}
}

export function getActiveConnection(): Connection | undefined {
	const active = getActivePubkey();
	if (!active) return undefined;
	return loadConnections().find((c) => c.accountPubkey === active);
}
