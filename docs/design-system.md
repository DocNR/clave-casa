# clave.casa Design System

_Last updated: 2026-05-02. Mirrors [Clave iOS's design-system.md](https://github.com/DocNR/clave/blob/main/docs/design-system.md) — iOS is the source of truth; this doc records web-specific translations._

## Cross-platform note

Clave's design language is anchored in the iOS app. The iOS doc (`docs/design-system.md` in [DocNR/clave](https://github.com/DocNR/clave)) defines the visual tokens, component philosophy, and anti-patterns. This doc translates those into web idioms (CSS variables, `<dialog>` modals, animation in lieu of haptics) and notes the small set of intentional divergences.

When iOS and web disagree:

- Visual **tokens** (color, type, spacing) are universal — propagate iOS changes here.
- **Chrome conventions** (sheets, toolbars, haptics) need translation — pick the closest web idiom.
- When in doubt, the iOS doc wins. Open an issue if a web translation feels lossy.

| Carries directly from iOS | Web-specific translation |
|---|---|
| 12-entry AccountTheme palette (`src/lib/theme.ts`) | `linear-gradient` strings (CSS) instead of SwiftUI `LinearGradient` |
| SHA-256 → first 2 bytes → `% palette.length` mapping | Same algorithm via `@noble/hashes/sha2.js` |
| `displayLabel` resolution chain (petname → display_name → name → npub-prefix) | `src/lib/labels.ts` — typed inputs vs Swift extension |
| Identity-zone vs functional-zone philosophy | Identity zone = sticky header + ambient gradient + Avatar; functional zone = `FormSectionCard` content |
| Avatar treatments A (opaque-backed PFP) and B (pubkey-hue) | Treatment C (letter-on-translucent-22%) deferred — no saturated-gradient surface yet |
| Anti-patterns (white-on-grey, transparent PFP, etc.) | Direct port — see §11 |
| Haptics map | Subtle CSS transitions (`.transition-transform`, `.active:scale-95`); no sound |
| `presentationBackground` (sheets) | Native `<dialog>` with explicit `bg-[var(--clave-surface-alt)]` |
| Toolbar conventions | Sticky `<header>` with `backdrop-blur-xl` |

---

## 1. Philosophy

Two zones, identical to iOS:

**Identity zone** — the sticky header + per-account ambient gradient + profile-page avatar. Carries the active account's color through `--clave-tint`, `--clave-tint-fg`, and the body-level `--clave-ambient` overlay.

**Functional zone** — `FormSectionCard` content, list rows, modals, status pills. Uses neutral surface tokens (`--clave-surface`, `--clave-surface-alt`, `--clave-border`) and the muted text color.

The identity zone tells you *which account* you're acting as; the functional zone tells you *what to do*. Don't blur them.

---

## 2. Color & theme

### AccountTheme (per-account identity)

`src/lib/theme.ts` defines a 12-entry palette lifted byte-for-byte from `Shared/AccountTheme.swift` in the iOS repo. Indexed by `gradientIndexForPubkey(hex)` — SHA-256 of the lowercased hex pubkey, first 2 bytes as uint16, `% PALETTE.length`. Same npub → same theme on iOS, on web, on any future client.

```ts
import { themeForPubkey, gradientCss } from '$lib/theme';
const theme = themeForPubkey(account.pubkeyHex);
// theme.start, theme.end → gradient endpoints
// theme.accent          → darker tone for tints + focus rings
// theme.index, theme.name → debug only
```

**Stability rules** (load-bearing — break and existing accounts get reassigned colors):

- Never reorder palette entries.
- Never insert mid-array and renumber.
- Append-only at the end is safe.
- Refining colors *within* an existing index is acceptable; breaking the index → pubkey mapping is not.
- The `iOS↔web` palette must stay byte-identical. Any palette change here MUST also land in `Shared/AccountTheme.swift` in the same release.

**Defensive guards:** `gradientIndexForPubkey` falls back to index 0 for empty / non-hex input.

### CSS variables (set on `:root`)

Defined in `src/app.css`; runtime overrides in `src/routes/+layout.svelte` `$effect`.

| Var | Purpose |
|---|---|
| `--clave-tint` | Active account's `theme.accent`. Used for buttons, links, focus rings, active-tab background. |
| `--clave-tint-fg` | Auto-contrasted foreground (`fgForHex(theme.accent)`) for text on tint backgrounds. |
| `--clave-ambient` | The four-stop `linear-gradient(to bottom, …)` rendered by `.clave-ambient-layer`. |
| `--clave-surface` | Translucent neutral panel (`rgb(245 245 245 / 0.6)`) — sticky header, FormSectionCard. |
| `--clave-surface-alt` | Solid white — modals, inputs, dropdowns. |
| `--clave-border` | Subtle `rgb(0 0 0 / 0.08)` for hairline rules. |
| `--clave-text` | Primary heading / body copy color (`rgb(23 23 23)`, neutral-900). |
| `--clave-text-muted` | Supporting text + captions (`rgb(115 115 115)`, neutral-500). |
| `--clave-radius-card` | 16px — matches iOS 16pt cards. |
| `--clave-radius-input` | 12px — matches iOS 12pt inputs. |

### Pubkey-hue derivation (Treatment B fallback)

When a kind 0 has no picture and the user has opted out of Robohash, `Avatar.svelte` falls back to a deterministic gradient unique to the pubkey. Mirrors iOS `AvatarView`'s pubkey-hue derivation.

```ts
import { pubkeyHueGradient } from '$lib/theme';
const hue = pubkeyHueGradient(account.pubkeyHex);
// hue.css → linear-gradient(135deg, hsl(...) hsl(...))
// hue.fg  → '#ffffff' (always white for the curated lightness range)
```

iOS uses HSB(brightness 0.9 / 0.7); web uses HSL(lightness 60% / 45%) at saturations 70 / 60. The hue family matches across both color spaces; pixel parity is not guaranteed (HSB and HSL aren't linearly convertible).

### When to use which

| Surface | Color | Notes |
|---|---|---|
| Sticky header background | `--clave-surface` over `backdrop-blur-xl` | Translucent, blur-backed; matches iOS toolbar feel |
| Active tab pill (`/connect`) | `--clave-tint` background, `--clave-tint-fg` text | Inactive tab inherits `--clave-text` on transparent |
| Avatar ring | `theme.accent` (AccountTheme) | 1.5–3px depending on size |
| Avatar interior (no PFP) | `pubkeyHueGradient(pubkey).css` | Distinct from the ring — design-system.md §4 |
| Page ambient overlay | `--clave-ambient` (four-stop, see §6) | Carries account identity into the upper viewport |
| Input focus ring | `var(--clave-tint) / 40%` | Subtle, theme-tinted |
| Primary button (Save) | `--clave-tint` background | Foreground is `--clave-tint-fg` |
| Destructive button | `bg-red-600` text-white | Saturated red is appropriate; white on saturated reads cleanly |

Don't apply theme tints to functional-zone neutrals (FormSectionCard backgrounds, list rows, modals). Identity is for identity surfaces.

---

## 3. Typography

System font stack (no custom typeface):

```css
font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable Text',
    'Segoe UI', system-ui, sans-serif;
```

Scale (1pt iOS → 1px web, with caveats noted):

| Element | Tailwind / size | Weight |
|---|---|---|
| Brand wordmark (`clave.casa`) | `text-base` (16px) | `font-semibold` |
| Page heading (`/edit`) | `text-3xl` (30px) | `font-semibold` |
| Form section header | `text-sm` (14px) | `font-semibold` |
| Field label | `text-sm` | `font-semibold` |
| Field input | `text-base` (mobile-clamped to 16px to prevent iOS Safari focus-zoom) | regular |
| Helper / muted | `text-xs` (12px) | regular, `--clave-text-muted` |
| Avatar initial | `dimensions[size].font` (11–36px) | `font-semibold` |
| npub display | `font-mono text-[11px]` to `text-sm` | `font-medium` |

**Mobile focus-zoom guard.** `app.css` clamps `input/textarea/select` font-size to 16px below 768px viewport — iOS Safari auto-zooms on focus when text < 16px and never recovers on blur.

---

## 4. Avatars

Treatment selection rule (from iOS):

| Context | Treatment |
|---|---|
| Cached PFP / Robohash URL set | A — `<img>` with `bg-white` opaque backing |
| Empty PFP, sitting on a neutral background (header, modal, `/edit` profile header) | B — `pubkeyHueGradient` interior + AccountTheme ring |
| Empty PFP, sitting on a saturated theme gradient | C — letter-on-translucent-22% (deferred; no surface yet) |

### Treatment A: cached PFP

```svelte
<!-- bg-white is the iOS Treatment-A "opaque backing".
     Required so transparent-PFP images (robohash, some kind:0 avatars) don't
     let the gradient ring bleed through the silhouette. Don't remove. -->
<img class="rounded-full bg-white object-cover" ... />
```

The `bg-white` is non-negotiable. Robohash URLs render with transparent backgrounds; without the opaque backing, the AccountTheme ring shows through and the silhouette becomes indistinguishable from the ring color. This is the same fix iOS uses (`Color(.systemBackground)` ZStack base).

### Treatment B: pubkey-hue fallback

```svelte
<span style:background={hue.css} style:color={hue.fg} style:border="…px solid {theme.accent}">
    {initial}
</span>
```

Ring uses AccountTheme (12 colors, account-scoped); interior uses pubkey-hue (~65k colors, pubkey-distinct). Strip-pill-style differentiation across siblings on the same device.

### Sizing scale

Reference: `src/lib/components/Avatar.svelte` `dimensions` map.

| Size | Diameter | Ring | Initial font | Where used |
|---|---|---|---|---|
| `sm` | 24px | 1.5px | 11px | AccountSwitcher rows |
| `md` | 32px | 2px | 13px | Sign-out dialog header |
| `lg` | 44px | 2px | 17px | Picture-edit dialog preview |
| `xl` | 96px | 3px | 36px | `/edit` profile header |

---

## 5. Spacing

Tailwind utility scale (1 unit = 4px), aligned with iOS pt values where applicable.

### Page wrapper

```svelte
<main class="mx-auto max-w-3xl px-4 py-6">
```

`max-w-3xl` (768px) keeps editor lines readable on wide displays. `px-4` (16px) on mobile, generous gutter on desktop via the centered max-width.

### Sticky header

```svelte
<header class="sticky top-0 z-20 backdrop-blur-xl">
    <div class="mx-auto max-w-3xl px-4 py-3 …">
```

12px vertical, 16px horizontal, blur over `--clave-surface`. Matches the iOS NavigationBar visual rhythm.

### FormSectionCard

```svelte
<section class="space-y-3 rounded-2xl … p-4">
```

16px internal padding, 12px between children (`space-y-3`). Card corners 16px (`--clave-radius-card`).

### Edit page section gap

`<div class="space-y-6">` between cards (24px). Reads as a clear group break without feeling spaced-out.

### Modal (`<dialog>`)

```svelte
<div class="w-[min(420px,calc(100vw-2rem))] p-5">
```

20px internal padding, max 420px / viewport-safe min. Buttons gap-2 (8px) at the bottom.

---

## 6. Ambient gradient

Mirrors iOS HomeView. Four-stop top → bottom progressive fade carries the active account color into the upper viewport and dies off near the bottom for content legibility.

```ts
// src/lib/theme.ts
export function ambientGradientCss(theme: AccountTheme, scheme: 'light' | 'dark'): string {
    const a = scheme === 'light' ? [0.38, 0.26, 0.12, 0.06] : [0.3, 0.2, 0.1, 0.05];
    return [
        `linear-gradient(to bottom,`,
        `${hexToRgba(theme.start, a[0])} 0%,`,
        `${hexToRgba(theme.end, a[1])} 35%,`,
        `${hexToRgba(theme.end, a[2])} 70%,`,
        `${hexToRgba(theme.start, a[3])} 100%)`
    ].join(' ');
}
```

Rendered by a fixed-position `<div class="clave-ambient-layer">` in `+layout.svelte`. The layer sits above the wrapper's `bg-neutral-50` base and below the page content. Switches via `$effect` on the active connection.

```svelte
$effect(() => {
    const theme = themeForPubkey(activePubkey);
    root.style.setProperty('--clave-tint', theme.accent);
    root.style.setProperty('--clave-tint-fg', fgForHex(theme.accent));
    root.style.setProperty('--clave-ambient', ambientGradientCss(theme, 'light'));
});
```

The 300ms `transition: background` in `app.css` smooths account-switch transitions.

**Don't** put the ambient gradient on functional-zone surfaces (modals, error banners). It belongs to the page identity.

---

## 7. Components

| Component | File | One-liner |
|---|---|---|
| `Avatar` | `src/lib/components/Avatar.svelte` | Cached-PFP with opaque backing OR pubkey-hue interior; AccountTheme ring; sm/md/lg/xl |
| `AccountSwitcher` | `src/lib/components/AccountSwitcher.svelte` | Header dropdown of paired connections; per-row sign-out with native `<dialog>` confirm; "Adding account" pill state on `/connect` |
| `FormSectionCard` | `src/lib/components/FormSectionCard.svelte` | Rounded-2xl panel with optional sentence-case headline |
| `StatusPill` | `src/lib/components/StatusPill.svelte` | Capsule with ok/fail/pending/neutral tone via Tailwind semantic colors |
| `RelayList` | `src/lib/components/RelayList.svelte` | Wrapped grid of StatusPills for per-relay publish results |
| `Field` | `src/lib/components/Field.svelte` | Text input with rounded-xl border + theme-tinted focus ring |
| `TextareaField` | `src/lib/components/TextareaField.svelte` | Same as Field, multi-line |

Use `$lib/labels.ts` `displayLabel(...)` everywhere we render an account name. Don't inline the petname → display_name → name → npub chain.

---

## 8. Modals & headers

### Native `<dialog>` modal pattern

```svelte
<dialog
    bind:this={confirmDialog}
    onclose={() => (open = false)}
    class="fixed inset-0 m-auto rounded-2xl border border-[var(--clave-border)] bg-[var(--clave-surface-alt)] p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
>
```

- **`fixed inset-0 m-auto`** restores native centering after Tailwind 4's Preflight sets `margin: 0` on `<dialog>`.
- **`bg-[var(--clave-surface-alt)]`** is non-negotiable — translucent dialogs are distracting and lose contrast on real device.
- **`backdrop:bg-black/40 backdrop:backdrop-blur-sm`** styles the `::backdrop` pseudo-element; matches the iOS sheet feel.
- Use `dialog.showModal()` / `dialog.close()` — gets ESC handling and focus-trap for free.

### Sticky header

```svelte
<header class="sticky top-0 z-20 border-b border-[var(--clave-border)] bg-[var(--clave-surface)] backdrop-blur-xl">
```

`backdrop-blur-xl` over a translucent `--clave-surface` produces the iOS NavigationBar feel without a custom Material shader.

---

## 9. Copy patterns

### Named-account destructive copy

When confirming destructive actions, name the account explicitly. iOS uses `@<displayLabel>`; web matches.

```svelte
<h2>Sign out {displayLabel({ connection: c, pubkeyHex: c.accountPubkey })}?</h2>
```

Reads as "are you sure you want to do X to *this specific account*?" rather than ambiguous "are you sure?" prompts.

### Refresh / sync copy

Verb + noun. `Sync across Nostr` over `Sync`. `Save and publish` over `Save`. Preserves what specifically is happening.

### Empty states

State + concrete action hint. `"Loading your profile…"` rather than just `"Loading"`. Name actual clients in setup hints (`"Sign in with a NIP-46 signer (Clave, Amber, nsec.app)"`).

---

## 10. Animation in lieu of haptics

Web has no haptics. Translate iOS haptic events to subtle CSS transitions:

| iOS event | Web equivalent |
|---|---|
| `.light` impact (tap) | `.transition-transform .active:scale-95` on the tap target |
| `.success` notification | Brief `.text-emerald-600` flash + `Copied` checkmark (see clipboard pattern) |
| `.warning` notification | `.shake-once` keyframe (defined per-feature, not global) |
| `.error` notification | Color-shift to `.text-red-600` in the inline error region |

No sound. No vibration API (browser support is uneven and consent-gated). Animations should be ≤300ms and respect `prefers-reduced-motion`.

---

## 11. Anti-patterns

These were identified during the iOS Stage C polish session and the web design-unification pass. Don't reintroduce them.

### Hardcoded `text-white` on system / neutral backgrounds

```svelte
<!-- ❌ Invisible in light mode (white on near-white) -->
<p class="bg-[var(--clave-surface)] text-white">…</p>

<!-- ✅ Adaptive -->
<p class="bg-[var(--clave-surface)] text-[var(--clave-text)]">…</p>
```

White is appropriate over **saturated** theme colors (Avatar interior, destructive button background, ambient gradient at high alpha). On neutral / system backgrounds, use `--clave-text` or `--clave-text-muted`.

### AccountTheme gradient on empty avatar interior

```svelte
<!-- ❌ Avatar interior matches the ring → tonal blob -->
<span style:background={gradientCss(theme)} style:border={`…solid ${theme.accent}`}>…</span>

<!-- ✅ Pubkey-hue distinct from ring -->
<span style:background={pubkeyHueGradient(pubkey).css} style:border={`…solid ${theme.accent}`}>…</span>
```

Ring is per-account identity (12 colors); interior is per-pubkey distinctness (~65k). Mixing them collapses the visual hierarchy.

### Translucent `<dialog>`

```svelte
<!-- ❌ Default <dialog> background may be transparent — distracting on real device -->
<dialog class="rounded-2xl">

<!-- ✅ Explicit surface -->
<dialog class="rounded-2xl bg-[var(--clave-surface-alt)]">
```

Always set `bg-[var(--clave-surface-alt)]` (or `--clave-surface` if a translucent panel is intentional). Never leave the default.

### Inline `displayLabel` chain

```svelte
<!-- ❌ Petname → displayName → npub chain inlined per-component -->
<h1>{conn.label || profile.display_name || profile.name || npubEncode(pubkey).slice(0, 12)}</h1>

<!-- ✅ Single source of truth -->
<h1>{displayLabel({ connection: conn, profile, pubkeyHex: pubkey })}</h1>
```

If you write `petname || display_name || …` anywhere outside `lib/labels.ts`, you're doing it wrong.

### Tailwind utility classes for theme tints

```svelte
<!-- ❌ Tailwind 4 doesn't auto-derive utilities from CSS vars; this class doesn't compile -->
<button class="bg-clave-tint">…</button>

<!-- ✅ Use the var directly via style: or arbitrary-value -->
<button style:background="var(--clave-tint)">…</button>
<button class="bg-[var(--clave-tint)]">…</button>
<!-- ✅ Or apply via a scoped <style> -->
<button class:active-tab={isActive}>…</button>
```

### Reordering palette entries

```ts
// ❌ Inserting mid-array reassigns the index → pubkey mapping for every existing account
PALETTE.splice(3, 0, { start: '#NEW', end: '#NEW', accent: '#NEW', name: 'New', index: 3 });

// ✅ Append-only at the end is safe (and stays in sync with iOS AccountTheme.swift)
```

The 12-entry palette is **load-bearing**. Existing users will see their account's color jump to a different palette entry — confusing and breaks "same npub → same color across iOS and web".

### Hardcoded `.dark` styling

clave.casa is currently light-mode only (`@variant dark (.dark &)` with no `.dark` ever applied). When adding new components, don't sprinkle `dark:bg-…` everywhere "just in case" — they're dead code and create drift if dark mode ever returns.

---

## 12. References

- `src/lib/theme.ts` — palette + `gradientIndexForPubkey` + `pubkeyHueGradient` + `ambientGradientCss`
- `src/lib/labels.ts` — `displayLabel` helper
- `src/lib/components/Avatar.svelte` — Treatments A and B reference impl
- `src/app.css` — CSS variable layer
- `src/routes/+layout.svelte` — sticky header + ambient layer wiring
- [Clave iOS source-of-truth design doc](https://github.com/DocNR/clave/blob/main/docs/design-system.md)
- [Clave iOS `Shared/AccountTheme.swift`](https://github.com/DocNR/clave) — palette source
