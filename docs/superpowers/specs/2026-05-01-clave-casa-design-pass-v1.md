# clave.casa design pass v1: family resemblance to Clave iOS

_2026-05-01 · status: approved, pending implementation_

## Context

clave.casa's MVP shipped with generic Tailwind defaults — neutral grays, blue-600
buttons, default system fonts, 6px corner radii. Functional, but doesn't feel
like a sibling product to the Clave iOS app.

This pass lifts the unmistakable Clave signatures (per-account gradient avatars,
color palette, generous corner radii, capsule status pills) onto the web app
while keeping the components web-native. We avoid forcing iOS chrome (sheets,
grouped Form sections, segmented controls) into HTML where it would feel
uncanny.

A more thorough redesign is expected later. This pass covers a small,
high-impact set so the next routes (kind 3, kind 10002) inherit a coherent
foundation.

## Approach

**Family resemblance, not faithful reproduction.**

| Treatment | Examples |
|---|---|
| **Lift verbatim** | The 12-color gradient palette, corner-radius values (16px / 12px), capsule pill pattern (`color.opacity(0.15)` background + matching darker text), gradient-avatar-with-accent-ring concept |
| **Translate** | iOS Form sections → web cards with section labels. iOS NavBar `.ultraThinMaterial` → sticky `<header>` with `backdrop-filter: blur()`. iOS `.borderedProminent` → ordinary web button with the active account's accent tint |
| **Avoid** | Sheet-from-bottom animations, segmented controls, action sheets, native-list-row chevrons, pull-to-refresh, status-bar mimicry, `@font-face`-injected SF Pro |

## Scope

### In scope (the seven changes)

1. **Per-account gradient avatar.** Replace the plain pubkey/text affordance in
   `AccountSwitcher` with a deterministic gradient circle indexed by pubkey
   hash. Same `<Avatar pubkey={…} size={…} />` reused on the connect screen,
   profile header, and future kind-3 contact rows.
2. **Color tokens via CSS vars.** Define `--clave-tint`, `--clave-tint-fg`,
   `--clave-surface`, `--clave-surface-alt`, `--clave-border`. The active
   account's gradient accent populates `--clave-tint` so primary buttons and
   focus states match the user's Clave color identity.
3. **Generous corner radii.** Cards from `rounded-md` (6px) → `rounded-2xl`
   (16px). Inputs from `rounded-md` → `rounded-xl` (12px). Buttons stay at
   `rounded-xl` (12px). Pills stay at `rounded-full`.
4. **Capsule status pills.** Replace `✓` / `✗` ASCII strings in the per-relay
   results with proper colored capsules (`bg-emerald-500/15 text-emerald-700`
   for ok; `bg-red-500/15 text-red-700` for fail). Matches iOS
   `.background(color.opacity(0.15), in: Capsule())`.
5. **Top-bar polish.** Sticky header with `backdrop-filter: blur(20px)` and
   semi-opaque background. Wordmark left, `<AccountSwitcher>` right (now
   showing the gradient avatar). No iOS-coded NavBar height — natural web
   header proportions.
6. **Typography stack.** Explicit
   `font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
   sans-serif` so macOS/iOS Safari users see SF Pro identical to the iOS app.
   Tighten heading weights to match Clave's `.semibold` rhythm; body copy
   uses standard size with -0.01em letter-spacing on headings.
7. **Form section cards.** Group profile fields into soft cards
   (`bg-neutral-100/50 dark:bg-neutral-900/50` with `rounded-2xl`) with a
   tiny uppercase section label ("Identity", "Links", "Custom"). Mirrors
   Clave's grouped Form sections without faking iOS chrome.

### Explicitly out of scope (deferred)

- Glass morphism beyond the top bar (Clave uses `.ultraThinMaterial` on many
  surfaces; on web we keep it on the header only — clarity + perf)
- Logo / icon design (still using text wordmark)
- Animations (no entrance/exit choreography this pass)
- Light/dark theme refinement beyond what falls out of the new tokens
- Per-account tint coloring throughout the app (only used on the avatar in
  this pass — full per-account theming is a future pass)
- A redesign of the connect screen's empty state, paste affordance, etc.
  (just gets the new tokens applied)

## Visual identity

### Color palette (lifted verbatim from Clave iOS `AccountTheme.swift`)

12 deterministic gradients indexed by `index(pubkey) mod 12`. Hex values are
the exact RGB from iOS converted to 8-bit (`Color(red:r, green:g, blue:b)` →
`#RRGGBB` with `int(component * 255)`):

| Index | Name | Start | End | Accent |
|---|---|---|---|---|
| 0 | Violet | `#7A8CFF` | `#A14AFF` | `#592EFF` |
| 1 | Teal | `#00C7FF` | `#2EFFB5` | `#005966` |
| 2 | Coral | `#FF8C4A` | `#FFC24A` | `#C75900` |
| 3 | Magenta | `#FF4A8C` | `#FF78A8` | `#C71A66` |
| 4 | Sky | `#4AA3FF` | `#4AE8FF` | `#1A73D9` |
| 5 | Lime | `#4AFF8C` | `#C2FF4A` | `#1A8C33` |
| 6 | Red | `#FF6B6B` | `#FF9E4F` | `#C72E2E` |
| 7 | Fuchsia | `#8C4AFF` | `#ED6BFF` | `#661AC7` |
| 8 | Emerald | `#1AC799` | `#66ED66` | `#0D664D` |
| 9 | Orchid | `#C76BED` | `#FF8CC7` | `#8C2EB5` |
| 10 | Navy | `#4A6BD9` | `#8CB5FF` | `#1A33A6` |
| 11 | Peach | `#FF6BB5` | `#FFB56B` | `#C73373` |

### Hash → index function (canonical from iOS)

The iOS implementation at `~/clave/Clave/Shared/AccountTheme.swift` uses
SHA-256, not byte-sum. We match it 1:1:

```ts
import { sha256 } from '@noble/hashes/sha2';

export function gradientIndexForPubkey(hexPubkey: string): number {
  const normalized = hexPubkey.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) return 0; // defensive fallback to palette[0]
  const digest = sha256(new TextEncoder().encode(normalized));
  // First 2 bytes as a uint16, mod palette count.
  return ((digest[0] << 8) | digest[1]) % 12;
}
```

(`@noble/hashes` ships as a transitive dep of `nostr-tools`; no new install
required.)

Stable across devices: same npub → same gradient on iOS, on web, on any
future client we build.

### Spacing & radii scale

Aligns with Clave iOS where possible (iOS uses pt; web uses px at 1:1):

| Token | Value | Use |
|---|---|---|
| `--clave-radius-card` | `16px` | Form section cards, status panels, alerts |
| `--clave-radius-input` | `12px` | Inputs, buttons |
| `--clave-radius-pill` | `9999px` | Capsule pills (relay status, badges) |
| Card padding | `16px` (Tailwind `p-4`) | Inner card content |
| Section gap | `24px` (Tailwind `space-y-6`) | Between top-level sections |
| Field gap | `12px` (Tailwind `space-y-3`) | Between form fields within a section |

### CSS variables (in `app.css`)

```css
:root {
  --clave-tint: #2563eb; /* default until an account is active */
  --clave-tint-fg: #ffffff;
  --clave-surface: rgb(245 245 245 / 0.5);
  --clave-surface-alt: rgb(255 255 255);
  --clave-border: rgb(0 0 0 / 0.06);
  --clave-radius-card: 16px;
  --clave-radius-input: 12px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --clave-surface: rgb(23 23 23 / 0.5);
    --clave-surface-alt: rgb(10 10 10);
    --clave-border: rgb(255 255 255 / 0.08);
  }
}
```

The `--clave-tint` and `--clave-tint-fg` get overridden at the document root
when a connection becomes active (set in `+layout.svelte` from a Svelte effect
keyed on `getActiveConnection()`).

### Capsule pill primitive

```svelte
<!-- src/lib/components/StatusPill.svelte -->
<script lang="ts">
  type Tone = 'ok' | 'fail' | 'pending' | 'neutral';
  let { tone = 'neutral', children }: { tone?: Tone; children?: any } = $props();
  const toneClasses = {
    ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    fail: 'bg-red-500/15 text-red-700 dark:text-red-400',
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    neutral: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300'
  };
</script>
<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium {toneClasses[tone]}">
  {@render children?.()}
</span>
```

## Components & files

| File | Action |
|---|---|
| `src/lib/theme.ts` | **NEW.** Gradient palette, `gradientIndexForPubkey()`, helper to read the active account's tint hex |
| `src/lib/components/Avatar.svelte` | **NEW.** Renders the gradient circle with optional initial. Sizes: sm (24px), md (32px), lg (44px) |
| `src/lib/components/StatusPill.svelte` | **NEW.** Capsule pill primitive (see snippet above) |
| `src/lib/components/FormSectionCard.svelte` | **NEW.** Wraps form fields with a section label + soft card |
| `src/lib/components/AccountSwitcher.svelte` | **UPDATE.** Use `<Avatar size="sm" />` next to the truncated label. Drop the chevron-text "▾" affordance for a proper SVG chevron. Keep the dropdown UX. |
| `src/lib/components/RelayList.svelte` | **UPDATE.** Use `<StatusPill>` instead of inline `✓` / `✗` strings |
| `src/lib/components/Field.svelte` / `TextareaField.svelte` | **UPDATE.** Bump corner radius and label weight |
| `src/app.css` | **UPDATE.** CSS variables, font stack, base radii |
| `src/routes/+layout.svelte` | **UPDATE.** Sticky header with `backdrop-blur`. Read active connection and set `--clave-tint`/`--clave-tint-fg` on `<html>`. |
| `src/routes/+page.svelte` (landing) | **UPDATE.** New CTA card uses tokens and rounded-2xl |
| `src/routes/connect/+page.svelte` | **UPDATE.** Apply tokens, capsule pill on stage label |
| `src/routes/profile/+page.svelte` | **UPDATE.** Profile header with `<Avatar size="lg">`, form fields wrapped in `<FormSectionCard>`s ("Identity" / "Links"), publish status uses `<StatusPill>`s, primary button uses `bg-[var(--clave-tint)]` |

## Architecture

The shape is intentionally tiny — three new components, one theme module,
otherwise just style updates. No structural changes to data flow, NIP-46
plumbing, or the propagation layer.

```
app.css ──── CSS vars ────────► all components read tokens
   ▲
   │ (overrides --clave-tint when connection becomes active)
   │
+layout.svelte ────────────────► <Avatar pubkey={…} />
   │                              ▲
   │                              │ uses theme.ts
   │                              │
AccountSwitcher ──────────────────┤
profile/+page.svelte ─────────────┘

+layout.svelte ───── <FormSectionCard> ─── (groups <Field> children)
profile/+page.svelte ─── <StatusPill> ─── (per-relay results)
```

## Verification plan

Manual visual smoke test (no automated test for visual changes — this is
inherently a "does it feel right?" check):

1. **Avatar correctness** — Connect with a known test pubkey
   (`npub125f8lj0pcq7…`); gradient on web must match what the iOS app shows
   for the same account. If they diverge, the hash function is wrong (we
   match iOS exactly).
2. **Active-account tint** — primary "Save & publish" button color should
   change when switching between connections.
3. **Per-relay pills** — after a publish, ✓ pills should be emerald-tinted,
   ✗ pills should be red-tinted, both legibly contrast in light + dark.
4. **Form section cards** — fields visually grouped by category; section
   labels readable but secondary.
5. **Sticky header blur** — scroll the profile page; header content stays
   visible against scrolling content with the frosted effect.
6. **macOS Safari font check** — open in Safari; should render in SF Pro
   identical to the iOS app body copy.
7. **Light + dark mode** — toggle system theme; both should look intentional
   (no ad-hoc colors, no bright-white islands in dark).
8. **Mobile viewport** — open at 375px width; nothing breaks, account
   switcher dropdown still works, header still sticks.

End-to-end behavioral verification (covered by existing manual smoke test
flow) should be unchanged: connect, fetch profile, edit, publish — the
design pass touches only visual layer.

## Open questions

None blocking implementation. Future-pass questions parked:

- Should the per-account tint propagate to more surfaces (links, focus
  rings, header underline)? Right now only the primary button uses it.
- ~~Should we hash the pubkey via SHA-256 instead of byte-sum?~~ Resolved:
  SHA-256 is what iOS actually uses (see `AccountTheme.swift`); spec
  updated to match.
- Should the avatar gradient angle be configurable? Clave iOS uses 135°
  (top-left → bottom-right); we'll match.
