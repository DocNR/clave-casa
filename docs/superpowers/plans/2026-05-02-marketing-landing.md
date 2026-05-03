# Marketing Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal `/` route with a Clave-iOS-led marketing landing page that exercises the design system end-to-end, preserves the auto-redirect for signed-in users, and ships with zero analytics or third-party assets.

**Architecture:** A single Svelte route at `src/routes/+page.svelte` composed of seven sections. Two new components (`HeroPhone`, `EditorMockup`) live under `src/lib/components/marketing/`. A small `src/lib/marketing.ts` holds constants and a `applyMarketingTheme()` helper. The marketing brand color (palette[0] Violet) is applied via a route-aware effect in `+layout.svelte` that fires when there's no active account AND the user is on `/`. Verification is visual — type check, build, dev server, mobile smoke, Lighthouse — instead of unit tests.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), Tailwind CSS 4, TypeScript, no new runtime dependencies.

---

## File structure

| Path | Action | Responsibility |
|---|---|---|
| `src/lib/marketing.ts` | Create | Marketing constants (brand index, demo pubkey, external URLs); `applyMarketingTheme()` / `clearMarketingTheme()` helpers. |
| `src/lib/components/marketing/HeroPhone.svelte` | Create | Inline-SVG iPhone-with-approval-sheet for the hero. Decorative, `aria-hidden`. |
| `src/lib/components/marketing/EditorMockup.svelte` | Create | Non-interactive product preview using real `<Avatar>` + `<FormSectionCard>` components. Decorative, `aria-hidden`. |
| `src/routes/+layout.svelte` | Modify | Add route-aware brand-theme application (Violet on `/` with no active account). |
| `src/routes/+page.svelte` | Modify | Replace the one-paragraph landing with the seven-section marketing page. Preserve `onMount` auto-redirect. |
| `BACKLOG.md` | Append | Out-of-scope follow-ups (real screenshots, OG image, app icon SVG). |

Order matters: `marketing.ts` first (other files import from it), then layout integration, then components, then page sections in order, then BACKLOG.

---

## Task 1: Marketing constants & theme helper (`marketing.ts`)

**Files:**
- Create: `src/lib/marketing.ts`

- [ ] **Step 1: Create `src/lib/marketing.ts`** with constants and theme helpers.

```ts
// src/lib/marketing.ts
//
// Constants and helpers for the marketing landing page at `/`.
// Kept out of `theme.ts` because they're page-specific, not core
// theming primitives.

import { ambientGradientCss, fgForHex, PALETTE } from './theme';

export const MARKETING_BRAND_INDEX = 0; // Violet
export const MARKETING_BRAND_THEME = PALETTE[MARKETING_BRAND_INDEX];

// Demo pubkey for the EditorMockup avatar in section 4.
// Picked so gradientIndexForPubkey() returns 0 (Violet ring) AND the
// pubkey-hue interior lands in the purple range (271° / 271°). See
// the design spec for derivation. Not a real Nostr account.
export const DEMO_PUBKEY =
	'c0000003c0000000000000000000000000000000000000000000000000000003';

// External URLs.
export const TESTFLIGHT_URL = 'https://testflight.apple.com/'; // TODO: replace with actual public TestFlight invite
export const CLAVE_REPO_URL = 'https://github.com/DocNR/clave';
export const CLAVE_CASA_REPO_URL = 'https://github.com/DocNR/clave-casa';
export const DESIGN_SYSTEM_URL =
	'https://github.com/DocNR/clave-casa/blob/main/docs/design-system.md';
export const NIP46_SPEC_URL = 'https://github.com/nostr-protocol/nips/blob/master/46.md';

/**
 * Apply Violet brand theme to :root for the marketing route.
 * Called from +layout.svelte when no account is active and we're on `/`.
 */
export function applyMarketingTheme(): void {
	const root = document.documentElement;
	root.style.setProperty('--clave-tint', MARKETING_BRAND_THEME.accent);
	root.style.setProperty('--clave-tint-fg', fgForHex(MARKETING_BRAND_THEME.accent));
	root.style.setProperty('--clave-ambient', ambientGradientCss(MARKETING_BRAND_THEME, 'light'));
}

/**
 * Clear marketing theme overrides (return to neutral defaults).
 * Called when navigating away from `/` without an active account.
 */
export function clearMarketingTheme(): void {
	const root = document.documentElement;
	root.style.removeProperty('--clave-tint');
	root.style.removeProperty('--clave-tint-fg');
	root.style.removeProperty('--clave-ambient');
}
```

- [ ] **Step 2: Verify type check passes.**

Run: `cd ~/clave-casa && nvm use 20 && npm run check`
Expected: zero errors.

---

## Task 2: Layout integration (route-aware brand theme)

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Update `+layout.svelte` to apply marketing theme on `/` with no active account.**

Replace the existing `$effect` block (currently lines ~20-33) with this version that's route-aware:

```svelte
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import { themeForPubkey, fgForHex, ambientGradientCss } from '$lib/theme';
	import { applyMarketingTheme, clearMarketingTheme } from '$lib/marketing';
	import { onMount } from 'svelte';
	import { getActivePubkey } from '$lib/connections';
	import { page } from '$app/state';

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
			// Marketing route gets the Violet brand color; other routes stay
			// on the neutral default tint so the brand doesn't bleed into
			// /connect or other signed-out flows.
			if (page.url.pathname === '/') {
				applyMarketingTheme();
			} else {
				clearMarketingTheme();
			}
			return;
		}
		const theme = themeForPubkey(activePubkey);
		root.style.setProperty('--clave-tint', theme.accent);
		root.style.setProperty('--clave-tint-fg', fgForHex(theme.accent));
		// Light mode only for now — see app.css @variant dark + color-scheme: light.
		root.style.setProperty('--clave-ambient', ambientGradientCss(theme, 'light'));
	});
</script>
```

- [ ] **Step 2: Verify type check + dev server.**

Run: `cd ~/clave-casa && npm run check`
Expected: zero errors.

Run (background): `npm run dev` and load `http://localhost:5173/` in incognito. Expected: Violet ambient gradient visible at top of page (very subtle), the existing minimal landing renders.

- [ ] **Step 3: Commit Task 1 + Task 2 together.**

```bash
cd ~/clave-casa
git add src/lib/marketing.ts src/routes/+layout.svelte
git commit -m "$(cat <<'EOF'
feat(marketing): brand theme override for '/' route

Adds src/lib/marketing.ts with brand constants (Violet palette[0])
and applyMarketingTheme()/clearMarketingTheme() helpers. Hooks them
into +layout.svelte's existing brand-tint $effect: when no account
is active AND we're on '/', the page gets Violet --clave-tint,
--clave-tint-fg, and --clave-ambient. Other routes keep the
neutral default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: HeroPhone component

**Files:**
- Create: `src/lib/components/marketing/HeroPhone.svelte`

- [ ] **Step 1: Create the directory.**

```bash
mkdir -p ~/clave-casa/src/lib/components/marketing
```

- [ ] **Step 2: Create `HeroPhone.svelte`.**

```svelte
<!-- src/lib/components/marketing/HeroPhone.svelte
     Stylized iPhone-with-approval-sheet visual for the marketing hero.
     Inline SVG + foreignObject for the inner sheet so the sheet uses real
     CSS-var surface tokens. Decorative; aria-hidden. -->
<script lang="ts">
	// No props — purely presentational.
</script>

<svg
	viewBox="0 0 220 440"
	class="block h-auto w-full max-w-[260px] text-[var(--clave-text-muted)]"
	aria-hidden="true"
>
	<!-- iPhone outline -->
	<rect
		x="3"
		y="3"
		width="214"
		height="434"
		rx="34"
		ry="34"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		opacity="0.5"
	/>
	<!-- Dynamic Island -->
	<rect x="80" y="16" width="60" height="14" rx="7" fill="currentColor" opacity="0.4" />

	<!-- Approval sheet rendered as foreignObject so we can use HTML/CSS-var styling -->
	<foreignObject x="22" y="80" width="176" height="290">
		<div
			xmlns="http://www.w3.org/1999/xhtml"
			class="rounded-2xl border bg-[var(--clave-surface-alt)] p-4 shadow-sm"
			style="border-color: var(--clave-border); color: var(--clave-text)"
		>
			<div class="text-[11px] font-semibold uppercase tracking-wide" style="color: var(--clave-text-muted)">
				Sign event from
			</div>
			<div class="mt-1 font-mono text-xs font-semibold" style="color: var(--clave-text)">
				clave.casa
			</div>

			<hr class="my-3" style="border-color: var(--clave-border)" />

			<div class="text-[10px] leading-relaxed" style="color: var(--clave-text-muted)">
				kind:1 note · signed locally on your device
			</div>

			<div class="mt-4 flex flex-col gap-1.5">
				<div
					class="rounded-xl py-2 text-center text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
				>
					Sign
				</div>
				<div
					class="rounded-xl border py-2 text-center text-xs font-semibold"
					style="border-color: var(--clave-border); color: var(--clave-text-muted)"
				>
					Decline
				</div>
			</div>
		</div>
	</foreignObject>
</svg>
```

- [ ] **Step 3: Verify the component compiles.**

Run: `cd ~/clave-casa && npm run check`
Expected: zero errors.

(No commit yet — combine with Task 4.)

---

## Task 4: Hero section (`+page.svelte`)

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Replace `+page.svelte` with the new structure including hero.**

Read the existing file first:

```bash
cat ~/clave-casa/src/routes/+page.svelte
```

Then replace its entire body with this hero-only version (sections 2–7 will be added incrementally in later tasks):

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadConnections, getActiveConnection } from '$lib/connections';
	import HeroPhone from '$lib/components/marketing/HeroPhone.svelte';
	import { TESTFLIGHT_URL } from '$lib/marketing';

	// Preserve the original auto-redirect: signed-in users with an active
	// connection skip the marketing page and go straight to /edit.
	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/edit', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Clave — A NIP-46 remote signer for iPhone</title>
	<meta
		name="description"
		content="Approve every Nostr signature from your iPhone. Your nsec stays in the Secure Enclave."
	/>
</svelte:head>

<div class="space-y-16 sm:space-y-24 pb-16">
	<!-- 1. Hero -->
	<section class="flex flex-col items-center pt-8 text-center sm:pt-12">
		<HeroPhone />

		<h1
			class="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl"
			style="color: var(--clave-text)"
		>
			Clave
		</h1>
		<p
			class="mx-auto mt-4 max-w-md text-lg leading-snug"
			style="color: var(--clave-text)"
		>
			Approve every Nostr signature from your iPhone.
			<br class="hidden sm:inline" />
			Your nsec stays in the Secure Enclave.
		</p>

		<div class="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:flex-row">
			<a
				href={TESTFLIGHT_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
				style="background: var(--clave-tint); color: var(--clave-tint-fg)"
			>
				Download for iOS
			</a>
			<a
				href="/connect"
				class="rounded-xl border px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
				style="border-color: var(--clave-border); color: var(--clave-text)"
			>
				Edit your profile
			</a>
		</div>
	</section>
</div>
```

- [ ] **Step 2: Type check + visual verify.**

```bash
cd ~/clave-casa && npm run check
```
Expected: zero errors.

```bash
npm run dev
```
Then load `http://localhost:5173/` in incognito.
Expected: iPhone visual at top, "Clave" wordmark below it, two-line tagline, two CTAs (Violet primary + neutral secondary).

- [ ] **Step 3: Commit Tasks 3 + 4.**

```bash
cd ~/clave-casa
git add src/lib/components/marketing/HeroPhone.svelte src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
feat(marketing): hero section with iPhone visual

Replaces the minimal landing's body with a typography hero:
inline-SVG iPhone-with-approval-sheet, "Clave" wordmark, two-line
plain-language tagline, primary "Download for iOS" + secondary
"Edit your profile" CTAs.

The auto-redirect for signed-in users (onMount + goto('/edit'))
is preserved verbatim. TESTFLIGHT_URL is a placeholder pending the
public invite link.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Section 2 — What Clave does

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add section 2 after the hero `</section>`.**

Insert the following block immediately after the hero `</section>` closing tag, before the wrapping div's `</div>`:

```svelte
	<!-- 2. What Clave does -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			What Clave does
		</h2>
		<div class="grid gap-4 sm:grid-cols-3">
			<article
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div class="text-3xl">🔒</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Your nsec never leaves your phone
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Stored in the iOS Secure Enclave. Every signature is approved locally on your device.
				</p>
			</article>
			<article
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div class="text-3xl">👥</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Multiple accounts, one signer
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Pair up to four Nostr identities and switch with a tap. Each gets its own gradient
					identity.
				</p>
			</article>
			<article
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div class="text-3xl">🔋</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Always ready, never draining
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Clave wakes only when an app needs you to sign. The rest of the time it's asleep — no
					background activity, no battery drain.
				</p>
			</article>
		</div>
	</section>
```

- [ ] **Step 2: Type check + visual verify.**

```bash
cd ~/clave-casa && npm run check
```
Expected: zero errors.

Reload `http://localhost:5173/` (HMR should pick this up automatically).
Expected: three cards in a row on desktop, stacked on mobile (resize to 375px to verify).

(Don't commit yet — bundle with section 3.)

---

## Task 6: Section 3 — How it works

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add section 3 after section 2.**

```svelte
	<!-- 3. How it works -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			How it works
		</h2>
		<ol class="grid gap-4 sm:grid-cols-3">
			<li
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
				>
					1
				</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Install Clave on iPhone
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					iOS 16+, free via TestFlight while we're in beta.
				</p>
			</li>
			<li
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
				>
					2
				</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Add your Nostr account
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Paste an existing nsec or generate a fresh one. It's encrypted and stored on your device.
				</p>
			</li>
			<li
				class="space-y-3 rounded-2xl border p-5"
				style="border-color: var(--clave-border); background: var(--clave-surface)"
			>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
				>
					3
				</div>
				<h3 class="text-base font-semibold" style="color: var(--clave-text)">
					Sign from any client
				</h3>
				<p class="text-sm" style="color: var(--clave-text-muted)">
					Scan a QR or paste a bunker URI from any NIP-46 compatible Nostr client. Tap to approve.
				</p>
			</li>
		</ol>
	</section>
```

- [ ] **Step 2: Type check + visual verify.**

```bash
cd ~/clave-casa && npm run check
```
Expected: zero errors.

Reload page, expected: three numbered step cards in a row (desktop) / stacked (mobile).

- [ ] **Step 3: Commit Tasks 5 + 6.**

```bash
cd ~/clave-casa
git add src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
feat(marketing): What Clave does + How it works sections

Sections 2 and 3 of the marketing page.

Section 2 ("What Clave does") is three FormSectionCard-styled
articles — nsec stays on phone, multi-account, NSE/APNs-driven
battery savings. Emoji icons keep the privacy promise (no
third-party icon font).

Section 3 ("How it works") is a numbered <ol> — install, add
account, sign from any client. The numbered chips use the brand
tint (Violet on the marketing route).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: EditorMockup component

**Files:**
- Create: `src/lib/components/marketing/EditorMockup.svelte`

- [ ] **Step 1: Create the component.**

```svelte
<!-- src/lib/components/marketing/EditorMockup.svelte
     Non-interactive product preview for section 4. Uses the real Avatar
     and FormSectionCard components rendering placeholder content so the
     visual matches the actual /edit page byte-for-byte. Decorative;
     aria-hidden + pointer-events-none. -->
<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import FormSectionCard from '$lib/components/FormSectionCard.svelte';
	import { DEMO_PUBKEY } from '$lib/marketing';
</script>

<div class="pointer-events-none select-none" aria-hidden="true">
	<FormSectionCard>
		<div class="flex items-center gap-3">
			<Avatar pubkey={DEMO_PUBKEY} size="lg" label="Daisy" />
			<div class="min-w-0">
				<div class="truncate text-base font-semibold" style="color: var(--clave-text)">
					Daisy
				</div>
				<div class="truncate font-mono text-[11px]" style="color: var(--clave-text-muted)">
					npub1xy54p83…6411
				</div>
			</div>
		</div>

		<label class="block">
			<span class="text-sm font-semibold" style="color: var(--clave-text)">Display name</span>
			<div
				class="mt-1.5 rounded-xl border px-3.5 py-2.5 text-sm"
				style="border-color: var(--clave-border); background: var(--clave-surface-alt); color: var(--clave-text)"
			>
				Daisy
			</div>
		</label>

		<label class="block">
			<span class="text-sm font-semibold" style="color: var(--clave-text)">About</span>
			<div
				class="mt-1.5 rounded-xl border px-3.5 py-2.5 text-sm"
				style="border-color: var(--clave-border); background: var(--clave-surface-alt); color: var(--clave-text-muted)"
			>
				A short bio about your work on Nostr.
			</div>
		</label>

		<button
			type="button"
			tabindex={-1}
			class="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
			style="background: var(--clave-tint); color: var(--clave-tint-fg)"
		>
			Save and publish
		</button>
	</FormSectionCard>
</div>
```

- [ ] **Step 2: Verify it compiles.**

```bash
cd ~/clave-casa && npm run check
```
Expected: zero errors.

(No commit yet — combine with Task 8.)

---

## Task 8: Section 4 — Or edit your profile from any browser

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add the EditorMockup import + section 4.**

In the `<script>` block, add:

```ts
import EditorMockup from '$lib/components/marketing/EditorMockup.svelte';
```

After section 3's `</section>`, add:

```svelte
	<!-- 4. Or edit your profile from any browser (clave.casa intro) -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			Or edit your profile from any browser
		</h2>
		<div class="grid gap-8 sm:grid-cols-2 sm:items-center">
			<div class="space-y-4">
				<p class="text-base leading-relaxed" style="color: var(--clave-text)">
					There's also <strong>clave.casa</strong> — a free web tool for editing your kind 0 Nostr
					profile. Picture, name, bio, NIP-05, Lightning address — all of it.
				</p>
				<p class="text-sm leading-relaxed" style="color: var(--clave-text-muted)">
					Signed by Clave on your phone, or by any other NIP-46 signer (Amber on Android,
					nsec.app on web).
				</p>
				<a
					href="/connect"
					class="inline-block rounded-xl border px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
					style="border-color: var(--clave-border); color: var(--clave-text)"
				>
					Edit your profile
				</a>
			</div>
			<div>
				<EditorMockup />
			</div>
		</div>
	</section>
```

- [ ] **Step 2: Type check + visual verify.**

```bash
cd ~/clave-casa && npm run check
```
Expected: zero errors.

Reload, expected: two-column layout on desktop (copy left, mockup right), stacked on mobile. The Avatar in the mockup has a Violet ring.

- [ ] **Step 3: Commit Tasks 7 + 8.**

```bash
cd ~/clave-casa
git add src/lib/components/marketing/EditorMockup.svelte src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
feat(marketing): editor mockup + clave.casa intro section

Section 4 introduces the web companion as a secondary feature
("Or edit your profile from any browser"). The product mockup uses
real Avatar + FormSectionCard components rendering placeholder
content — looks pixel-identical to a screenshot of /edit because
it IS the same components. When we swap to a real screenshot
post-deploy, the EditorMockup component is replaced wholesale.

Demo pubkey c0000003c0000000... was picked so the avatar's
deterministic ring color matches the marketing brand (palette[0]
Violet) and the pubkey-hue interior lands in the purple range.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Sections 5–7 (Privacy, Built in the open, Footer)

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add the URL imports.**

In the `<script>` block, expand the marketing imports:

```ts
import {
	TESTFLIGHT_URL,
	CLAVE_REPO_URL,
	CLAVE_CASA_REPO_URL,
	DESIGN_SYSTEM_URL,
	NIP46_SPEC_URL
} from '$lib/marketing';
```

- [ ] **Step 2: Add sections 5, 6, and 7 after section 4.**

```svelte
	<!-- 5. Privacy -->
	<section>
		<h2 class="mb-6 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			Privacy
		</h2>
		<ul class="space-y-4">
			<li>
				<div class="flex items-start gap-3">
					<span class="text-xl leading-none" aria-hidden="true">🔒</span>
					<div>
						<div class="text-sm font-semibold" style="color: var(--clave-text)">
							Your nsec never leaves your signer.
						</div>
						<div class="text-sm" style="color: var(--clave-text-muted)">
							In Clave it's stored in the iOS Secure Enclave. In clave.casa it's whatever signer
							you connected.
						</div>
					</div>
				</div>
			</li>
			<li>
				<div class="flex items-start gap-3">
					<span class="text-xl leading-none" aria-hidden="true">🔍</span>
					<div>
						<div class="text-sm font-semibold" style="color: var(--clave-text)">
							No analytics, no telemetry, no third-party scripts.
						</div>
						<div class="text-sm" style="color: var(--clave-text-muted)">
							No off-domain fonts or icons. Static HTML/CSS/JS, hosted as a flat bundle.
						</div>
					</div>
				</div>
			</li>
			<li>
				<div class="flex items-start gap-3">
					<span class="text-xl leading-none" aria-hidden="true">🛠️</span>
					<div>
						<div class="text-sm font-semibold" style="color: var(--clave-text)">
							Open source.
						</div>
						<div class="text-sm" style="color: var(--clave-text-muted)">
							Clave iOS and clave.casa are both MIT-licensed. Read the code, file issues, send
							patches.
						</div>
					</div>
				</div>
			</li>
			<li>
				<div class="flex items-start gap-3">
					<span class="text-xl leading-none" aria-hidden="true">🤖</span>
					<div>
						<div class="text-sm font-semibold" style="color: var(--clave-text)">
							Robohash sees your npub when default avatars are rendered.
						</div>
						<div class="text-sm" style="color: var(--clave-text-muted)">
							The npub is public anyway. If it bothers you, paste your own picture URL or remove
							the picture.
						</div>
					</div>
				</div>
			</li>
		</ul>
	</section>

	<!-- 6. Built in the open -->
	<section>
		<h2 class="mb-4 text-2xl font-semibold tracking-tight" style="color: var(--clave-text)">
			Built in the open
		</h2>
		<p class="max-w-2xl text-base leading-relaxed" style="color: var(--clave-text)">
			Clave iOS and clave.casa are open source on GitHub. They share a
			<a class="underline hover:no-underline" href={DESIGN_SYSTEM_URL} target="_blank" rel="noopener noreferrer"
				>cross-platform design system</a
			>, the AccountTheme palette, and the privacy promise. PRs welcome.
		</p>
		<p class="mt-3 text-sm" style="color: var(--clave-text-muted)">
			<a class="hover:underline" href={CLAVE_REPO_URL} target="_blank" rel="noopener noreferrer"
				>Clave iOS</a
			>
			·
			<a class="hover:underline" href={CLAVE_CASA_REPO_URL} target="_blank" rel="noopener noreferrer"
				>clave.casa</a
			>
			·
			<a class="hover:underline" href={DESIGN_SYSTEM_URL} target="_blank" rel="noopener noreferrer"
				>Design system</a
			>
			·
			<a class="hover:underline" href={NIP46_SPEC_URL} target="_blank" rel="noopener noreferrer"
				>NIP-46 spec</a
			>
		</p>
	</section>
</div>

<!-- 7. Footer -->
<footer
	class="mt-16 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center"
	style="border-color: var(--clave-border); color: var(--clave-text-muted)"
>
	<div>clave.casa</div>
	<div class="flex flex-wrap gap-x-3 gap-y-1">
		<a class="hover:underline" href={CLAVE_CASA_REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
		<span aria-hidden="true">·</span>
		<a class="hover:underline" href={CLAVE_REPO_URL} target="_blank" rel="noopener noreferrer">iOS</a>
		<span aria-hidden="true">·</span>
		<a class="hover:underline" href={DESIGN_SYSTEM_URL} target="_blank" rel="noopener noreferrer">Design system</a>
		<span aria-hidden="true">·</span>
		<a class="hover:underline" href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer">TestFlight</a>
	</div>
</footer>
```

Note: the footer goes OUTSIDE the wrapping `<div class="space-y-16 ...">` so it's full-width relative to the layout's `max-w-3xl` constraint but doesn't get the section spacing applied to it.

- [ ] **Step 3: Type check + visual verify.**

```bash
cd ~/clave-casa && npm run check && npm run build
```
Expected: zero errors, build succeeds.

Reload page in dev. Expected: privacy bullets render with emoji + lead/sub copy, "Built in the open" paragraph + link list, footer at the bottom.

- [ ] **Step 4: Commit.**

```bash
cd ~/clave-casa
git add src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
feat(marketing): privacy + developer + footer sections

Sections 5–7. Privacy is a four-bullet list (nsec never leaves
signer, no analytics, open source, Robohash on npub). "Built in
the open" is a single paragraph + inline link list. Footer is
text-only with wordmark left, four links right.

Closes the marketing landing page MVP.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: BACKLOG updates

**Files:**
- Modify: `BACKLOG.md`

- [ ] **Step 1: Read current BACKLOG.md.**

```bash
cat ~/clave-casa/BACKLOG.md | head -20
```

- [ ] **Step 2: Append marketing-landing follow-ups under "Soon" (or similar — match existing structure).**

Append these items in the appropriate priority section:

```markdown
### Marketing landing follow-ups (post-deploy)

- [ ] **Replace `<EditorMockup />` with a real screenshot** — once we deploy and have a polished /edit page, capture a 1× and 2× PNG of the editor in a clean state, swap into section 4 of `+page.svelte` via `<img>`.
- [ ] **OG image at 1200×630** — for Twitter Card / Facebook share preview. Reuse the design-system Violet ambient gradient + "Clave" wordmark + tagline. Save to `static/og.png` and add `<meta property="og:image">` in the `<svelte:head>`.
- [ ] **Clave iOS app icon SVG** — once available, replace the inline-SVG iPhone outline in `HeroPhone.svelte` with the actual app icon (or supplement with it).
- [ ] **Real public TestFlight URL** — `marketing.ts:TESTFLIGHT_URL` is currently a placeholder. Paste the actual public invite link.
- [ ] **Marketing analytics? — only if privacy-preserving** — out of scope for v1 (design-contract). If we ever revisit, candidates: Plausible self-hosted, Simple Analytics, or just counting GitHub repo stars as a proxy. Before doing this, update the privacy section accordingly.
```

- [ ] **Step 3: Commit.**

```bash
cd ~/clave-casa
git add BACKLOG.md
git commit -m "$(cat <<'EOF'
docs(backlog): marketing landing follow-ups (post-deploy)

Real screenshot swap, OG image, app icon SVG, real TestFlight URL,
and a deferred analytics note.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Final verification

- [ ] **Step 1: Type check + production build.**

```bash
cd ~/clave-casa && nvm use 20 && npm run check && npm run build
```
Expected: zero errors, zero warnings, build artifact written.

- [ ] **Step 2: Production preview, signed-out.**

```bash
npm run preview &
```
Wait for `Local: http://localhost:4173/`. Open in incognito.

Expected: marketing page renders with Violet brand color, all 7 sections present, no console errors. Hero CTAs point to TestFlight + /connect.

- [ ] **Step 3: Auto-redirect signed-in.**

Open DevTools → Application → Local Storage → `http://localhost:4173`. Add a fake connection so `loadConnections()` and `getActiveConnection()` are non-empty. Reload `/`.
Expected: redirects to `/edit` immediately. Marketing page never flashes.

(If you don't have a quick way to seed localStorage, complete `/connect` once with a real signer in dev, then reload.)

- [ ] **Step 4: Mobile smoke (DevTools emulator at 375px).**

Open DevTools → toggle device toolbar → set width to 375px (iPhone SE). Reload.
Expected: no horizontal scroll. CTAs full-width. Section 2/3 cards stack vertically. Section 4 mockup goes below copy. Footer wraps cleanly.

- [ ] **Step 5: Reduced motion.**

DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce". Reload.
Expected: page is fully usable; the 300ms ambient transition still works (it's CSS, doesn't violate reduced-motion since it's color, not motion); no jank.

- [ ] **Step 6: Lighthouse.**

In Chrome DevTools, go to Lighthouse tab. Run with "Mode: Navigation", "Device: Mobile", all four categories.
Expected: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.

If anything is below 95, capture the specific failing audit (e.g., "Accessibility: insufficient color contrast on .clave-text-muted at bottom of page") and fix inline.

- [ ] **Step 7: Anti-pattern audit.**

Read each section in `src/routes/+page.svelte` and check against the `docs/design-system.md` §11 anti-pattern checklist:

- No hardcoded `text-white` on neutral surfaces
- No `bg-clave-tint` Tailwind utility (we use `style="background: var(--clave-tint)"`)
- All section headers sentence-case
- Avatar mockup uses `pubkeyHueGradient` interior (handled by `<Avatar>`)
- No inline `displayLabel` chain (mockup uses literal strings)
- No `dark:` variants
- No `<dialog>` modals

If a violation exists, fix it inline; commit a `style:` follow-up.

- [ ] **Step 8: Final summary to the user.**

Report:
- All commits landed (list the commit messages)
- Verification status (build, preview, mobile, Lighthouse — concrete numbers)
- TestFlight URL still pending — user to paste before they push
- Don't push until user signs off
