# clave.casa landing redesign — design spec

_Date: 2026-06-05_

> [!WARNING]
> **Outdated security claim — corrected 2026-06-05.** Copy in this historical
> doc describes the nsec as living in / never leaving the iOS **Secure Enclave**.
> That is **inaccurate**: per the Clave iOS source (`SharedKeychain.swift`), the
> nsec is stored as a plain iOS **Keychain** item with
> `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — no Secure Enclave, no
> hardware-backed key, no biometric/SE gating at rest. The live site copy now
> says "iOS Keychain, device-only, never synced or backed up." Doc left as-is for
> historical record.

## Summary

Redesign the clave.casa marketing landing page (`/`) from its current
light, static, card-and-emoji layout into a dark, motion-rich page in the
spirit of [wisp.mobile](https://wisp.mobile)
(source: `github.com/barrydeen/wisp-landing-next`), while keeping Clave's
own violet identity and the existing per-account gradient palette.

The page repositions around a single message: **Clave is a remote Nostr
signer for iPhone.** The web profile editor is no longer marketed here.

Scope is the landing route only. `/edit` and `/connect` are untouched and
stay in their current light theme.

## Goals

- A dark, dynamic, "alive" landing that feels modern and intentional.
- Signer-first narrative; no co-headlining of the web editor.
- Reuse Clave's existing gradient `PALETTE` (`src/lib/theme.ts`) as the
  multi-accent system, so the page is unmistakably Clave, not a wisp clone.
- All motion is CSS + `IntersectionObserver` — no animation libraries.
  Everything respects `prefers-reduced-motion`.
- Stays a static SvelteKit bundle on Cloudflare Pages. The only network
  calls are client-side relay fetches for live testimonials (and the
  existing maintainer credit-line fetch).
- Device mockups are stylized CSS now, but built to accept real app
  screenshots later with a one-line swap.

## Non-goals

- No redesign of `/edit` or `/connect` (light theme preserved).
- No marketing of the web profile editor on the landing (callout removed
  entirely).
- No real Clave screenshots in this pass (stylized mockups only).
- No live avatar marquee or live profile-preview demo — the only live
  Nostr element is curated testimonials.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Palette / mood | Dark, violet-led, multi-gradient accents from existing `PALETTE` |
| Device imagery | Stylized CSS mockups, screenshot-ready (image-or-fallback) |
| Live content | Curated real testimonials only, fetched live + njump-linked |
| Scope | Landing page (`/`) only |
| Web editor callout | Removed entirely |
| Headline font | Self-hosted Space Grotesk (bundled `.woff2`, no off-domain) |
| Hero phones | 3-phone overlapping floating cluster |
| Body font | Existing system / SF Pro stack (unchanged) |

## Design foundations

### Color tokens

Introduce a dark token set, scoped to the marketing route so app routes
stay light. Base values (tuned to a violet-leaning near-black, in the
wisp spirit but on Clave's hue):

- `--m-bg`: near-black violet (`#0E0B16`-ish)
- `--m-surface`, `--m-surface-2`: raised violet-greys for cards
- `--m-border`, `--m-border-2`: low-contrast violet borders
- `--m-text`: off-white (`#F4F1FB`-ish)
- `--m-text-muted`, `--m-text-dim`: stepped-down muted tones

The `--m-` prefix avoids collision with the existing `--clave-*` light
tokens used by `/edit` and `/connect`.

**Accents:** reuse `PALETTE` from `src/lib/theme.ts` (Violet, Teal, Coral,
Magenta, Sky, Lime, Fuchsia, …). Violet (index 0) is the brand/hero color.
Each feature row and each testimonial card draws one accent from the
palette via its `{start, end, accent}` gradient, giving the page wisp's
per-section color variety natively.

### Typography

- **Headlines:** Space Grotesk, self-hosted via the `@fontsource/space-grotesk`
  package (bundles `.woff2` locally — zero off-domain font requests).
  Exposed as a `--font-display` and a `font-display` Tailwind family.
- **Body:** unchanged system stack (`-apple-system` / SF Pro …).
- Headlines use `clamp()` fluid sizing, bold weight, tight leading/tracking
  (wisp pattern), with a `.gradient-text` helper (violet→sky→teal clip).

### Motion engine

All client-side, no libraries:

- **`reveal` Svelte action** (`src/lib/actions/reveal.ts`) — port of wisp's
  `FadeIn`. `IntersectionObserver` toggles a visible class; element slides
  up + fades in, with an optional stagger delay param. Unobserves after
  first reveal. This is the workhorse used on most blocks.
- **Tailwind keyframes** (add to `tailwind` config / CSS `@theme`):
  `phone-hover` (gentle float + tilt), `blob-drift` (ambient spotlight
  drift), `pulse-dot` (live indicator), `scroll-x` (reserved), plus a
  `.tilt-card` hover lift.
- **Glass nav on scroll** — nav goes transparent → blurred glass panel
  after a small scroll threshold (scroll listener, `passive`).
- **`prefers-reduced-motion: reduce`** disables all the above animations
  and `scroll-behavior`.

## Page structure

Order, top to bottom:

1. **Nav** — fixed; transparent → glass-blur on scroll. Clave icon +
   "clave" wordmark left; "Download for iOS" (TestFlight) pill right.
2. **Hero** — gradient headline, signer-first
   (e.g. *"Approve every Nostr signature from your iPhone."*); subcopy
   (*your nsec stays in the Secure Enclave*); two CTAs — primary
   **Download for iOS** (`CLAVE_INSTALL_URL`), secondary **See how it
   works** (smooth-scroll to features). Drifting violet/sky ambient blobs.
   **3-phone cluster** (overlapping, tilted, floating): approval sheet +
   account switcher (shows the gradient identities) + QR/bunker connect.
   Trust chips: *nsec never leaves your phone · no battery drain · works
   with any client · open source*.
3. **Feature rows** — alternating phone/copy rows (wisp `ExperiencesSection`
   pattern), one palette accent each:
   - Keys never leave the Secure Enclave
   - Tap to approve every signature
   - Many identities, one signer — each its own gradient
   - Works with any NIP-46 client — scan a QR or paste a bunker URI
   - Always ready, never draining — wakes only to sign
4. **How it works** — 3-step reveal: Install → Add your account → Sign from
   any client.
5. **Live testimonials** — masonry of curated **real** notes about Clave,
   fetched live from relays, each linking to njump (verifiable). Skeleton
   while loading; graceful empty/fallback state if relays are slow or the
   curated set returns nothing.
6. **Privacy** — reworded honestly: *no analytics, no telemetry, no
   third-party trackers; live Nostr data loads from public relays;
   open source, MIT.*
7. **Download CTA** — closing gradient panel + TestFlight/App Store button
   (final ask, immediately before the footer).
8. **Footer** — repo links (clave.casa, Clave iOS), NIP-46 spec, TestFlight;
   maintainer credit keeps the existing small live kind-0 fetch.

(No web-editor section anywhere.)

## Component breakdown

New components under `src/lib/components/marketing/`:

- `reveal.ts` action (under `src/lib/actions/`).
- `MarketingNav.svelte` — fixed glass-on-scroll nav.
- `PhoneMockup.svelte` — bordered device frame with notch, accent glow,
  tilt + float. Accepts an optional `src` (image) and renders a styled
  faux-screen fallback when absent. **This is the screenshot-swap seam.**
  Faux-screens reuse real Clave chrome tokens (like today's `HeroPhone`).
- `HeroSection.svelte` — headline, CTAs, trust chips, 3-phone cluster,
  ambient blobs.
- `FeatureRow.svelte` — one alternating phone+copy row, accent-driven.
- `FeaturesSection.svelte` — maps feature data → `FeatureRow`s.
- `HowItWorks.svelte` — 3-step reveal.
- `Testimonials.svelte` — live fetch + masonry + njump links + states.
- `DownloadCTA.svelte` — closing panel.
- `PrivacySection.svelte`, `MarketingFooter.svelte`.

Data/config:

- Feature-row copy + accent index as a typed array in
  `src/lib/marketing.ts` (or a new `marketing-content.ts`).
- Curated testimonial event IDs as a typed list (new
  `src/lib/testimonials.ts`), with relay URLs. **Content dependency:**
  real event IDs sourced via `nak` (search Nostr for Clave mentions) and
  approved by the maintainer before ship. Until populated, the section
  renders its empty/fallback state and is safe to ship.

Removed/retired:

- `EditorMockup.svelte` usage (web-editor section deleted). Component file
  may be left in place unused or removed — decide during implementation
  (lean toward removing if nothing else imports it).
- The current `HeroPhone.svelte` is superseded by `PhoneMockup.svelte`
  faux-screens.

## Architecture

### Route-aware layout

`src/routes/+layout.svelte` currently wraps **every** route in
`bg-neutral-50 text-neutral-900`, a `max-w-3xl` column, and a light header
(`clave.casa` wordmark + `AccountSwitcher`). The dark, full-bleed landing
needs its own chrome and full width.

Change: make the layout render route-aware chrome.

- On `/`: render a minimal pass-through — the landing page owns its full
  dark background, nav, and width (no shared header, no `max-w-3xl`).
- On all other routes (`/edit`, `/connect`): keep today's light
  header + `max-w-3xl` main **exactly as-is**.

The dark `--m-*` tokens are applied only on the marketing route (e.g. a
class on the marketing wrapper, or a route-scoped `:where` selector), so
`/edit` and `/connect` are byte-for-byte unaffected. The existing
`applyMarketingTheme()` / `clearMarketingTheme()` `$effect` in the layout
continues to govern the `--clave-tint` brand color and is reconciled with
the new dark wrapper.

### Static / data flow

- Build stays SvelteKit + `adapter-static` → Cloudflare Pages.
- Testimonials fetch is client-side `onMount` using the existing
  `nostr-tools` dependency (SimplePool), mirroring the current credit-line
  `fetchLatestProfile` pattern. No SSR data load, no new backend.
- The existing signed-in auto-redirect (`/` → `/edit` when an active
  connection exists) is **preserved**.

### Fonts

- Add `@fontsource/space-grotesk` (dev/runtime dep). Import the needed
  weights; expose `--font-display`. No Google Fonts / off-domain requests,
  preserving the privacy posture.

## Privacy copy reconciliation

The current page claims "no off-domain requests / static bundle." Going
live with relay-fetched testimonials makes that literally untrue on the
landing (it was already untrue on `/edit`). Reword to an honest, still-
strong stance:

- No analytics, no telemetry, no third-party trackers.
- No off-domain fonts or icons (self-hosted).
- Live Nostr data (testimonials, maintainer profile) loads directly from
  public relays — peer-to-peer, no intermediary.
- Open source, MIT.

## Testing

- `npm run check` (svelte-check) passes.
- Existing `vitest` suite (`theme.test.ts`) still passes; add a focused
  test for the `reveal` action's observer wiring and for any testimonial
  data parsing/normalization helper.
- Manual verification via the dev server (`vite dev`) + preview tools:
  hero renders, scroll reveals fire, reduced-motion disables animation,
  `/edit` and `/connect` remain light and unchanged, signed-in redirect
  still works.

## Open items to resolve during implementation

- Final dark token hex values (tune against violet brand).
- Exact hero headline + subcopy wording.
- Sourcing and approving real testimonial event IDs (`nak`).
- Whether to delete `EditorMockup.svelte` / `HeroPhone.svelte` outright.

## Risks

- **Empty testimonials at ship** — mitigated by a safe fallback state; the
  section degrades gracefully with zero curated events.
- **Layout-refactor regressions** on `/edit` / `/connect` — mitigated by
  scoping all dark tokens/chrome to `/` and leaving the other branches of
  the route-aware layout identical to today.
- **Motion jank / accessibility** — mitigated by `prefers-reduced-motion`
  and `IntersectionObserver` (no scroll-thrash).
