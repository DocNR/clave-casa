# Marketing landing page (clave.casa root, Clave iOS-led)

_2026-05-02 · status: approved-pending-implementation_

## Context

clave.casa's `/` route currently renders a one-paragraph placeholder with a single "Connect" CTA. With the design system unification done (`docs/design-system.md`) and the web companion at MVP, the apex is overdue for a real landing page.

**Reframe.** The marketing page is *primarily* selling the **Clave iOS app** — Clave is the flagship NIP-46 signer; clave.casa is its web companion. Clave iOS doesn't have its own marketing site, so clave.casa's apex carries that weight. The web profile editor is positioned as a secondary feature ("…and you can also edit your profile from the browser") rather than the headline.

The page must:

1. Welcome a stranger arriving from a tweet / Nostr post / search and explain what Clave is in <10 seconds.
2. Validate the design system end-to-end — AccountTheme palette, identity/functional zones, sentence-case headlines, anti-pattern checklist (`docs/design-system.md` §11).
3. Maintain the privacy promise — no analytics, no third-party scripts, no off-domain fonts, no CDN-loaded JS, no tracking.
4. Preserve the existing `onMount` auto-redirect — users with a stored connection land on `/edit`, not the marketing page.

## Approach

**Tall scrolling marketing, ~5 viewports.** Seven sections, each scaled to its content. The page exercises the design system: identity zone (header + ambient gradient + brand tint) carries Violet for first-time visitors; functional zone (cards, lists, mockup) uses neutral surfaces.

**No logo-style imagery.** The Clave iOS app icon doesn't exist as an SVG yet, and the wordmark is the brand. The hero uses a small inline-SVG iPhone-with-approval-sheet visual to evoke the product without claiming it's the logo.

**Real components inside the product mockup.** Section 4 ("edit your profile in the browser") shows what `/edit` looks like by rendering the actual `<Avatar>`, `<FormSectionCard>`, and a styled placeholder field — not a screenshot. When we swap to a real screenshot post-deploy, the `<EditorMockup>` component is replaced by an `<img>` and nothing else changes.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Page shape | Tall scrolling marketing, 7 sections | Full design-system showcase + room for Clave iOS narrative |
| Brand color | palette[0] **Violet** (`#7A8CFF` → `#A14AFF`, accent `#592EFF`) | Default CSS-var tint already; "Nostr purple" recognition |
| Hero composition | Typography hero + inline-SVG iPhone visual | No logo-style Avatar; mockup imagery clearly belongs to the product |
| Compatible signers section | Dropped | Calling out alternatives (Amber, nsec.app) weakens the Clave pitch when Clave is the page subject |
| Section icons | Emoji (🔒 👥 🔋 etc.) | No third-party icon font, on-brand for "no off-domain assets" privacy promise |
| Primary CTA | "Download for iOS" → TestFlight URL | User to paste actual URL; placeholder `<TESTFLIGHT_URL_TBD>` |
| Secondary CTA | "Edit your profile" → `/connect` | Web companion as secondary action |
| Demo pubkey for mockup | `c0000003c0000000000000000000000000000000000000000000000000000003` | Hashes to palette[0] Violet (ring) + 271° purple interior, brand-harmonious |

## Section structure

### 1. Hero (Clave iOS)

```
                ╭──────────────────────╮
                │   ┌──────────────┐   │
                │   │  ╴╴╴╴╴╴╴╴╴   │   │   <- iPhone outline w/ Dynamic Island
                │   │              │   │
                │   │ ┌──────────┐ │   │   <- approval sheet (translucent surface)
                │   │ │ Sign     │ │   │
                │   │ │ event    │ │   │
                │   │ │ from     │ │   │
                │   │ │clave.casa│ │   │
                │   │ │ ─────── │ │   │
                │   │ │ Decline  │ │   │
                │   │ │  Sign  ◀─┼─┼───┼── Violet button (--clave-tint)
                │   │ └──────────┘ │   │
                │   └──────────────┘   │
                ╰──────────────────────╯

                            Clave
              Approve every Nostr signature from
                       your iPhone.
            Your nsec stays in the Secure Enclave.

       [ Download for iOS ]    [ Edit your profile ]
        primary, Violet         secondary, neutral
```

**Layout.**
- Centered column. Max width matches `+layout.svelte`'s `max-w-3xl`.
- Above the fold on a 14" laptop (1440×900) and on iPhone 13+ portrait (390×844). Acceptable to scroll on iPhone SE-class.
- Visual on top, copy below. Mobile keeps this stacking.

**Copy.**
- `<h1>Clave</h1>` — large weight (`text-5xl sm:text-6xl`), `font-semibold`, sentence-case.
- Tagline (sentence-case, two short sentences):

  > Approve every Nostr signature from your iPhone.<br>Your nsec stays in the Secure Enclave.

- CTA group: primary + secondary, side-by-side on desktop, stacked on mobile.

**Brand color override.** Section 1 (and the rest of the page) renders with `--clave-tint` set to palette[0] Violet via the marketing-route hook. See "Layout integration" below.

**Visual: `<HeroPhone>` component.**
- Inline SVG, ~280px tall on desktop, ~200px on mobile (`w-full max-w-[280px]`).
- iPhone outline: rounded rect with Dynamic Island notch. Single stroke (`var(--clave-text-muted)`), no fill.
- Inside the screen area: an "approval sheet" rendered with the same surface tokens as real components — `bg-[var(--clave-surface-alt)]`, `border-[var(--clave-border)]`, `rounded-2xl`. Contains:
  - Two text lines: *"Sign event from"* and *"clave.casa"* (the second slightly bolder).
  - A horizontal rule.
  - Two buttons stacked or side-by-side: *"Decline"* (neutral) and *"Sign"* (Violet, `bg-[var(--clave-tint)] text-[var(--clave-tint-fg)]`).
- `aria-hidden="true"` since it's decorative.

### 2. What Clave does (3 cards)

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 🔒               │  │ 👥               │  │ 🔋               │
│ Your nsec        │  │ Multiple         │  │ Always ready,    │
│ never leaves     │  │ accounts,        │  │ never draining   │
│ your phone       │  │ one signer       │  │                  │
│                  │  │                  │  │ Clave wakes only │
│ Stored in the    │  │ Pair up to four  │  │ when an app      │
│ iOS Secure       │  │ Nostr            │  │ needs you to     │
│ Enclave. Every   │  │ identities,      │  │ sign. The rest   │
│ signature is     │  │ switch with a    │  │ of the time it's │
│ approved         │  │ tap. Each gets   │  │ asleep — no      │
│ locally on your  │  │ its own gradient │  │ background       │
│ device.          │  │ identity.        │  │ activity, no     │
│                  │  │                  │  │ battery drain.   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

- Three `FormSectionCard`-styled cards, `grid grid-cols-1 sm:grid-cols-3 gap-4`.
- Each card: emoji (`text-3xl mb-3`), sentence-case headline (`text-base font-semibold`), body copy (`text-sm text-[var(--clave-text-muted)]`).
- Section header above the grid: `<h2>What Clave does</h2>` (`text-2xl font-semibold mb-4`).
- Body padding inside cards uses `<FormSectionCard>` defaults (`p-4 space-y-3`).

### 3. How it works (3 numbered steps)

```
        1                       2                       3
   ┌────────────┐         ┌────────────┐         ┌────────────┐
   │            │         │            │         │            │
   │  Install   │   →     │  Add your  │   →     │   Sign     │
   │  Clave     │         │  Nostr     │         │   from any │
   │  on        │         │  account   │         │   client   │
   │  iPhone    │         │            │         │            │
   │            │         │            │         │            │
   │  iOS 16+,  │         │  Paste an  │         │ Scan a QR  │
   │  free      │         │  nsec or   │         │ or paste a │
   │  via       │         │  generate  │         │ bunker URI │
   │  TestFlight│         │  a fresh   │         │ from any   │
   │            │         │  one,      │         │ NIP-46     │
   │            │         │  encrypted │         │ compatible │
   │            │         │  on        │         │ Nostr      │
   │            │         │  device.   │         │ client.    │
   └────────────┘         └────────────┘         └────────────┘
```

- Same `FormSectionCard` grid (3 cols on desktop, stacked on mobile).
- Each card's headline starts with the step number in a small Violet-tinted circle: `<span class="step-number">1</span>` styled as a 24×24 circle with `bg-[var(--clave-tint)] text-[var(--clave-tint-fg)]`.
- Arrow connector between desktop cards via `::after` pseudo-element on the first two cards (an SVG `→` in `--clave-text-muted`); hidden on mobile (`@media (max-width: 640px) { ::after { display: none; } }`).
- Section header: `<h2>How it works</h2>`.

### 4. Or edit your profile from any browser (clave.casa intro)

```
┌──────────────────────────────────────────────────────────────────┐
│  Or edit your profile from any browser                           │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │ COPY                     │  │  EDITORMOCKUP                │ │
│  │                          │  │                              │ │
│  │ There's also clave.casa  │  │  ╭──────────────────────╮   │ │
│  │ — a free web tool for    │  │  │ ⬤  Daisy             │   │ │
│  │ editing your kind 0      │  │  │   npub1xy54p83…6411 │   │ │
│  │ Nostr profile.           │  │  ├──────────────────────┤   │ │
│  │                          │  │  │ Display name         │   │ │
│  │ Signed by Clave on       │  │  │ ┌──────────────────┐│   │ │
│  │ your phone, or any       │  │  │ │ Daisy            ││   │ │
│  │ NIP-46 signer (Amber,    │  │  │ └──────────────────┘│   │ │
│  │ nsec.app).               │  │  │                      │   │ │
│  │                          │  │  │ About                │   │ │
│  │ [ Edit your profile ]    │  │  │ ┌──────────────────┐│   │ │
│  │                          │  │  │ │ A short bio…     ││   │ │
│  │                          │  │  │ └──────────────────┘│   │ │
│  │                          │  │  │                      │   │ │
│  │                          │  │  │ [Save and publish]   │   │ │
│  │                          │  │  ╰──────────────────────╯   │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- `<h2>Or edit your profile from any browser</h2>` — sentence case as written.
- Two-column layout on desktop: copy left (`max-w-md`), mockup right. Mobile: copy first, mockup below (`flex-col sm:flex-row gap-6`).
- Copy uses same scale as section 2 body — `text-base text-[var(--clave-text)]` for the lead sentence, `text-[var(--clave-text-muted)]` for the trailing sentence about NIP-46 signers.
- CTA: "Edit your profile" → `/connect`, styled like the hero secondary (neutral, not the page primary tint).
- **Mockup component (`<EditorMockup>`):** A `<FormSectionCard>` wrapping:
  - Header row: `<Avatar pubkey={DEMO_PUBKEY} size="md" label="Daisy" />` + name "Daisy" + truncated npub.
  - `<Field>` (or a styled placeholder div with the same chrome) labeled "Display name", value "Daisy".
  - Second `<Field>` labeled "About", value "A short bio about your work on Nostr."
  - "Save and publish" button styled like real `/edit` (`bg-[var(--clave-tint)] text-[var(--clave-tint-fg)] rounded-xl px-4 py-2.5 font-semibold`).
  - **Critical:** `style="pointer-events: none"` and `aria-hidden="true"` on the wrapping element — it's decorative, not interactive. Users who tab into the page should not focus into the mockup.

### 5. Privacy

```
Privacy

🔒  Your nsec never leaves your signer.
       In Clave it's stored in iOS Secure Enclave; in clave.casa
       it's whatever signer you connected.

🔍  No analytics, no telemetry, no third-party scripts, no
    off-domain fonts.
       Static HTML/CSS/JS hosted on Cloudflare Pages.

🛠️  Open source.
       Clave iOS and clave.casa are both MIT-licensed.

🤖  Robohash sees your npub when default avatars are rendered.
       The npub is public anyway. If it bothers you, paste your
       own picture URL or remove the picture.
```

- Plain `<ul>` with bullets-as-emoji (no `list-disc`). `space-y-3` between rows.
- Lead line bold + sentence-case; sub-line `text-[var(--clave-text-muted)]`.
- Section header: `<h2>Privacy</h2>`.
- No card wrapper — the section is naked text on the ambient gradient.

### 6. Built in the open

Single paragraph, ~3 sentences:

> Clave iOS and clave.casa are open source on GitHub.
> They share a [cross-platform design system](https://github.com/DocNR/clave-casa/blob/main/docs/design-system.md), the AccountTheme palette, and the privacy promise.
> PRs welcome.

Below the paragraph: small inline links list (separated by `·`):

> [Clave iOS](https://github.com/DocNR/clave) · [clave.casa](https://github.com/DocNR/clave-casa) · [Design system](https://github.com/DocNR/clave-casa/blob/main/docs/design-system.md) · [NIP-46 spec](https://github.com/nostr-protocol/nips/blob/master/46.md)

`<h2>Built in the open</h2>`. No card. `text-base` paragraph + `text-sm text-[var(--clave-text-muted)]` link list.

### 7. Footer

```
clave.casa                    GitHub · iOS · Design system · TestFlight
```

- `<footer class="mt-16 pt-6 border-t border-[var(--clave-border)] flex justify-between text-xs text-[var(--clave-text-muted)]">`
- Left: wordmark `clave.casa`.
- Right: 4 links separated by ` · `: GitHub (clave-casa), iOS (clave), Design system, TestFlight.

## Components

### `src/lib/components/marketing/HeroPhone.svelte`

```svelte
<!-- HeroPhone.svelte: stylized iPhone-with-approval-sheet for the marketing
     hero. Inline SVG only — no images. Uses CSS vars so it picks up the
     marketing-route brand color. Decorative; aria-hidden. -->
<script lang="ts">
  // No props — purely presentational.
</script>

<svg viewBox="0 0 220 440" class="..." aria-hidden="true">
  <!-- iPhone outline: rounded rect + Dynamic Island -->
  <rect x="2" y="2" width="216" height="436" rx="36" ry="36"
        fill="none" stroke="currentColor" stroke-width="2" />
  <rect x="80" y="14" width="60" height="14" rx="7" fill="currentColor" opacity="0.6" />

  <!-- Approval sheet rendered as nested SVG group with the surface chrome -->
  <foreignObject x="20" y="100" width="180" height="240">
    <div xmlns="http://www.w3.org/1999/xhtml"
         class="rounded-2xl border bg-[var(--clave-surface-alt)] p-3 text-xs text-[var(--clave-text)]"
         style="border-color: var(--clave-border)">
      <div class="font-semibold">Sign event from</div>
      <div class="font-mono text-[10px] text-[var(--clave-text-muted)]">clave.casa</div>
      <hr class="my-3 border-[var(--clave-border)]" />
      <div class="text-[10px] text-[var(--clave-text-muted)] mb-3">
        kind:1 note · signed locally
      </div>
      <div class="flex gap-1.5">
        <div class="flex-1 rounded-lg border border-[var(--clave-border)]
                    text-center py-2 text-[var(--clave-text-muted)]">
          Decline
        </div>
        <div class="flex-1 rounded-lg text-center py-2 font-semibold
                    bg-[var(--clave-tint)]"
             style="color: var(--clave-tint-fg)">
          Sign
        </div>
      </div>
    </div>
  </foreignObject>
</svg>
```

`color: var(--clave-text-muted)` on the outer SVG so `currentColor` on the outline picks it up. Dimensions tuned during implementation.

### `src/lib/components/marketing/EditorMockup.svelte`

```svelte
<!-- EditorMockup.svelte: a non-interactive product preview using real
     Clave-casa components rendering placeholder content. Decorative;
     aria-hidden. Replace with a real screenshot post-deploy by swapping
     this component out for an <img> at the call-site. -->
<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import FormSectionCard from '$lib/components/FormSectionCard.svelte';
  import { DEMO_PUBKEY } from '$lib/marketing';
</script>

<div class="pointer-events-none select-none" aria-hidden="true">
  <FormSectionCard>
    <div class="flex items-center gap-3">
      <Avatar pubkey={DEMO_PUBKEY} size="md" label="Daisy" />
      <div>
        <div class="text-sm font-semibold">Daisy</div>
        <div class="font-mono text-[11px] text-[var(--clave-text-muted)]">
          npub1xy54p83…6411
        </div>
      </div>
    </div>

    <label class="block">
      <span class="text-sm font-semibold">Display name</span>
      <div class="mt-1.5 rounded-xl border border-[var(--clave-border)]
                  bg-[var(--clave-surface-alt)] px-3.5 py-2.5 text-sm">
        Daisy
      </div>
    </label>

    <label class="block">
      <span class="text-sm font-semibold">About</span>
      <div class="mt-1.5 rounded-xl border border-[var(--clave-border)]
                  bg-[var(--clave-surface-alt)] px-3.5 py-2.5 text-sm
                  text-[var(--clave-text-muted)]">
        A short bio about your work on Nostr.
      </div>
    </label>

    <button type="button"
            class="rounded-xl px-4 py-2.5 text-sm font-semibold w-full
                   bg-[var(--clave-tint)]"
            style="color: var(--clave-tint-fg)"
            tabindex="-1">
      Save and publish
    </button>
  </FormSectionCard>
</div>
```

Uses **real** `<Avatar>` + `<FormSectionCard>`. The `<Field>` is mocked as a styled `<div>` to avoid `bind:value` (no state), but the chrome is byte-identical. `tabindex="-1"` on the button keeps keyboard navigation out of the mockup.

### `src/lib/marketing.ts`

```ts
import { ambientGradientCss, fgForHex, PALETTE } from './theme';

export const MARKETING_BRAND_INDEX = 0; // Violet
export const MARKETING_BRAND_THEME = PALETTE[MARKETING_BRAND_INDEX];

// Demo pubkey for the EditorMockup avatar.
// Picked so gradientIndexForPubkey() returns 0 (Violet ring) AND the
// pubkey-hue interior lands in the purple range (271° / 271°).
// See ~/.claude/plans/marketing-landing-page-mutable-donut.md for derivation.
export const DEMO_PUBKEY =
  'c0000003c0000000000000000000000000000000000000000000000000000003';

// External URLs.
export const TESTFLIGHT_URL = 'TBD'; // user pastes during implementation
export const CLAVE_REPO_URL = 'https://github.com/DocNR/clave';
export const CLAVE_CASA_REPO_URL = 'https://github.com/DocNR/clave-casa';
export const DESIGN_SYSTEM_URL =
  'https://github.com/DocNR/clave-casa/blob/main/docs/design-system.md';
export const NIP46_SPEC_URL =
  'https://github.com/nostr-protocol/nips/blob/master/46.md';

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
 * Called from +layout.svelte when navigating away from `/` without an
 * active account.
 */
export function clearMarketingTheme(): void {
  const root = document.documentElement;
  root.style.removeProperty('--clave-tint');
  root.style.removeProperty('--clave-tint-fg');
  root.style.removeProperty('--clave-ambient');
}
```

## Layout integration

`src/routes/+layout.svelte` currently has this `$effect`:

```ts
$effect(() => {
  const root = document.documentElement;
  if (!activePubkey) {
    root.style.removeProperty('--clave-tint');
    root.style.removeProperty('--clave-tint-fg');
    root.style.removeProperty('--clave-ambient');
    return;
  }
  // ...set tint from active account theme
});
```

We need to know the current route to decide between "marketing brand" and "neutral default" when there's no active account. Use `$app/state`'s `page` rune:

```ts
import { page } from '$app/state';

$effect(() => {
  const root = document.documentElement;
  if (!activePubkey) {
    if (page.url.pathname === '/') {
      applyMarketingTheme();
    } else {
      clearMarketingTheme();
    }
    return;
  }
  // ...set tint from active account theme (unchanged)
});
```

This keeps the marketing brand color scoped to `/` only — `/connect` and any other route without an active account stays on the original neutral default.

## `+page.svelte` skeleton

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { loadConnections, getActiveConnection } from '$lib/connections';
  import HeroPhone from '$lib/components/marketing/HeroPhone.svelte';
  import EditorMockup from '$lib/components/marketing/EditorMockup.svelte';
  import {
    TESTFLIGHT_URL,
    CLAVE_REPO_URL,
    CLAVE_CASA_REPO_URL,
    DESIGN_SYSTEM_URL,
    NIP46_SPEC_URL
  } from '$lib/marketing';

  // Preserve the original auto-redirect so signed-in users go straight to /edit.
  onMount(() => {
    const conns = loadConnections();
    if (conns.length > 0 && getActiveConnection()) {
      goto('/edit', { replaceState: true });
    }
  });
</script>

<svelte:head>
  <title>Clave — A NIP-46 remote signer for iPhone</title>
  <meta name="description"
        content="Approve every Nostr signature from your iPhone. Your nsec stays in the Secure Enclave." />
</svelte:head>

<!-- 1. Hero -->
<section class="...">...</section>

<!-- 2. What Clave does -->
<section class="...">...</section>

<!-- 3. How it works -->
<section class="...">...</section>

<!-- 4. Or edit your profile from any browser -->
<section class="...">...</section>

<!-- 5. Privacy -->
<section class="...">...</section>

<!-- 6. Built in the open -->
<section class="...">...</section>

<!-- 7. Footer -->
<footer class="...">...</footer>
```

Section spacing: `space-y-16 sm:space-y-20` on the wrapping div, vertical rhythm comparable to other sites.

## Mobile breakpoints

- Hero: visual + copy stack vertically. CTAs full-width, stacked.
- Section 2 (What Clave does): 1 column. `space-y-3` between cards.
- Section 3 (How it works): 1 column, vertical with `↓` connector instead of `→`.
- Section 4 (web companion): copy on top, mockup below.
- Section 5 (privacy): same — already a list.
- Section 6 (developers): paragraph reflows naturally.
- Footer: stacks (wordmark on top, links below) at narrow widths.

Tested target: iPhone 13 Pro 390×844 (`sm` breakpoint = 640px). Below 390px is out of scope.

## Animation / motion

- CTAs: `transition-transform active:scale-95` on tap (`design-system.md` §10).
- Section reveals on scroll: skipped for v1. The page is short enough that everything is reachable; scroll animations risk feeling gimmicky and add motion overhead.
- Brand color: existing 300ms ease transition on `.clave-ambient-layer` already in `app.css`, no changes.
- All animations respect `prefers-reduced-motion` because the existing CSS already does.

## Accessibility

- Single `<h1>` per page (the hero "Clave"). Subsequent sections use `<h2>`.
- All decorative elements (`<HeroPhone>`, `<EditorMockup>`) marked `aria-hidden="true"`.
- Color contrast: the Violet button on Violet ambient gradient has been validated in the iOS app (same `accent` color). Body text on `--clave-text` over the ambient at the bottom of the page passes WCAG AA at the alpha levels used (0.06 at 100% scroll).
- Keyboard navigation: tab moves through CTAs in the hero, then "Edit your profile" in section 4, then footer links. Mockup is `tabindex="-1"`. No tab traps.
- Skip-to-content link: not added in v1 (page has no global navigation beyond the header which is already minimal).

## Anti-pattern checklist (per `design-system.md` §11)

- [ ] No hardcoded `text-white` on neutral surfaces — use `--clave-text` / `--clave-text-muted`.
- [ ] No `bg-clave-tint` Tailwind class — use `bg-[var(--clave-tint)]` or `style:`.
- [ ] All section headers sentence-case.
- [ ] EditorMockup avatar interior uses `pubkeyHueGradient` (handled by `<Avatar>` already).
- [ ] No inline `displayLabel` chain — mockup uses literal placeholder strings.
- [ ] No `dark:` variants added.
- [ ] No `<dialog>` modals on the marketing page.
- [ ] PALETTE not modified.

Walk every section against this list before commit.

## Out of scope

- Real screenshots (post-deploy follow-up; out per brief).
- OG image / Twitter Card. Captured in BACKLOG with dimensions noted.
- Clave iOS app icon SVG (would replace the inline iPhone outline once available).
- i18n.
- `/docs` route or in-site documentation viewer.
- Analytics, even privacy-friendly (Plausible, Simple Analytics) — design-contract.

## Open items

- **TestFlight URL** — placeholder until user pastes it.
- **Hero tagline confirmation** — current draft "Approve every Nostr signature from your iPhone. Your nsec stays in the Secure Enclave." User to confirm during spec review.
- **Section 4 mockup approach** — approved as "real components rendering placeholder content"; the alternative ("hand-drawn SVG") was considered and rejected for fidelity reasons.

## Implementation order

Per the harness plan at `~/.claude/plans/marketing-landing-page-mutable-donut.md`:

1. Spec (this file) committed.
2. Implementation plan written via `superpowers:writing-plans`.
3. `feat(marketing): hero + brand theme override` — `marketing.ts`, `HeroPhone.svelte`, `+layout.svelte` route hook, hero section.
4. `feat(marketing): What Clave does + How it works sections`.
5. `feat(marketing): editor mockup + clave.casa intro` — `EditorMockup.svelte`, section 4.
6. `feat(marketing): privacy + developer + footer sections`.
7. `chore: backlog updates for landing-page follow-ups`.

Verification gate after each commit: `npm run check && npm run build` green, page renders.
