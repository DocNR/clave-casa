# Sign in with Clave — brand assets

The "Sign in with Clave" button, in the same idiom as the Sign in with Google / Apple buttons, built from Clave's current logo and clave.casa's design tokens. Served from `https://clave.casa/brand/`.

## Drop-in button

Include the stylesheet once, then use the markup. The stylesheet is self-contained — the Clave mark is embedded in it, so there is nothing else to host.

```html
<link rel="stylesheet" href="https://clave.casa/brand/sign-in-with-clave.css">

<button type="button" class="clave-signin clave-signin--brand">
  <span class="clave-signin__mark" aria-hidden="true"></span>
  Sign in with Clave
</button>
```

An `<a>` works the same way — use it when the button is a real link (for example to the `https://clave.casa/connect/?uri=…` Universal Link on mobile Safari):

```html
<a class="clave-signin clave-signin--light" href="https://clave.casa/connect/?uri=…" target="_self">
  <span class="clave-signin__mark" aria-hidden="true"></span>
  Sign in with Clave
</a>
```

The accessible name is the visible text; the mark is decorative. Disable with the `disabled` attribute (buttons) or `aria-disabled="true"` (links).

## Variants

Recommended: match your UI — `--light` on light pages, `--dark` on dark pages — the same way the Google and Apple buttons sit quietly beside each other. Reach for `--brand` when the button is the page's one primary action.

| Class | Use on | Look |
|---|---|---|
| `clave-signin--light` | light UIs (recommended) | white, 1px violet-tinted border, dark label |
| `clave-signin--dark` | dark UIs (recommended) | dark surface, 1px border, light label |
| `clave-signin--brand` | as a primary action | Clave Violet gradient, white label |
| add `clave-signin--block` | narrow layouts | full-width |

## Lining up beside Google and Apple

Default height is **44px** (Apple's). Google's button is 40px; if you're placing them side by side, match whichever you're using:

```css
.clave-signin { --clave-signin-height: 40px; }
```

Other knobs: `--clave-signin-radius` (default 12px) and `--clave-signin-mark` (default 20px). Keep the label text exactly "Sign in with Clave".

## Static images

Prefer the CSS button — it stays crisp at every size and picks up your page's font rendering. Where you need a static image (email, a design tool, a platform that strips CSS), use the SVGs:

- `sign-in-with-clave-brand.svg`
- `sign-in-with-clave-light.svg`
- `sign-in-with-clave-dark.svg`

Each is 200×44 and self-contained.

## Wiring the click

The button is only the affordance. Building the `nostrconnect://` URI, opening the Universal Link, and handling the return leg on iOS are the job of `clave-connect.js` (see `docs/integrations.md`). Until that ships, `docs/integrations.md` documents the URI format and the connect flow.

## Do

- Use the mark as a circle, as shipped. It is the same mark as the App Store icon.
- Keep the gradient direction and stops as shipped (`120deg`, `#7a8cff → #a14aff`).

## Don't

- Don't recolor the mark, stretch the button, or change the label wording.
- Don't place the brand variant on a violet ground — use `--light` or `--dark` there.
