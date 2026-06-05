# clave.casa Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the clave.casa marketing landing (`/`) as a dark, motion-rich, signer-first page in the spirit of wisp.mobile, using Clave's violet identity and existing gradient palette — without touching `/edit` or `/connect`.

**Architecture:** A route-aware `+layout.svelte` renders full-bleed dark chrome only on `/` and leaves the existing light header/`max-w-3xl` shell for all other routes. The landing is composed of focused section components under `src/lib/components/marketing/`, driven by a CSS-only motion system (an `IntersectionObserver` `reveal` action + keyframes in `app.css`). Dark design tokens are scoped to a `.marketing-root` wrapper so app routes are byte-for-byte unaffected. Live testimonials fetch curated real notes client-side via the existing `nostr-tools` `SimplePool`.

**Tech Stack:** SvelteKit (Svelte 5 runes) · Tailwind v4 (CSS `@theme`/plain CSS, no config file) · `adapter-static` (SPA) · `nostr-tools` · `@fontsource/space-grotesk` · vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-landing-redesign-design.md`

**Branch:** `feat/landing-redesign` (already created; spec committed).

---

## File structure

**Create:**
- `src/lib/actions/reveal.ts` — `IntersectionObserver` scroll-reveal Svelte action.
- `src/lib/actions/reveal.test.ts` — unit test for the action's observer wiring.
- `src/lib/testimonials.ts` — curated testimonial event-ID list + `normalizeTestimonial` helper + live `fetchTestimonials`.
- `src/lib/testimonials.test.ts` — unit test for `normalizeTestimonial`.
- `src/lib/components/marketing/PhoneMockup.svelte` — screenshot-ready device frame.
- `src/lib/components/marketing/MarketingNav.svelte` — fixed glass-on-scroll nav.
- `src/lib/components/marketing/HeroSection.svelte`
- `src/lib/components/marketing/FeatureRow.svelte`
- `src/lib/components/marketing/FeaturesSection.svelte`
- `src/lib/components/marketing/HowItWorks.svelte`
- `src/lib/components/marketing/Testimonials.svelte`
- `src/lib/components/marketing/PrivacySection.svelte`
- `src/lib/components/marketing/DownloadCTA.svelte`
- `src/lib/components/marketing/MarketingFooter.svelte`

**Modify:**
- `package.json` — add `@fontsource/space-grotesk`.
- `src/app.css` — dark `--m-*` tokens scoped to `.marketing-root`, font import, motion keyframes/utilities, reduced-motion guard.
- `src/routes/+layout.svelte` — route-aware chrome (`/` full-bleed dark vs others unchanged).
- `src/lib/marketing.ts` — add typed feature-row content array.
- `src/routes/+page.svelte` — recompose from new section components; remove editor section; preserve signed-in redirect + credit fetch.

**Retire (decide during Task 13):**
- `src/lib/components/marketing/EditorMockup.svelte`, `src/lib/components/marketing/HeroPhone.svelte` — superseded; remove if nothing imports them.

---

## Task 1: Add self-hosted display font

**Files:**
- Modify: `package.json`
- Modify: `src/app.css:1-46`

- [ ] **Step 1: Install the font package**

Run:
```bash
cd ~/clave-casa && npm install @fontsource/space-grotesk
```
Expected: package added to `dependencies`, no errors.

- [ ] **Step 2: Import the font and expose a display token**

In `src/app.css`, directly after the existing `@import 'tailwindcss';` line (line 1), add:
```css
@import '@fontsource/space-grotesk/500.css';
@import '@fontsource/space-grotesk/600.css';
@import '@fontsource/space-grotesk/700.css';
```

Then inside the existing `:root { … }` block (after the radii vars, before the closing brace ~line 27), add:
```css
	/* Display font for marketing headlines — self-hosted, no off-domain. */
	--font-display: 'Space Grotesk', var(--font-body, system-ui), sans-serif;
```

- [ ] **Step 3: Verify build picks up the font**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors). No type errors from the CSS imports.

- [ ] **Step 4: Commit**

```bash
cd ~/clave-casa && git add package.json package-lock.json src/app.css && git commit -m "feat(marketing): self-host Space Grotesk display font"
```

---

## Task 2: Dark marketing tokens + motion system in app.css

All scoped to `.marketing-root` so `/edit` and `/connect` are untouched.

**Files:**
- Modify: `src/app.css` (append a marketing block at end of file, after `.clave-ambient-layer`)

- [ ] **Step 1: Append the dark token + motion block**

Append to the end of `src/app.css`:
```css
/* ============================================================
   Marketing landing (`/`) — dark theme + motion.
   Everything here is scoped to `.marketing-root` so the light
   app routes (/edit, /connect) are completely unaffected.
   ============================================================ */
.marketing-root {
	color-scheme: dark;

	--m-bg: #0e0b16;
	--m-surface: #181327;
	--m-surface-2: #211a36;
	--m-border: #2a2142;
	--m-border-2: #3a2f59;
	--m-text: #f4f1fb;
	--m-text-muted: #a79fc2;
	--m-text-dim: #6f6789;

	/* Hero/brand accent — Clave Violet (PALETTE[0]). */
	--m-violet: #a14aff;
	--m-violet-soft: #7a8cff;
	--m-sky: #4ae8ff;
	--m-teal: #2effb5;

	min-height: 100vh;
	background: var(--m-bg);
	color: var(--m-text);
	font-family:
		-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
}

.marketing-root .font-display {
	font-family: var(--font-display);
	letter-spacing: -0.02em;
}

/* Gradient headline — violet → sky → teal (Clave hues). */
.marketing-root .gradient-text {
	background: linear-gradient(120deg, var(--m-violet-soft) 0%, var(--m-violet) 45%, var(--m-sky) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
}

/* Glass nav panel once scrolled. */
.marketing-root .glass-panel,
.marketing-glass {
	background: rgba(14, 11, 22, 0.72);
	backdrop-filter: blur(20px) saturate(140%);
	-webkit-backdrop-filter: blur(20px) saturate(140%);
}

/* Reveal-on-scroll: hidden until the `reveal` action adds .is-visible. */
.marketing-root .reveal {
	opacity: 0;
	transform: translateY(20px);
	transition:
		opacity 700ms ease-out,
		transform 700ms ease-out;
}
.marketing-root .reveal.is-visible {
	opacity: 1;
	transform: translateY(0);
}

/* Soft drifting ambient spotlights behind the hero. */
.marketing-root .spotlight {
	border-radius: 9999px;
	filter: blur(8px);
	pointer-events: none;
}
.marketing-root .spotlight-violet {
	background: radial-gradient(closest-side, rgba(161, 74, 255, 0.22), transparent 70%);
}
.marketing-root .spotlight-sky {
	background: radial-gradient(closest-side, rgba(74, 232, 255, 0.16), transparent 70%);
}
.marketing-root .spotlight-teal {
	background: radial-gradient(closest-side, rgba(46, 255, 181, 0.14), transparent 70%);
}

/* Card hover lift. */
.marketing-root .tilt-card {
	transition:
		transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
		box-shadow 320ms ease;
}
.marketing-root .tilt-card:hover {
	transform: translateY(-4px);
	box-shadow: 0 24px 60px -24px rgba(161, 74, 255, 0.3);
}

@keyframes m-phone-hover {
	0%,
	100% {
		transform: translateY(0) rotate(var(--phone-tilt, 0deg));
	}
	50% {
		transform: translateY(-10px) rotate(calc(var(--phone-tilt, 0deg) - 0.5deg));
	}
}
@keyframes m-blob-drift {
	0%,
	100% {
		transform: translate(0, 0) scale(1);
	}
	33% {
		transform: translate(30px, -20px) scale(1.05);
	}
	66% {
		transform: translate(-20px, 25px) scale(0.97);
	}
}
@keyframes m-pulse-dot {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.4;
	}
}

.marketing-root .animate-phone-hover {
	animation: m-phone-hover 7s ease-in-out infinite;
}
.marketing-root .animate-blob-drift {
	animation: m-blob-drift 18s ease-in-out infinite;
}
.marketing-root .animate-pulse-dot {
	animation: m-pulse-dot 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
	.marketing-root .animate-phone-hover,
	.marketing-root .animate-blob-drift,
	.marketing-root .animate-pulse-dot {
		animation: none !important;
	}
	.marketing-root .reveal {
		opacity: 1;
		transform: none;
		transition: none;
	}
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
cd ~/clave-casa && git add src/app.css && git commit -m "feat(marketing): dark tokens + CSS motion system, scoped to .marketing-root"
```

---

## Task 3: `reveal` scroll action (TDD)

**Files:**
- Create: `src/lib/actions/reveal.ts`
- Test: `src/lib/actions/reveal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/actions/reveal.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { reveal } from './reveal';

class MockIO {
	static instances: MockIO[] = [];
	cb: IntersectionObserverCallback;
	elements: Element[] = [];
	constructor(cb: IntersectionObserverCallback) {
		this.cb = cb;
		MockIO.instances.push(this);
	}
	observe(el: Element) {
		this.elements.push(el);
	}
	unobserve() {}
	disconnect() {}
	trigger(el: Element, isIntersecting: boolean) {
		this.cb(
			[{ target: el, isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

beforeEach(() => {
	MockIO.instances = [];
	vi.stubGlobal('IntersectionObserver', MockIO);
});

describe('reveal action', () => {
	it('adds the reveal class immediately and is-visible on intersect', () => {
		const el = document.createElement('div');
		reveal(el);
		expect(el.classList.contains('reveal')).toBe(true);
		expect(el.classList.contains('is-visible')).toBe(false);

		const io = MockIO.instances[0];
		io.trigger(el, true);
		expect(el.classList.contains('is-visible')).toBe(true);
	});

	it('applies a stagger delay via transition-delay', () => {
		const el = document.createElement('div');
		reveal(el, { delay: 120 });
		expect(el.style.transitionDelay).toBe('120ms');
	});

	it('does not reveal when not intersecting', () => {
		const el = document.createElement('div');
		reveal(el);
		MockIO.instances[0].trigger(el, false);
		expect(el.classList.contains('is-visible')).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd ~/clave-casa && npx vitest run src/lib/actions/reveal.test.ts
```
Expected: FAIL — cannot resolve `./reveal`.

- [ ] **Step 3: Write the action**

Create `src/lib/actions/reveal.ts`:
```ts
// Svelte action: reveals an element on scroll into view.
// Adds `.reveal` immediately (so it starts hidden via app.css), then
// `.is-visible` once it intersects. Unobserves after the first reveal.
// Honors reduced-motion implicitly — app.css neutralizes .reveal there.

export interface RevealOptions {
	delay?: number; // stagger, ms
	threshold?: number;
}

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	const { delay = 0, threshold = 0.1 } = options;
	node.classList.add('reveal');
	if (delay) node.style.transitionDelay = `${delay}ms`;

	// SSR / no-IO guard: reveal immediately.
	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-visible');
		return {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('is-visible');
					observer.unobserve(node);
				}
			}
		},
		{ threshold }
	);
	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd ~/clave-casa && npx vitest run src/lib/actions/reveal.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd ~/clave-casa && git add src/lib/actions/reveal.ts src/lib/actions/reveal.test.ts && git commit -m "feat(marketing): reveal-on-scroll action with tests"
```

---

## Task 4: Route-aware layout

Make `/` full-bleed dark; leave every other route exactly as today.

**Files:**
- Modify: `src/routes/+layout.svelte:78-94`

- [ ] **Step 1: Add an `isMarketing` derived value**

In `src/routes/+layout.svelte`, inside `<script>` after `let activePubkey = $state…` (line 15), add:
```ts
	const isMarketing = $derived(page.url.pathname === '/');
```

- [ ] **Step 2: Branch the markup**

Replace the entire template block (current lines 78–94, the `<div class="relative min-h-screen …"> … </div>`) with:
```svelte
{#if isMarketing}
	<!-- Marketing landing owns its own full-bleed dark chrome. The page
	     wraps itself in .marketing-root (see src/app.css) and renders its
	     own nav + footer. No shared light header, no max-w-3xl. -->
	<div class="marketing-root">
		{@render children?.()}
	</div>
{:else}
	<div class="relative min-h-screen bg-neutral-50 text-neutral-900">
		<!-- Ambient gradient overlay (per-active-account). -->
		<div class="clave-ambient-layer" aria-hidden="true"></div>
		<header
			class="sticky top-0 z-20 border-b border-[var(--clave-border)] bg-[var(--clave-surface)] backdrop-blur-xl"
		>
			<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
				<a href="/" class="text-base font-semibold tracking-tight">clave.casa</a>
				<AccountSwitcher />
			</div>
		</header>
		<main class="relative z-10 mx-auto max-w-3xl px-4 py-6">
			{@render children?.()}
		</main>
	</div>
{/if}
```

- [ ] **Step 3: Verify app routes are unchanged**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

Then start the dev server (background) and confirm `/connect` still renders the light header:
```bash
cd ~/clave-casa && npm run dev
```
Use the preview tools: load `/connect`, snapshot — expect the light `clave.casa` header + account switcher unchanged. Load `/` — expect a dark (currently empty/old) body since the page isn't recomposed yet; that's fine at this stage.

- [ ] **Step 4: Commit**

```bash
cd ~/clave-casa && git add src/routes/+layout.svelte && git commit -m "feat(marketing): route-aware layout — full-bleed dark on / only"
```

---

## Task 5: `PhoneMockup` component (screenshot-ready)

**Files:**
- Create: `src/lib/components/marketing/PhoneMockup.svelte`

- [ ] **Step 1: Write the component**

Create `src/lib/components/marketing/PhoneMockup.svelte`:
```svelte
<!-- Stylized iPhone frame for the marketing page. Renders an <img> when
     `src` is provided (real screenshot), otherwise a styled faux-screen
     passed in via the `screen` snippet. This is the screenshot-swap seam:
     drop a real /screenshots/*.png into `src` later and the faux-screen
     is bypassed. Decorative — aria-hidden. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		src = undefined,
		alt = '',
		tilt = 0,
		glow = 'violet',
		float = true,
		screen = undefined
	}: {
		src?: string;
		alt?: string;
		tilt?: number;
		glow?: 'violet' | 'sky' | 'teal';
		float?: boolean;
		screen?: Snippet;
	} = $props();

	const glowMap = {
		violet: 'rgba(161,74,255,0.30)',
		sky: 'rgba(74,232,255,0.26)',
		teal: 'rgba(46,255,181,0.24)'
	};
</script>

<div
	class="relative mx-auto w-[230px] shrink-0 sm:w-[260px] {float ? 'animate-phone-hover' : ''}"
	style="--phone-tilt: {tilt}deg; transform: rotate({tilt}deg);"
	aria-hidden="true"
>
	<!-- glow -->
	<div
		class="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] blur-2xl"
		style="background: radial-gradient(closest-side, {glowMap[glow]}, transparent 70%);"
	></div>

	<!-- frame -->
	<div
		class="relative overflow-hidden rounded-[2.25rem] border-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
		style="border-color: var(--m-border-2); background: #0b0910;"
	>
		<!-- notch -->
		<div
			class="absolute left-1/2 top-1.5 z-10 h-5 w-[38%] -translate-x-1/2 rounded-full"
			style="background: #0b0910;"
		></div>

		<div class="relative aspect-[10/20.5] w-full overflow-hidden rounded-[1.85rem]">
			{#if src}
				<img {src} {alt} class="h-full w-full object-cover" loading="lazy" />
			{:else if screen}
				{@render screen()}
			{/if}
		</div>
	</div>
</div>
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
cd ~/clave-casa && git add src/lib/components/marketing/PhoneMockup.svelte && git commit -m "feat(marketing): screenshot-ready PhoneMockup component"
```

---

## Task 6: Feature-row content data

**Files:**
- Modify: `src/lib/marketing.ts` (append exports)

- [ ] **Step 1: Append the typed content array**

Append to `src/lib/marketing.ts`:
```ts
// Feature-row content for the landing page. `accent` indexes PALETTE
// (src/lib/theme.ts) so each row pulls a distinct Clave gradient.
export interface FeatureRowContent {
	eyebrow: string;
	title: string;
	body: string;
	bullets: string[];
	accent: number; // PALETTE index
	glow: 'violet' | 'sky' | 'teal';
}

export const FEATURE_ROWS: readonly FeatureRowContent[] = [
	{
		eyebrow: 'Secure Enclave',
		title: 'Your nsec never leaves your phone',
		body: 'Your private key is generated and stored in the iOS Secure Enclave. Every signature is produced locally on your device — clave.casa, relays, and the apps you use never see it.',
		bullets: ['Hardware-backed key storage', 'No key export, ever', 'Nothing to leak server-side'],
		accent: 0,
		glow: 'violet'
	},
	{
		eyebrow: 'Approve to sign',
		title: 'Nothing gets signed without you',
		body: 'When a Nostr client asks for a signature, Clave shows you exactly what it is — the kind, the content, who is asking — and waits. Tap to approve, or decline.',
		bullets: ['See every request in plain language', 'One tap to sign or reject', 'Set always-allow per app and kind'],
		accent: 4,
		glow: 'sky'
	},
	{
		eyebrow: 'Multi-account',
		title: 'Many identities, one signer',
		body: 'Pair several Nostr accounts and switch between them with a tap. Each identity gets its own deterministic gradient, so you always know which key is about to sign.',
		bullets: ['Up to multiple accounts', 'A distinct gradient per identity', 'Same colors on iOS and on the web'],
		accent: 1,
		glow: 'teal'
	},
	{
		eyebrow: 'NIP-46',
		title: 'Works with any Nostr client',
		body: 'Clave is a standard NIP-46 remote signer. Scan a QR code or paste a bunker URI from any compatible client and it just connects — no browser extension, no copy-pasting keys.',
		bullets: ['Scan a QR or paste a bunker URI', 'No extension required', 'Compatible across the NIP-46 ecosystem'],
		accent: 7,
		glow: 'violet'
	},
	{
		eyebrow: 'Battery-friendly',
		title: 'Always ready, never draining',
		body: 'Clave wakes only when an app needs you to sign, handles the request, and goes back to sleep. No background polling, no battery drain.',
		bullets: ['Push-woken, not always-on', 'No background battery cost', 'Instant when you need it'],
		accent: 8,
		glow: 'teal'
	}
];
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
cd ~/clave-casa && git add src/lib/marketing.ts && git commit -m "feat(marketing): feature-row content data"
```

---

## Task 7: `MarketingNav`

**Files:**
- Create: `src/lib/components/marketing/MarketingNav.svelte`

- [ ] **Step 1: Write the component**

Create `src/lib/components/marketing/MarketingNav.svelte`:
```svelte
<!-- Fixed nav: transparent at top, glass panel once scrolled. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL } from '$lib/marketing';

	// Static asset in static/ — referenced by absolute path, not imported.
	const clave = '/clave-icon.png';

	let scrolled = $state(false);
	onMount(() => {
		const onScroll = () => (scrolled = window.scrollY > 16);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<nav
	class="fixed inset-x-0 top-0 z-50 transition-all duration-300 {scrolled
		? 'marketing-glass border-b'
		: ''}"
	style={scrolled ? 'border-color: var(--m-border);' : ''}
>
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-2 font-display text-xl font-bold">
			<img src={clave} alt="" class="h-7 w-7 rounded-[8px]" />
			<span style="color: var(--m-text)">clave</span>
		</a>
		<a
			href={CLAVE_INSTALL_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-full px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5"
			style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;"
		>
			Download — {CLAVE_INSTALL_LABEL}
		</a>
	</div>
</nav>
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
cd ~/clave-casa && git add src/lib/components/marketing/MarketingNav.svelte && git commit -m "feat(marketing): glass-on-scroll nav"
```

---

## Task 8: `HeroSection`

**Files:**
- Create: `src/lib/components/marketing/HeroSection.svelte`

- [ ] **Step 1: Write the component**

Create `src/lib/components/marketing/HeroSection.svelte`:
```svelte
<!-- Hero: gradient headline, CTAs, trust chips, 3-phone cluster, blobs. -->
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import PhoneMockup from './PhoneMockup.svelte';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL } from '$lib/marketing';

	const chips = [
		{ label: 'nsec never leaves your phone', color: 'var(--m-violet)' },
		{ label: 'No battery drain', color: 'var(--m-sky)' },
		{ label: 'Works with any client', color: 'var(--m-teal)' },
		{ label: 'Open source', color: 'var(--m-violet-soft)' }
	];

	function scrollToFeatures() {
		document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<section class="relative flex min-h-svh items-center overflow-hidden px-6 pb-20 pt-28 md:pt-32">
	<!-- ambient blobs -->
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div class="spotlight spotlight-violet animate-blob-drift absolute -left-[10%] top-[8%] h-[55vh] w-[55vh]"></div>
		<div class="spotlight spotlight-sky animate-blob-drift absolute -right-[6%] top-[22%] h-[60vh] w-[60vh]" style="animation-delay: -6s"></div>
		<div class="spotlight spotlight-teal animate-blob-drift absolute bottom-[-10%] left-[22%] h-[45vh] w-[45vh]" style="animation-delay: -12s"></div>
	</div>

	<div class="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
		<div class="text-center lg:text-left">
			<h1
				use:reveal={{ delay: 60 }}
				class="font-display mb-6 text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[0.98]"
				style="color: var(--m-text)"
			>
				Approve every Nostr<br />signature from your
				<span class="gradient-text">iPhone</span>.
			</h1>
			<p
				use:reveal={{ delay: 150 }}
				class="mx-auto mb-9 max-w-xl text-lg leading-relaxed lg:mx-0"
				style="color: var(--m-text-muted)"
			>
				Clave is a remote Nostr signer. Your private key is generated and stored in the iOS
				Secure Enclave — and never leaves it.
			</p>

			<div use:reveal={{ delay: 240 }} class="mb-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
				<a
					href={CLAVE_INSTALL_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
					style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;"
				>
					Download — {CLAVE_INSTALL_LABEL}
				</a>
				<button
					type="button"
					onclick={scrollToFeatures}
					class="rounded-xl border px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
					style="border-color: var(--m-border-2); color: var(--m-text)"
				>
					See how it works
				</button>
			</div>

			<div use:reveal={{ delay: 360 }} class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs lg:justify-start" style="color: var(--m-text-dim)">
				{#each chips as chip}
					<span class="inline-flex items-center gap-1.5">
						<span class="h-1.5 w-1.5 rounded-full" style="background: {chip.color}"></span>
						{chip.label}
					</span>
				{/each}
			</div>
		</div>

		<!-- phone cluster -->
		<div use:reveal={{ delay: 200 }} class="relative hidden lg:block">
			<div class="relative mx-auto flex h-[560px] w-full max-w-md items-center justify-center">
				<div class="absolute left-0 top-10">
					<PhoneMockup tilt={-8} glow="sky">
						{#snippet screen()}
							{@render fauxScreen('Account switcher', 'switch identities')}
						{/snippet}
					</PhoneMockup>
				</div>
				<div class="absolute right-0 top-24 z-10">
					<PhoneMockup tilt={6} glow="teal">
						{#snippet screen()}
							{@render fauxScreen('Connect', 'scan a QR or paste a bunker URI')}
						{/snippet}
					</PhoneMockup>
				</div>
				<div class="relative z-20">
					<PhoneMockup tilt={-2} glow="violet">
						{#snippet screen()}
							{@render approvalScreen()}
						{/snippet}
					</PhoneMockup>
				</div>
			</div>
		</div>
		<div use:reveal={{ delay: 300 }} class="flex justify-center lg:hidden">
			<PhoneMockup tilt={-2} glow="violet">
				{#snippet screen()}
					{@render approvalScreen()}
				{/snippet}
			</PhoneMockup>
		</div>
	</div>
</section>

{#snippet fauxScreen(title: string, subtitle: string)}
	<div class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center" style="background: linear-gradient(160deg, var(--m-surface-2), #0b0910);">
		<div class="h-3 w-3 rounded-full" style="background: var(--m-violet)"></div>
		<p class="font-display text-lg font-semibold" style="color: var(--m-text)">{title}</p>
		<p class="text-[11px]" style="color: var(--m-text-muted)">{subtitle}</p>
	</div>
{/snippet}

{#snippet approvalScreen()}
	<div class="flex h-full flex-col p-4" style="background: linear-gradient(160deg, var(--m-surface-2), #0b0910);">
		<div class="mt-6 rounded-2xl border p-4" style="border-color: var(--m-border-2); background: var(--m-surface);">
			<div class="text-[9px] font-semibold uppercase tracking-wide" style="color: var(--m-text-dim)">Sign event from</div>
			<div class="mt-1 font-mono text-xs font-semibold" style="color: var(--m-text)">jumble.social</div>
			<hr class="my-3" style="border-color: var(--m-border)" />
			<div class="text-[10px] leading-relaxed" style="color: var(--m-text-muted)">kind:1 note · signed locally on your device</div>
			<div class="mt-4 flex flex-col gap-1.5">
				<div class="rounded-xl py-2 text-center text-xs font-semibold" style="background: var(--m-violet); color: #fff">Sign</div>
				<div class="rounded-xl border py-2 text-center text-xs font-semibold" style="border-color: var(--m-border-2); color: var(--m-text-muted)">Decline</div>
			</div>
		</div>
	</div>
{/snippet}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
cd ~/clave-casa && git add src/lib/components/marketing/HeroSection.svelte && git commit -m "feat(marketing): hero with 3-phone cluster + ambient blobs"
```

---

## Task 9: `FeatureRow` + `FeaturesSection`

**Files:**
- Create: `src/lib/components/marketing/FeatureRow.svelte`
- Create: `src/lib/components/marketing/FeaturesSection.svelte`

- [ ] **Step 1: Write `FeatureRow`**

Create `src/lib/components/marketing/FeatureRow.svelte`:
```svelte
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import PhoneMockup from './PhoneMockup.svelte';
	import { PALETTE } from '$lib/theme';
	import type { FeatureRowContent } from '$lib/marketing';

	let { row, index }: { row: FeatureRowContent; index: number } = $props();

	const theme = $derived(PALETTE[row.accent]);
	const isEven = $derived(index % 2 === 0);
	const tilt = $derived(isEven ? -3 : 3);
</script>

<div class="grid items-center gap-12 md:grid-cols-2 md:gap-16">
	<div use:reveal class={isEven ? '' : 'md:order-2'}>
		<div
			class="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
			style="border-color: {theme.start}55; background: {theme.start}1a; color: {theme.start};"
		>
			<span class="h-1.5 w-1.5 rounded-full" style="background: {theme.start}"></span>
			{row.eyebrow}
		</div>
		<h3 class="font-display mb-5 text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-[1.1]" style="color: var(--m-text)">
			{row.title}
		</h3>
		<p class="mb-6 max-w-lg text-[17px] leading-relaxed" style="color: var(--m-text-muted)">
			{row.body}
		</p>
		<ul class="space-y-2.5">
			{#each row.bullets as b}
				<li class="flex items-start gap-3 text-[15px]" style="color: var(--m-text-muted)">
					<span class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style="background: {theme.start}1a; color: {theme.start}">✓</span>
					{b}
				</li>
			{/each}
		</ul>
	</div>

	<div use:reveal={{ delay: 120 }} class="flex justify-center {isEven ? '' : 'md:order-1'}">
		<PhoneMockup tilt={tilt} glow={row.glow}>
			{#snippet screen()}
				<div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" style="background: linear-gradient(160deg, {theme.start}26, #0b0910);">
					<div class="h-12 w-12 rounded-2xl" style="background: linear-gradient(135deg, {theme.start}, {theme.end})"></div>
					<p class="font-display text-base font-semibold" style="color: var(--m-text)">{row.eyebrow}</p>
					<p class="text-[10px] uppercase tracking-[0.2em]" style="color: var(--m-text-dim)">screenshot soon</p>
				</div>
			{/snippet}
		</PhoneMockup>
	</div>
</div>
```

- [ ] **Step 2: Write `FeaturesSection`**

Create `src/lib/components/marketing/FeaturesSection.svelte`:
```svelte
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import FeatureRow from './FeatureRow.svelte';
	import { FEATURE_ROWS } from '$lib/marketing';
</script>

<section id="features" class="relative overflow-hidden px-6 py-24 md:py-32">
	<div class="mx-auto max-w-6xl">
		<div use:reveal class="mb-20 text-center">
			<p class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style="color: var(--m-text-muted)">
				What Clave does
			</p>
			<h2 class="font-display mx-auto max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
				A signer that stays out of your way <span class="gradient-text">until it matters.</span>
			</h2>
		</div>

		<div class="flex flex-col gap-28 md:gap-36">
			{#each FEATURE_ROWS as row, i}
				<FeatureRow {row} index={i} />
			{/each}
		</div>
	</div>
</section>
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 4: Commit**

```bash
cd ~/clave-casa && git add src/lib/components/marketing/FeatureRow.svelte src/lib/components/marketing/FeaturesSection.svelte && git commit -m "feat(marketing): alternating feature rows"
```

---

## Task 10: `HowItWorks`

**Files:**
- Create: `src/lib/components/marketing/HowItWorks.svelte`

- [ ] **Step 1: Write the component**

Create `src/lib/components/marketing/HowItWorks.svelte`:
```svelte
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const steps = [
		{ n: 1, title: 'Install Clave on iPhone', body: 'iOS 16+, free via TestFlight while we are in beta.' },
		{ n: 2, title: 'Add your Nostr account', body: 'Paste an existing nsec or generate a fresh one. It is stored in the Secure Enclave on your device.' },
		{ n: 3, title: 'Sign from any client', body: 'Scan a QR or paste a bunker URI from any NIP-46 client. Tap to approve.' }
	];
</script>

<section id="how" class="relative overflow-hidden px-6 py-24 md:py-28">
	<div class="mx-auto max-w-6xl">
		<div use:reveal class="mb-14 text-center">
			<p class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style="color: var(--m-text-muted)">How it works</p>
			<h2 class="font-display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
				Three steps, then forget about it.
			</h2>
		</div>
		<div class="grid gap-5 md:grid-cols-3">
			{#each steps as step, i}
				<div use:reveal={{ delay: i * 90 }} class="rounded-3xl border p-7" style="border-color: var(--m-border); background: var(--m-surface);">
					<div class="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold" style="background: var(--m-violet); color: #fff">{step.n}</div>
					<h3 class="font-display mt-5 text-lg font-semibold" style="color: var(--m-text)">{step.title}</h3>
					<p class="mt-2 text-[15px] leading-relaxed" style="color: var(--m-text-muted)">{step.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors).

- [ ] **Step 3: Commit**

```bash
cd ~/clave-casa && git add src/lib/components/marketing/HowItWorks.svelte && git commit -m "feat(marketing): how-it-works 3-step section"
```

---

## Task 11: Live testimonials (data + fetch + component)

Ships safe with an empty curated list (renders nothing / fallback). Real event IDs are backfilled later.

**Files:**
- Create: `src/lib/testimonials.ts`
- Test: `src/lib/testimonials.test.ts`
- Create: `src/lib/components/marketing/Testimonials.svelte`

- [ ] **Step 1: Write the failing test for `normalizeTestimonial`**

Create `src/lib/testimonials.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { normalizeTestimonial, cleanContent } from './testimonials';
import type { Event } from 'nostr-tools/core';

const ev = (over: Partial<Event> = {}): Event =>
	({
		id: 'abc',
		pubkey: 'def',
		created_at: 1,
		kind: 1,
		tags: [],
		content: 'Clave is great nostr:nprofile1xxxx   really',
		sig: 'z',
		...over
	}) as Event;

describe('cleanContent', () => {
	it('strips nostr: mentions and collapses whitespace', () => {
		expect(cleanContent(ev().content)).toBe('Clave is great really');
	});
});

describe('normalizeTestimonial', () => {
	it('maps an event + profile into a card model', () => {
		const t = normalizeTestimonial(ev(), { name: 'Alice', picture: 'http://x/a.png' });
		expect(t.eventId).toBe('abc');
		expect(t.displayName).toBe('Alice');
		expect(t.picture).toBe('http://x/a.png');
		expect(t.content).toBe('Clave is great really');
		expect(t.nevent.startsWith('nevent1')).toBe(true);
	});

	it('falls back to a short pubkey when no profile name', () => {
		const t = normalizeTestimonial(ev({ pubkey: '0123456789abcdef' }), {});
		expect(t.displayName).toBe('0123456789');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd ~/clave-casa && npx vitest run src/lib/testimonials.test.ts
```
Expected: FAIL — cannot resolve `./testimonials`.

- [ ] **Step 3: Write `testimonials.ts`**

Create `src/lib/testimonials.ts`:
```ts
// Curated, verifiable testimonials about Clave. Each entry is a real
// kind:1 note id; the page fetches the live event + author profile and
// links to njump so visitors can verify it. Ships empty — backfill ids
// once sourced (via nak) and approved.

import type { Event } from 'nostr-tools/core';
import type { Filter } from 'nostr-tools/filter';
import { neventEncode } from 'nostr-tools/nip19';
import { getPool } from './signer';
import { SCAN_SET } from './relays';

// Hand-picked event ids (hex) of real notes about Clave. Empty until sourced.
export const TESTIMONIAL_EVENT_IDS: readonly string[] = [];

export interface Testimonial {
	eventId: string;
	pubkey: string;
	displayName: string;
	picture: string;
	content: string;
	nevent: string;
}

export function cleanContent(content: string): string {
	return content
		.replace(/nostr:n(profile|pub|event|ote)1[a-z0-9]+/gi, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

export function normalizeTestimonial(
	event: Event,
	profile: { name?: string; display_name?: string; picture?: string }
): Testimonial {
	const displayName =
		profile.display_name || profile.name || event.pubkey.slice(0, 10);
	return {
		eventId: event.id,
		pubkey: event.pubkey,
		displayName,
		picture: profile.picture || '',
		content: cleanContent(event.content),
		nevent: neventEncode({ id: event.id, author: event.pubkey })
	};
}

const FETCH_TIMEOUT_MS = 4000;

// Fetch the curated notes + their author profiles live. Returns [] on any
// failure or when the curated list is empty — the UI degrades gracefully.
export async function fetchTestimonials(): Promise<Testimonial[]> {
	if (TESTIMONIAL_EVENT_IDS.length === 0) return [];

	const notes = await collect({ ids: [...TESTIMONIAL_EVENT_IDS] });
	if (notes.length === 0) return [];

	const authors = Array.from(new Set(notes.map((n) => n.pubkey)));
	const profileEvents = await collect({ kinds: [0], authors });
	const profiles = new Map<string, { name?: string; display_name?: string; picture?: string }>();
	for (const pe of profileEvents) {
		try {
			profiles.set(pe.pubkey, JSON.parse(pe.content));
		} catch {
			// ignore malformed kind:0
		}
	}

	// Preserve the curated order.
	const byId = new Map(notes.map((n) => [n.id, n]));
	return TESTIMONIAL_EVENT_IDS.map((id) => byId.get(id))
		.filter((n): n is Event => Boolean(n))
		.map((n) => normalizeTestimonial(n, profiles.get(n.pubkey) ?? {}));
}

function collect(filter: Filter): Promise<Event[]> {
	return new Promise((resolve) => {
		const out: Event[] = [];
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			resolve(out);
		};
		const sub = getPool().subscribeManyEose(SCAN_SET, filter, {
			onevent: (e) => out.push(e),
			onclose: finish,
			maxWait: FETCH_TIMEOUT_MS
		});
		setTimeout(() => {
			sub.close();
			finish();
		}, FETCH_TIMEOUT_MS + 500);
	});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd ~/clave-casa && npx vitest run src/lib/testimonials.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Write `Testimonials.svelte`**

Create `src/lib/components/marketing/Testimonials.svelte`:
```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { reveal } from '$lib/actions/reveal';
	import { PALETTE } from '$lib/theme';
	import { fetchTestimonials, type Testimonial } from '$lib/testimonials';

	let items = $state<Testimonial[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			items = await fetchTestimonials();
		} finally {
			loading = false;
		}
	});

	const tilts = [-1, 1.2, -0.8, 0.6, -1.4, 0.9];
</script>

{#if loading || items.length > 0}
	<section id="love" class="relative overflow-hidden px-6 py-24 md:py-32">
		<div class="spotlight spotlight-violet pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[60vh] w-[60vh] -translate-x-1/2"></div>
		<div class="mx-auto max-w-6xl">
			<div use:reveal class="mb-14 text-center">
				<p class="font-display mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style="color: var(--m-text-muted)">From people already on it</p>
				<h2 class="font-display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
					Don't just take <span class="gradient-text">our word</span> for it.
				</h2>
				<p class="mx-auto mt-4 max-w-md text-[15px]" style="color: var(--m-text-muted)">
					Every quote is a real, verifiable note loaded live from the Nostr network — in your browser.
				</p>
			</div>

			{#if loading}
				<div class="flex items-center justify-center gap-3 py-16 text-sm" style="color: var(--m-text-dim)">
					<div class="h-5 w-5 animate-spin rounded-full border-2" style="border-color: var(--m-border-2); border-top-color: var(--m-violet)"></div>
					Loading notes…
				</div>
			{:else}
				<div class="columns-1 gap-5 md:columns-2 lg:columns-3">
					{#each items as t, i (t.eventId)}
						{@const theme = PALETTE[i % PALETTE.length]}
						<a
							use:reveal={{ delay: i * 40 }}
							href={`https://njump.me/${t.nevent}`}
							target="_blank"
							rel="noopener noreferrer"
							class="tilt-card mb-5 block break-inside-avoid rounded-3xl border p-6"
							style="border-color: var(--m-border); background: var(--m-surface); transform: rotate({tilts[i % tilts.length]}deg);"
						>
							<div class="mb-4 -mx-6 -mt-6 rounded-t-3xl px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style="background: linear-gradient(120deg, {theme.start}26, transparent); color: var(--m-text-muted)">
								A real note about Clave
							</div>
							<p class="mb-5 text-[15px] leading-[1.7]" style="color: var(--m-text)">“{t.content}”</p>
							<div class="flex items-center gap-2.5">
								{#if t.picture}
									<img src={t.picture} alt="" loading="lazy" class="h-8 w-8 rounded-full border object-cover" style="border-color: var(--m-border-2)" />
								{/if}
								<span class="text-xs font-semibold" style="color: var(--m-text-muted)">{t.displayName}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}
```

- [ ] **Step 6: Verify compile + tests**

Run:
```bash
cd ~/clave-casa && npm run check && npx vitest run
```
Expected: PASS (all tests, 0 type errors).

- [ ] **Step 7: Commit**

```bash
cd ~/clave-casa && git add src/lib/testimonials.ts src/lib/testimonials.test.ts src/lib/components/marketing/Testimonials.svelte && git commit -m "feat(marketing): live curated testimonials (safe-empty)"
```

---

## Task 12: Privacy, Download CTA, Footer

**Files:**
- Create: `src/lib/components/marketing/PrivacySection.svelte`
- Create: `src/lib/components/marketing/DownloadCTA.svelte`
- Create: `src/lib/components/marketing/MarketingFooter.svelte`

- [ ] **Step 1: Write `PrivacySection`**

Create `src/lib/components/marketing/PrivacySection.svelte`:
```svelte
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';

	const points = [
		{ title: 'Your nsec never leaves your signer.', body: 'In Clave it lives in the iOS Secure Enclave. Signatures happen on your device.' },
		{ title: 'No analytics, no telemetry, no trackers.', body: 'No third-party scripts, no off-domain fonts or icons. This page is a static bundle.' },
		{ title: 'Live data comes straight from relays.', body: 'The notes shown here load directly from public Nostr relays in your browser — no intermediary.' },
		{ title: 'Open source.', body: 'Clave iOS and clave.casa are both MIT-licensed. Read the code, file issues, send patches.' }
	];
</script>

<section class="relative overflow-hidden px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<div use:reveal class="mb-12 text-center">
			<h2 class="font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
				Privacy by <span class="gradient-text">construction.</span>
			</h2>
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			{#each points as p, i}
				<div use:reveal={{ delay: i * 70 }} class="rounded-3xl border p-6" style="border-color: var(--m-border); background: var(--m-surface);">
					<div class="text-sm font-semibold" style="color: var(--m-text)">{p.title}</div>
					<div class="mt-2 text-sm leading-relaxed" style="color: var(--m-text-muted)">{p.body}</div>
				</div>
			{/each}
		</div>
	</div>
</section>
```

- [ ] **Step 2: Write `DownloadCTA`**

Create `src/lib/components/marketing/DownloadCTA.svelte`:
```svelte
<script lang="ts">
	import { reveal } from '$lib/actions/reveal';
	import { CLAVE_INSTALL_URL, CLAVE_INSTALL_LABEL } from '$lib/marketing';
</script>

<section class="relative overflow-hidden px-6 py-24">
	<div use:reveal class="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] border px-8 py-16 text-center" style="border-color: var(--m-border-2); background: radial-gradient(closest-side at 50% 0%, rgba(161,74,255,0.22), var(--m-surface));">
		<h2 class="font-display mx-auto max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05]" style="color: var(--m-text)">
			Hold your own keys. <span class="gradient-text">Sign with a tap.</span>
		</h2>
		<p class="mx-auto mt-4 max-w-md text-[15px]" style="color: var(--m-text-muted)">
			Clave is free while we are in beta. iOS 16 and up.
		</p>
		<div class="mt-8 flex justify-center">
			<a href={CLAVE_INSTALL_URL} target="_blank" rel="noopener noreferrer" class="rounded-xl px-6 py-3.5 text-sm font-semibold transition-transform active:scale-95" style="background: linear-gradient(120deg, var(--m-violet-soft), var(--m-violet)); color: #fff;">
				Download — {CLAVE_INSTALL_LABEL}
			</a>
		</div>
	</div>
</section>
```

- [ ] **Step 3: Write `MarketingFooter`**

Create `src/lib/components/marketing/MarketingFooter.svelte`:
```svelte
<script lang="ts">
	import {
		TESTFLIGHT_URL,
		CLAVE_REPO_URL,
		CLAVE_CASA_REPO_URL,
		NIP46_SPEC_URL,
		CREDIT_NJUMP_URL
	} from '$lib/marketing';

	let { creditLabel }: { creditLabel: string } = $props();
</script>

<footer class="px-6 pb-12 pt-6">
	<div class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 border-t pt-8 text-xs sm:flex-row sm:items-center" style="border-color: var(--m-border); color: var(--m-text-dim);">
		<div class="space-y-1">
			<div style="color: var(--m-text-muted)">clave.casa</div>
			<div>
				A small thing by
				<a class="underline hover:no-underline" href={CREDIT_NJUMP_URL} target="_blank" rel="noopener noreferrer" style="color: var(--m-text-muted)">{creditLabel}</a>.
			</div>
		</div>
		<div class="flex flex-wrap gap-x-4 gap-y-1">
			<a class="hover:underline" href={CLAVE_CASA_REPO_URL} target="_blank" rel="noopener noreferrer">clave.casa</a>
			<a class="hover:underline" href={CLAVE_REPO_URL} target="_blank" rel="noopener noreferrer">Clave iOS</a>
			<a class="hover:underline" href={NIP46_SPEC_URL} target="_blank" rel="noopener noreferrer">NIP-46 spec</a>
			<a class="hover:underline" href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer">TestFlight</a>
		</div>
	</div>
</footer>
```

- [ ] **Step 4: Verify it compiles**

Run:
```bash
cd ~/clave-casa && npm run check
```
Expected: PASS (0 errors). If any of `CLAVE_REPO_URL`, `CLAVE_CASA_REPO_URL`, `NIP46_SPEC_URL`, `CREDIT_NJUMP_URL` are not exported from `marketing.ts`, confirm their names with `grep -n "export const" src/lib/marketing.ts` and adjust imports — these are all referenced by the current `+page.svelte`, so they exist.

- [ ] **Step 5: Commit**

```bash
cd ~/clave-casa && git add src/lib/components/marketing/PrivacySection.svelte src/lib/components/marketing/DownloadCTA.svelte src/lib/components/marketing/MarketingFooter.svelte && git commit -m "feat(marketing): privacy, download CTA, footer"
```

---

## Task 13: Recompose the landing page

Replace the page body; remove the editor section; preserve the signed-in redirect and the credit-line fetch.

**Files:**
- Modify: `src/routes/+page.svelte` (full rewrite of template; keep script logic)

- [ ] **Step 1: Rewrite `+page.svelte`**

Replace the entire contents of `src/routes/+page.svelte` with:
```svelte
<!-- src/routes/+page.svelte
     Marketing landing (Clave iOS-led, dark redesign). First-time visitors
     see the full page; users with a stored connection auto-redirect to
     /edit. The dark .marketing-root wrapper is provided by +layout.svelte's
     route-aware branch for `/`. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { npubEncode } from 'nostr-tools/nip19';
	import { loadConnections, getActiveConnection } from '$lib/connections';
	import { fetchLatestProfile } from '$lib/propagation';
	import { displayLabel } from '$lib/labels';
	import { CREDIT_PUBKEY_HEX } from '$lib/marketing';

	import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
	import HeroSection from '$lib/components/marketing/HeroSection.svelte';
	import FeaturesSection from '$lib/components/marketing/FeaturesSection.svelte';
	import HowItWorks from '$lib/components/marketing/HowItWorks.svelte';
	import Testimonials from '$lib/components/marketing/Testimonials.svelte';
	import PrivacySection from '$lib/components/marketing/PrivacySection.svelte';
	import DownloadCTA from '$lib/components/marketing/DownloadCTA.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';

	let creditLabel = $state(npubEncode(CREDIT_PUBKEY_HEX).slice(0, 12));

	onMount(() => {
		const conns = loadConnections();
		if (conns.length > 0 && getActiveConnection()) {
			goto('/edit', { replaceState: true });
			return;
		}
		void (async () => {
			try {
				const result = await fetchLatestProfile(CREDIT_PUBKEY_HEX);
				if (result.status !== 'found') return;
				const profile = JSON.parse(result.event.content);
				creditLabel = displayLabel({ profile, pubkeyHex: CREDIT_PUBKEY_HEX });
			} catch {
				// keep npub-prefix fallback
			}
		})();
	});
</script>

<svelte:head>
	<title>Clave — A NIP-46 remote signer for iPhone</title>
	<meta
		name="description"
		content="Approve every Nostr signature from your iPhone. Your nsec stays in the Secure Enclave."
	/>
</svelte:head>

<MarketingNav />
<main>
	<HeroSection />
	<HowItWorks />
	<FeaturesSection />
	<Testimonials />
	<PrivacySection />
	<DownloadCTA />
</main>
<MarketingFooter {creditLabel} />
```

Note the section order matches the spec: Hero → How it works → Features → Testimonials → Privacy → Download CTA → Footer. (`HowItWorks` carries `id="how"`, the hero's "See how it works" scroll target.)

- [ ] **Step 2: Remove the now-unused editor/hero mockup components**

Check for any remaining importers, then delete:
```bash
cd ~/clave-casa && grep -rn "EditorMockup\|HeroPhone" src --include=*.svelte --include=*.ts | grep -v "components/marketing/EditorMockup.svelte\|components/marketing/HeroPhone.svelte"
```
Expected: no output (no importers remain). If clean, remove the files:
```bash
cd ~/clave-casa && git rm src/lib/components/marketing/EditorMockup.svelte src/lib/components/marketing/HeroPhone.svelte
```
If `grep` shows an importer, leave the files and resolve that importer first.

- [ ] **Step 3: Verify compile + full test suite**

Run:
```bash
cd ~/clave-casa && npm run check && npx vitest run
```
Expected: PASS (0 type errors, all tests green).

- [ ] **Step 4: Commit**

```bash
cd ~/clave-casa && git add -A && git commit -m "feat(marketing): recompose dark landing; remove web-editor section"
```

---

## Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Build the static bundle**

Run:
```bash
cd ~/clave-casa && npm run build
```
Expected: build succeeds, no prerender errors.

- [ ] **Step 2: Drive the dev server with preview tools**

Start (background):
```bash
cd ~/clave-casa && npm run dev
```
Then, using the preview tools, verify:
- `/` renders the dark hero with the 3-phone cluster, headline, CTAs, trust chips.
- Scrolling fires reveal animations on features / how-it-works / privacy.
- The nav turns to a glass panel after scrolling.
- "See how it works" scrolls to the How-it-works section.
- Testimonials section is absent (curated list empty) — page still looks complete.
- `prefers-reduced-motion`: emulate reduced motion (preview/devtools) and confirm content is visible with animations disabled.
- **Regression:** `/connect` and `/edit` still render the light header + `max-w-3xl` shell, unchanged.

Capture a screenshot of `/` for the user.

- [ ] **Step 3: Stop the dev server**

Stop the background dev server.

- [ ] **Step 4: Final commit (if any verification fixes were needed)**

```bash
cd ~/clave-casa && git add -A && git commit -m "fix(marketing): verification-pass polish" || echo "nothing to commit"
```

---

## Post-plan follow-ups (not blocking)

- Source + approve real testimonial event IDs (`nak`), populate `TESTIMONIAL_EVENT_IDS`.
- Capture real Clave screenshots and pass them to `PhoneMockup` `src` (hero + feature rows).
- Open the PR from `feat/landing-redesign`; merge to `main` triggers the Cloudflare Pages deploy.
