# clave.casa design pass v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the seven targeted visual changes from the design spec at `docs/superpowers/specs/2026-05-01-clave-casa-design-pass-v1.md` so clave.casa visibly belongs to the Clave family without forcing iOS chrome into the browser.

**Architecture:** A tiny shared design system (`src/lib/theme.ts` + four CSS variables in `app.css` + three new Svelte components: `Avatar`, `StatusPill`, `FormSectionCard`). Existing routes and components consume the new primitives — no behavioral changes, only visual layer.

**Tech Stack:** SvelteKit 2.57 (Svelte 5 runes mode), Tailwind 4, TypeScript 6, nostr-tools 2.23 (provides `@noble/hashes` transitively for SHA-256). Dev server via Claude_Preview at http://localhost:5173.

---

## Conventions for this plan

- **No automated tests** — visual changes verify by typecheck + dev-server boot + the manual smoke checklist in the spec. Each task ends with a "Verify" step instead of a TDD cycle.
- **Run `npm run check` before every commit** — this is our standing-in-for-tests check. Zero errors required.
- **Keep the dev server running.** Most changes pick up via Vite HMR; verify in the Claude_Preview browser between steps.
- **All `npm` commands prefixed** with `nvm use 20` because Node 20+ is required (project was scaffolded under Node 18 originally).

---

## Pre-tasks

### Task 0: Establish baseline commit of working MVP

The working MVP code is uncommitted. Before any design pass changes, snapshot it so the design pass diff is reviewable.

**Files:** all of `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `static/`, `tests/`, `.claude/`, `.npmrc`, `.vscode/`, `README.md` (everything except `docs/` and `.gitignore`, already committed).

- [ ] **Step 1: Verify working state**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 2: Verify dev server boots**

```bash
nvm use 20
npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
kill %1
```

Expected: `200`.

- [ ] **Step 3: Stage everything**

```bash
cd ~/clave-casa
git add -A
git status
```

Expected: All MVP files staged. `docs/` already committed. `.superpowers/` ignored.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: clave.casa MVP — landing, /connect, /profile

SvelteKit + nostr-tools + Tailwind 4 + adapter-static. Multi-account
NIP-46 client: paste bunker URI on /connect (or arrive via #bunker=
fragment from Clave iOS), edit kind 0 on /profile, three-tier publish
to user's NIP-65 write relays + broadcast set, optional stale-relay
scan via 'Sync across Nostr' button.

Lazy relay loading avoids NDK-style pool storms; nostr-tools'
BunkerSigner handles Clave's secret-echoed connect response that NDK's
strict result==='ack' check rejected. Approval-wait UI retries on
permission-denied responses while the user approves on their phone.

Working MVP, generic Tailwind styling. Family-resemblance design pass
follows in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected: One commit, ~25-30 files added.

---

## Foundation tasks

### Task 1: Theme module — palette, hash, tint helpers

**Files:**
- Create: `src/lib/theme.ts`

- [ ] **Step 1: Create the file with the exact palette + SHA-256 hash function**

```ts
// src/lib/theme.ts
//
// Per-account gradient palette — 12 deterministic gradient pairs lifted
// verbatim from Clave iOS's AccountTheme.swift. Indexed by SHA-256 of the
// lowercased pubkey hex, taking the first 2 bytes as a uint16 mod 12.
//
// Same npub → same gradient on iOS, on web, on any future client. The order
// of the palette is locked — never reorder, that would reassign every
// existing account's color.

import { sha256 } from '@noble/hashes/sha2';

export type AccountTheme = {
	start: string;
	end: string;
	accent: string; // darker tone — used as button background and focus rings
	name: string;
	index: number;
};

export const PALETTE: readonly AccountTheme[] = [
	{ start: '#7A8CFF', end: '#A14AFF', accent: '#592EFF', name: 'Violet', index: 0 },
	{ start: '#00C7FF', end: '#2EFFB5', accent: '#005966', name: 'Teal', index: 1 },
	{ start: '#FF8C4A', end: '#FFC24A', accent: '#C75900', name: 'Coral', index: 2 },
	{ start: '#FF4A8C', end: '#FF78A8', accent: '#C71A66', name: 'Magenta', index: 3 },
	{ start: '#4AA3FF', end: '#4AE8FF', accent: '#1A73D9', name: 'Sky', index: 4 },
	{ start: '#4AFF8C', end: '#C2FF4A', accent: '#1A8C33', name: 'Lime', index: 5 },
	{ start: '#FF6B6B', end: '#FF9E4F', accent: '#C72E2E', name: 'Red', index: 6 },
	{ start: '#8C4AFF', end: '#ED6BFF', accent: '#661AC7', name: 'Fuchsia', index: 7 },
	{ start: '#1AC799', end: '#66ED66', accent: '#0D664D', name: 'Emerald', index: 8 },
	{ start: '#C76BED', end: '#FF8CC7', accent: '#8C2EB5', name: 'Orchid', index: 9 },
	{ start: '#4A6BD9', end: '#8CB5FF', accent: '#1A33A6', name: 'Navy', index: 10 },
	{ start: '#FF6BB5', end: '#FFB56B', accent: '#C73373', name: 'Peach', index: 11 }
];

// SHA-256(lowercased hex pubkey) → first 2 bytes as uint16 → mod 12.
// Matches Clave iOS AccountTheme.forAccount(pubkeyHex:) exactly.
export function gradientIndexForPubkey(hexPubkey: string): number {
	const normalized = hexPubkey.toLowerCase();
	if (!/^[0-9a-f]{64}$/.test(normalized)) return 0;
	const digest = sha256(new TextEncoder().encode(normalized));
	return ((digest[0] << 8) | digest[1]) % PALETTE.length;
}

export function themeForPubkey(hexPubkey: string): AccountTheme {
	return PALETTE[gradientIndexForPubkey(hexPubkey)];
}

// Pick a foreground color (white or near-black) that contrasts with the
// given hex background, used for text/initials laid over a gradient.
// Simple luminance heuristic — good enough for the curated palette.
export function fgForHex(hex: string): string {
	const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
	if (!m) return '#ffffff';
	const r = parseInt(m[1], 16);
	const g = parseInt(m[2], 16);
	const b = parseInt(m[3], 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6 ? 'rgba(0,0,0,0.7)' : '#ffffff';
}

// Build a CSS linear-gradient(135deg, ...) string from a theme. 135° matches
// Clave iOS's gradient direction (top-left → bottom-right).
export function gradientCss(theme: AccountTheme): string {
	return `linear-gradient(135deg, ${theme.start}, ${theme.end})`;
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 3: Verify the hash matches iOS for the test account**

The test pubkey from memory is `npub125f8lj0pcq7xk3v68w4h9ldenhh3v3x97gumm5yl8e0mgq0dnvssjptd2l` which decodes to hex `55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21`. Compute its SHA-256 and verify the resulting palette index matches what the iOS app shows for the same account.

```bash
cd ~/clave-casa
nvm use 20
node --input-type=module -e '
import { sha256 } from "@noble/hashes/sha2";
const hex = "55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21";
const digest = sha256(new TextEncoder().encode(hex));
const idx = ((digest[0] << 8) | digest[1]) % 12;
const names = ["Violet","Teal","Coral","Magenta","Sky","Lime","Red","Fuchsia","Emerald","Orchid","Navy","Peach"];
console.log("index:", idx, "name:", names[idx]);
'
```

Note the result. When testing in-browser later, this is the gradient that should appear for the test account. (Cross-check against the iOS app: open Clave, look at the account avatar's color.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/theme.ts
git commit -m "feat(theme): add Clave-iOS palette + SHA-256 hash → gradient index

Lifts AccountTheme.swift verbatim into TS. 12-color palette, exact RGB
values from iOS Color(red:,green:,blue:) literals. SHA-256 of lowercased
hex pubkey, first 2 bytes as uint16 mod 12. Same npub yields identical
gradient on iOS and web.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: CSS variables + system font stack in `app.css`

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Replace `app.css` with the design tokens + font stack**

Read current contents first:

```bash
cat ~/clave-casa/src/app.css
```

Then write the new version:

```css
@import 'tailwindcss';

:root {
	color-scheme: light dark;

	/* Default tint — overridden at runtime when an account becomes active.
	   See +layout.svelte's $effect that watches active connection. */
	--clave-tint: #1a73d9;
	--clave-tint-fg: #ffffff;

	/* Surface tokens for cards / inputs / borders. Light + dark adapt below. */
	--clave-surface: rgb(245 245 245 / 0.6);
	--clave-surface-alt: rgb(255 255 255);
	--clave-border: rgb(0 0 0 / 0.08);
	--clave-text-muted: rgb(115 115 115);

	/* Radii. Match iOS 16pt cards / 12pt inputs. */
	--clave-radius-card: 16px;
	--clave-radius-input: 12px;
}

@media (prefers-color-scheme: dark) {
	:root {
		--clave-surface: rgb(23 23 23 / 0.5);
		--clave-surface-alt: rgb(10 10 10);
		--clave-border: rgb(255 255 255 / 0.08);
		--clave-text-muted: rgb(163 163 163);
	}
}

html {
	/* System stack — macOS / iOS Safari render this as SF Pro Text, matching
	   the Clave iOS app body copy. Other platforms get their native UI font. */
	font-family:
		-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable Text',
		'Segoe UI', system-ui, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

/* Slightly tighten heading letter-spacing to match Clave iOS's SF Pro
   Display rhythm. */
h1,
h2,
h3 {
	letter-spacing: -0.01em;
}
```

Use the Write tool to replace the file (after reading it first per Edit-tool rules).

- [ ] **Step 2: Verify typecheck + boot**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

In the Claude_Preview browser, reload the page. Header text should now use SF Pro on Mac/iOS Safari (visibly different glyph shapes than the previous default).

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "feat(theme): CSS variable tokens + system font stack

--clave-tint{,-fg}, --clave-surface{,-alt}, --clave-border, --clave-text-muted,
--clave-radius-card (16px), --clave-radius-input (12px). Light + dark variants.
Explicit -apple-system stack so macOS/iOS Safari renders in SF Pro Text,
matching the iOS app body copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Component tasks

### Task 3: `<Avatar>` component

**Files:**
- Create: `src/lib/components/Avatar.svelte`

- [ ] **Step 1: Write the component**

```svelte
<!-- src/lib/components/Avatar.svelte -->
<script lang="ts">
	import { themeForPubkey, gradientCss, fgForHex } from '$lib/theme';

	type Size = 'sm' | 'md' | 'lg';

	let {
		pubkey,
		size = 'md',
		label
	}: { pubkey: string; size?: Size; label?: string } = $props();

	const dimensions: Record<Size, { px: number; ring: number; font: string }> = {
		sm: { px: 24, ring: 1.5, font: '11px' },
		md: { px: 32, ring: 2, font: '13px' },
		lg: { px: 44, ring: 2, font: '17px' }
	};

	const theme = $derived(themeForPubkey(pubkey));
	const dim = $derived(dimensions[size]);
	const initial = $derived(
		(label ?? '').trim().slice(0, 1).toUpperCase() ||
			pubkey.slice(0, 1).toUpperCase()
	);
	const fg = $derived(fgForHex(theme.start));
</script>

<span
	class="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
	style:width="{dim.px}px"
	style:height="{dim.px}px"
	style:background={gradientCss(theme)}
	style:border="{dim.ring}px solid {theme.accent}"
	style:font-size={dim.font}
	style:color={fg}
	aria-hidden="true"
>
	{initial}
</span>
```

- [ ] **Step 2: Verify typecheck**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 3: Smoke-test rendering**

We don't have a unit harness; verify through the route updates downstream. For now, just check the file compiles cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/Avatar.svelte
git commit -m "feat(ui): Avatar component — gradient circle keyed on pubkey

Sm (24px) / md (32px) / lg (44px). Per-pubkey gradient via themeForPubkey,
2px (or 1.5px sm) accent-color ring matching iOS's 3pt ring spec scaled
for web. Renders the user's first label char or hex char as initial.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `<StatusPill>` component

**Files:**
- Create: `src/lib/components/StatusPill.svelte`

- [ ] **Step 1: Write the component**

```svelte
<!-- src/lib/components/StatusPill.svelte -->
<script lang="ts">
	type Tone = 'ok' | 'fail' | 'pending' | 'neutral';
	let { tone = 'neutral', children }: { tone?: Tone; children?: any } = $props();

	const toneClasses: Record<Tone, string> = {
		ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
		fail: 'bg-red-500/15 text-red-700 dark:text-red-400',
		pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
		neutral: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium {toneClasses[
		tone
	]}"
>
	{@render children?.()}
</span>
```

- [ ] **Step 2: Verify typecheck**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/StatusPill.svelte
git commit -m "feat(ui): StatusPill component — capsule for relay results + status

Tones: ok (emerald), fail (red), pending (amber), neutral. 0.15 opacity
background + matching darker text mirrors iOS's color.opacity(0.15) +
Capsule pattern. Mono text for relay URLs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `<FormSectionCard>` component

**Files:**
- Create: `src/lib/components/FormSectionCard.svelte`

- [ ] **Step 1: Write the component**

```svelte
<!-- src/lib/components/FormSectionCard.svelte -->
<script lang="ts">
	let { label, children }: { label?: string; children?: any } = $props();
</script>

<section
	class="space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface)] p-4"
>
	{#if label}
		<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--clave-text-muted)]">
			{label}
		</p>
	{/if}
	{@render children?.()}
</section>
```

- [ ] **Step 2: Verify typecheck**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/FormSectionCard.svelte
git commit -m "feat(ui): FormSectionCard — soft card with optional uppercase label

16px radius card on --clave-surface with --clave-border, optional
uppercase tracked label. Web-native echo of Clave iOS's grouped Form
sections without faking the iOS chrome.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Update existing pieces

### Task 6: Update `Field` and `TextareaField` for radii + weight

**Files:**
- Modify: `src/lib/components/Field.svelte`
- Modify: `src/lib/components/TextareaField.svelte`

- [ ] **Step 1: Read both files**

```bash
cat ~/clave-casa/src/lib/components/Field.svelte
cat ~/clave-casa/src/lib/components/TextareaField.svelte
```

- [ ] **Step 2: Rewrite `Field.svelte`**

Use the Write tool with this content:

```svelte
<!-- src/lib/components/Field.svelte -->
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
	<span class="text-sm font-semibold">{label}</span>
	<input
		{type}
		{placeholder}
		bind:value
		class="mt-1.5 block w-full rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clave-tint)]/40"
	/>
</label>
```

- [ ] **Step 3: Rewrite `TextareaField.svelte`**

```svelte
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
```

- [ ] **Step 4: Verify typecheck + browser smoke**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`. In the browser, the connect-page textarea and any visible inputs should now have 12px corner radii and a tint-colored focus ring.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Field.svelte src/lib/components/TextareaField.svelte
git commit -m "feat(ui): Field/TextareaField use design tokens + tinted focus ring

12px input radius, --clave-surface-alt + --clave-border, semibold labels,
focus:ring-[var(--clave-tint)]/40 tied to the active account's accent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Update `RelayList` to use `<StatusPill>`

**Files:**
- Modify: `src/lib/components/RelayList.svelte`

- [ ] **Step 1: Read current file**

```bash
cat ~/clave-casa/src/lib/components/RelayList.svelte
```

- [ ] **Step 2: Rewrite using `StatusPill`**

```svelte
<!-- src/lib/components/RelayList.svelte -->
<script lang="ts">
	import StatusPill from './StatusPill.svelte';
	import type { PerRelayResult } from '$lib/propagation';
	type Props = { title: string; results: PerRelayResult[] };
	let { title, results }: Props = $props();

	function shorten(url: string): string {
		return url.replace(/^wss:\/\//, '');
	}
</script>

{#if results.length > 0}
	<div class="mt-3">
		<p class="text-[11px] font-semibold uppercase tracking-wider text-[var(--clave-text-muted)]">
			{title}
		</p>
		<div class="mt-2 flex flex-wrap gap-1.5">
			{#each results as r}
				<StatusPill tone={r.ok ? 'ok' : 'fail'}>
					{r.ok ? '✓' : '✗'} {shorten(r.url)}
					{#if !r.ok && r.error}
						<span class="opacity-70">({r.error})</span>
					{/if}
				</StatusPill>
			{/each}
		</div>
	</div>
{/if}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/RelayList.svelte
git commit -m "feat(ui): RelayList renders capsule pills via StatusPill

Replaces inline ✓/✗ strings with proper colored capsules on a 0.15
opacity background. Strips wss:// prefix for compactness; failure
reasons get a parenthesized lower-opacity suffix.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Update `AccountSwitcher` to use `<Avatar>`

**Files:**
- Modify: `src/lib/components/AccountSwitcher.svelte`

- [ ] **Step 1: Read current file**

```bash
cat ~/clave-casa/src/lib/components/AccountSwitcher.svelte
```

- [ ] **Step 2: Rewrite to use Avatar + dropdown polish**

```svelte
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
	<div class="relative">
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
```

- [ ] **Step 3: Verify typecheck + browser smoke**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`. In the browser at `/profile` (with an active connection), the top-right switcher should now show a small gradient avatar next to the account label.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/AccountSwitcher.svelte
git commit -m "feat(ui): AccountSwitcher uses gradient Avatar + token-driven chrome

Pill-shaped trigger button shows the active account's small Avatar +
truncated label + svg chevron. Dropdown items each include the per-account
Avatar with a checkmark on the active row. Token-driven background +
border replace hardcoded neutral classes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Sticky blur header + active-account tint in `+layout.svelte`

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Read current file**

```bash
cat ~/clave-casa/src/routes/+layout.svelte
```

- [ ] **Step 2: Rewrite with sticky blur header + tint effect**

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import { themeForPubkey, fgForHex } from '$lib/theme';
	import { onMount } from 'svelte';
	import { getActivePubkey } from '$lib/connections';

	let { children } = $props();
	let activePubkey = $state<string | undefined>(undefined);

	onMount(() => {
		const refresh = () => (activePubkey = getActivePubkey());
		refresh();
		window.addEventListener('storage', refresh);
		return () => window.removeEventListener('storage', refresh);
	});

	$effect(() => {
		const root = document.documentElement;
		if (!activePubkey) {
			root.style.removeProperty('--clave-tint');
			root.style.removeProperty('--clave-tint-fg');
			return;
		}
		const theme = themeForPubkey(activePubkey);
		root.style.setProperty('--clave-tint', theme.accent);
		root.style.setProperty('--clave-tint-fg', fgForHex(theme.accent));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
	<header
		class="sticky top-0 z-20 border-b border-[var(--clave-border)] bg-[var(--clave-surface)] backdrop-blur-xl"
	>
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<a href="/" class="text-base font-semibold tracking-tight">clave.casa</a>
			<AccountSwitcher />
		</div>
	</header>
	<main class="mx-auto max-w-3xl px-4 py-6">
		{@render children?.()}
	</main>
</div>
```

- [ ] **Step 3: Verify typecheck + browser smoke**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`. In the browser, scroll the profile page — header should stay sticky with a frosted backdrop blur. Active-account avatar in the top-right should show. Inspect `<html>` in dev tools: `--clave-tint` should now be the accent hex of the active account.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(ui): sticky blur header + active-account tint propagation

Header gets backdrop-blur-xl with --clave-surface; sets --clave-tint /
--clave-tint-fg on document root from active connection's gradient
accent so primary buttons + focus rings echo the Clave iOS account
color throughout the app.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Route polish

### Task 10: Apply tokens to landing page

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Read current file**

```bash
cat ~/clave-casa/src/routes/+page.svelte
```

- [ ] **Step 2: Rewrite**

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadConnections, getActiveConnection } from '$lib/connections';

	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/profile', { replaceState: true });
		}
	});
</script>

<div class="space-y-8 py-12">
	<header class="space-y-3 text-center">
		<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">clave.casa</h1>
		<p class="mx-auto max-w-xl text-[var(--clave-text-muted)]">
			A small set of Nostr tools that sign with your remote signer. Edit your profile, manage
			your contact list, set your relay list — without exposing your nsec to the browser.
		</p>
	</header>

	<div
		class="mx-auto max-w-md space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-6"
	>
		<h2 class="text-lg font-semibold">Get started</h2>
		<p class="text-sm text-[var(--clave-text-muted)]">
			Open Clave on your phone and tap <em>Open in browser</em> from your account, or paste a
			bunker URI from any NIP-46 signer.
		</p>
		<a
			href="/connect"
			class="inline-block w-full rounded-xl bg-[var(--clave-tint)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90"
		>
			Connect
		</a>
	</div>

	<footer class="pt-12 text-center text-xs text-[var(--clave-text-muted)]">
		<p>
			Open source · No analytics · Your keys never leave your signer ·
			<a class="hover:underline" href="https://github.com/DocNR/clave-casa">source</a>
		</p>
	</footer>
</div>
```

- [ ] **Step 3: Verify typecheck + browser smoke**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`. Browser: clear localStorage and visit `/`. Card has 16px radius, button has 12px radius and uses `--clave-tint` (default sky blue when no account active).

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(ui): landing page uses design tokens + 16/12px radii

CTA card switches to --clave-surface-alt + 16px radius. Connect button
uses --clave-tint background and 12px radius. Body copy uses
--clave-text-muted token.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Apply tokens + a stage StatusPill to connect page

**Files:**
- Modify: `src/routes/connect/+page.svelte`

- [ ] **Step 1: Read current file**

```bash
cat ~/clave-casa/src/routes/connect/+page.svelte
```

- [ ] **Step 2: Update the `<script>` to import StatusPill**

Find the top imports section and add:

```svelte
import StatusPill from '$lib/components/StatusPill.svelte';
```

- [ ] **Step 3: Replace the `connecting` block to use StatusPill + tokens**

Find this block:

```svelte
{#if status === 'connecting'}
	<div
		class="space-y-3 rounded-md border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
	>
		<div class="flex items-center justify-between">
			<p class="font-medium">{stageLabel}…</p>
			<span class="font-mono text-xs text-neutral-500">{elapsedSec}s</span>
		</div>
		{#if stageDetail}
			<p class="font-mono text-xs text-neutral-500">{stageDetail}</p>
		{/if}
		<p class="text-xs text-neutral-500">
			If your signer prompts for approval, accept on that device. Times out at 45s.
		</p>
	</div>
```

Replace with:

```svelte
{#if status === 'connecting'}
	<div
		class="space-y-3 rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-4 text-sm"
	>
		<div class="flex items-center justify-between">
			<p class="font-semibold">{stageLabel}…</p>
			<StatusPill tone="pending">{elapsedSec}s</StatusPill>
		</div>
		{#if stageDetail}
			<p class="font-mono text-xs text-[var(--clave-text-muted)]">{stageDetail}</p>
		{/if}
		<p class="text-xs text-[var(--clave-text-muted)]">
			If your signer prompts for approval, accept on that device. Times out at 45s.
		</p>
	</div>
```

- [ ] **Step 4: Replace the `error` block radius**

Find:

```svelte
{:else if status === 'error'}
	<div
		class="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
	>
```

Replace `rounded-md` with `rounded-2xl` (other classes stay).

- [ ] **Step 5: Replace the `idle` form block**

Find:

```svelte
{:else}
	<form onsubmit={submitPaste} class="space-y-3">
		<label class="block">
			<span class="text-sm font-medium">Bunker URI</span>
			<textarea
				bind:value={pasted}
				rows="3"
				placeholder="bunker://&lt;pubkey&gt;?relay=wss://&hellip;&amp;secret=&hellip;"
				class="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
			></textarea>
		</label>
		<button
			type="submit"
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Connect
		</button>
	</form>
```

Replace with:

```svelte
{:else}
	<form onsubmit={submitPaste} class="space-y-3">
		<label class="block">
			<span class="text-sm font-semibold">Bunker URI</span>
			<textarea
				bind:value={pasted}
				rows="3"
				placeholder="bunker://&lt;pubkey&gt;?relay=wss://&hellip;&amp;secret=&hellip;"
				class="mt-1.5 block w-full rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clave-tint)]/40"
			></textarea>
		</label>
		<button
			type="submit"
			class="w-full rounded-xl bg-[var(--clave-tint)] px-4 py-2.5 text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90"
		>
			Connect
		</button>
	</form>
```

- [ ] **Step 6: Verify typecheck + browser smoke**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`. Browser: `/connect` shows the tokenized form with 16/12px radii and tint-colored Connect button.

- [ ] **Step 7: Commit**

```bash
git add src/routes/connect/+page.svelte
git commit -m "feat(ui): connect page uses tokens + StatusPill for elapsed counter

Pending stage's elapsed-seconds gets a pending-tone capsule. Card radii
bump to 16px, input/button to 12px, primary button uses --clave-tint.
Connecting status block reads from --clave-surface-alt for the layered-
on-blur-header effect.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Update profile page — Avatar header, FormSectionCards, tinted button

**Files:**
- Modify: `src/routes/profile/+page.svelte`

- [ ] **Step 1: Read current file**

```bash
cat ~/clave-casa/src/routes/profile/+page.svelte
```

- [ ] **Step 2: Add new imports to `<script>`**

In the imports block at the top, add:

```svelte
import Avatar from '$lib/components/Avatar.svelte';
import FormSectionCard from '$lib/components/FormSectionCard.svelte';
```

- [ ] **Step 3: Replace the header**

Find:

```svelte
<header class="flex items-baseline justify-between">
	<h1 class="text-2xl font-semibold">Edit profile</h1>
	<span class="font-mono text-xs text-neutral-500">{userPubkey.slice(0, 12)}…</span>
</header>
```

Replace with:

```svelte
<header class="flex items-center gap-3">
	<Avatar pubkey={userPubkey} size="lg" label={fields.display_name || fields.name} />
	<div class="min-w-0 flex-1">
		<h1 class="truncate text-2xl font-semibold">
			{fields.display_name || fields.name || 'Edit profile'}
		</h1>
		<p class="truncate font-mono text-xs text-[var(--clave-text-muted)]">
			{userPubkey.slice(0, 16)}…
		</p>
	</div>
</header>
```

- [ ] **Step 4: Replace the form to use FormSectionCard groupings**

Find the `<form>` block from `<form onsubmit={…}>` through to `</form>` and replace with:

```svelte
<form
	onsubmit={(e) => {
		e.preventDefault();
		save();
	}}
	class="space-y-4"
>
	<FormSectionCard label="Identity">
		<Field
			label="Display name"
			placeholder="Your name as shown to readers"
			bind:value={fields.display_name}
		/>
		<Field label="Username" placeholder="lowercase, no spaces" bind:value={fields.name} />
		<TextareaField label="About" placeholder="A short bio…" bind:value={fields.about} />
	</FormSectionCard>

	<FormSectionCard label="Images">
		<Field label="Picture URL" placeholder="https://…" bind:value={fields.picture} type="url" />
		<Field
			label="Banner URL"
			placeholder="https://… (wider image, header)"
			bind:value={fields.banner}
			type="url"
		/>
	</FormSectionCard>

	<FormSectionCard label="Verification & links">
		<Field label="NIP-05 verifier" placeholder="you@example.com" bind:value={fields.nip05} />
		<Field
			label="Lightning address (lud16)"
			placeholder="you@walletofsatoshi.com"
			bind:value={fields.lud16}
		/>
		<Field label="Website" placeholder="https://…" bind:value={fields.website} type="url" />
	</FormSectionCard>

	<div class="flex items-center gap-3 pt-2">
		<button
			type="submit"
			disabled={phase === 'publishing'}
			class="rounded-xl bg-[var(--clave-tint)] px-4 py-2.5 text-sm font-semibold text-[var(--clave-tint-fg)] hover:opacity-90 disabled:opacity-50"
		>
			{phase === 'publishing'
				? approvalWait
					? `Awaiting approval… (${approvalWait.elapsedSec}s)`
					: 'Publishing…'
				: 'Save & publish'}
		</button>
		{#if lastSavedEvent}
			<button
				type="button"
				onclick={syncAcrossNostr}
				disabled={phase === 'syncing'}
				class="rounded-xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--clave-surface)] disabled:opacity-50"
			>
				{phase === 'syncing' ? 'Syncing…' : 'Sync across Nostr'}
			</button>
		{/if}
	</div>
</form>
```

- [ ] **Step 5: Update the `loadError` and `nip65Present` warning blocks for tokens + radius**

Find:

```svelte
{#if loadError}
	<div
		class="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
	>
		{loadError}
	</div>
{/if}
```

Replace `rounded-md` with `rounded-2xl`. Same edit for the amber `nip65Present` block and the `approvalWait` blue block: bump `rounded-md` → `rounded-2xl` everywhere in this file.

- [ ] **Step 6: Update the publish-report and scan-report sections**

Find any remaining `rounded-md border border-neutral-200 bg-white … dark:border-neutral-800 dark:bg-neutral-900` and replace with `rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)]`. Two occurrences expected (publishReport block, scanReport block).

- [ ] **Step 7: Verify typecheck + browser smoke**

```bash
cd ~/clave-casa
nvm use 20
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`. In the browser at `/profile` with an active connection: profile header shows large gradient Avatar + display name + truncated pubkey; form fields are grouped in three section cards labeled Identity / Images / Verification & links; primary "Save & publish" button uses the active account's tint accent; scrolling shows the sticky blur header staying visible.

- [ ] **Step 8: Commit**

```bash
git add src/routes/profile/+page.svelte
git commit -m "feat(ui): profile page Avatar header + FormSectionCard groups + tinted CTA

Header replaces the bare h1 + truncated npub with a 44px Avatar +
display-name title + monospace npub subtitle, all styled in tokens.
Form fields move into three FormSectionCard groupings (Identity /
Images / Verification & links). Primary 'Save & publish' button uses
--clave-tint; secondary 'Sync across Nostr' uses --clave-surface-alt.
All cards bump to 16px radii, all buttons to 12px.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verification

### Task 13: Run the full manual smoke checklist from the spec

This is the only verification we have for visual changes. Walk through each item, taking notes for anything that looks off.

- [ ] **Step 1: Avatar correctness — match against iOS**

Open Clave iOS, note the avatar gradient color for your test account. Open clave-casa in browser, connect with that account's bunker URI, observe gradient on the profile header. Same color = pass.

If divergent, the SHA-256 byte order or palette ordering is wrong. Re-read `~/clave/Clave/Shared/AccountTheme.swift` line 31-35 against `src/lib/theme.ts` `gradientIndexForPubkey`.

- [ ] **Step 2: Active-account tint switching**

If you have two test accounts, pair both. Switch between them via the AccountSwitcher dropdown. Primary buttons (Save & publish, Connect on the connect page) and focus rings should change color to match the active account's accent.

- [ ] **Step 3: Per-relay capsule pills**

Trigger a publish (or use the `Sync across Nostr` button). Per-relay results render as colored capsules. Successful relays = emerald-tinted. Failed ones = red-tinted. Both legible in light + dark themes (toggle macOS theme to test).

- [ ] **Step 4: Form section cards**

Profile page shows three labeled card sections: Identity, Images, Verification & links. Section labels are small uppercase text in `--clave-text-muted`. Cards have 16px corner radii.

- [ ] **Step 5: Sticky header backdrop blur**

Scroll the profile page (long enough form to scroll). Header stays at top with content visibly blurring behind it. No "white island" effect — the surface should still adapt to dark theme.

- [ ] **Step 6: macOS Safari font**

Open the deployed site or `localhost:5173` in macOS Safari. Body copy should render in SF Pro Text — visibly different glyph shapes from Chrome's default `system-ui`.

- [ ] **Step 7: Light + dark mode toggle**

System Settings → Appearance → toggle Light/Dark. Both modes should look intentional. Check: connect page form, profile page header, status pills, account switcher dropdown, sticky header.

- [ ] **Step 8: Mobile viewport at 375px**

Chrome dev tools → device toolbar → iPhone 13. Account switcher dropdown still works, header still sticks, form section cards stack cleanly, no horizontal scroll.

- [ ] **Step 9: Final commit if any tweaks needed**

If steps 1-8 surfaced any small fixes, commit them as `fix(ui): <what>`. If everything passes cleanly, no commit needed — verification doesn't need to be in git.

---

## Self-review notes

- ✅ Spec coverage: All 7 in-scope items have a task. Item 1 (Avatar) → Tasks 1+3. Item 2 (CSS tokens) → Task 2. Item 3 (radii) → Tasks 6+10+11+12. Item 4 (capsule pills) → Tasks 4+7+11. Item 5 (sticky blur header) → Task 9. Item 6 (font stack) → Task 2. Item 7 (form section cards) → Tasks 5+12.
- ✅ No placeholders: every code step shows the literal code; no "implement appropriate error handling".
- ✅ Type consistency: `Avatar`'s `pubkey` / `size` / `label` props match between Task 3 (definition) and Task 8/12 (usage). `StatusPill`'s `tone` enum matches between Task 4 (definition) and Tasks 7/11 (usage). `gradientIndexForPubkey` is sync (returns `number`) consistently.
- ✅ Each commit keeps the app working: every commit step is paired with `npm run check` immediately before it. No half-states.
