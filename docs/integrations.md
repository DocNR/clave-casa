# Integrating Clave into your Nostr client

If you build a Nostr client that already supports NIP-46 (`nostrconnect://...` URIs), you can add Clave-friendly login in **about 5 lines**. This page shows how, and why it's worth doing even if your existing nostrconnect flow already works.

## Why bother?

iOS lets multiple apps register the same custom URL scheme (`nostrconnect://`). When a user has both Clave and Primal installed (or any two apps that claim the scheme), iOS picks one **opaquely** — there's no chooser, no setting, no preference. Half the time the user's tap on a `nostrconnect://...` link opens the wrong app.

Universal Links fix this. By generating `https://clave.casa/connect/?uri=...` instead of a raw `nostrconnect://...` URI, you let Apple's domain-ownership chain (DNS → AASA file at clave.casa) route the link to Clave specifically. Primal can't squat the URL because they don't own the domain.

**Scope of the fix:**

- ✅ Users with Clave installed → opens Clave directly, every time
- ✅ Users with both Clave + Primal → opens Clave (the squat is bypassed)
- ✅ Users without Clave but with another signer → fall through to clave.casa, which displays the URI as a QR for any signer to scan
- ✅ Users with no signer → fall through to clave.casa, which surfaces install links for Clave / Amber / nsec.app

**You lose nothing.** Your existing nostrconnect flow keeps working — clave.casa is purely an iOS-Universal-Link transport layer. The signer that ultimately handles the connect request publishes its ack to the relay you specified in the URI, exactly as before.

## The change

Wherever your client currently does:

```ts
// Before — raw nostrconnect URI
const ncUri = createNostrConnectURI({ clientPubkey, relays, secret, name });
showQrCode(ncUri);
copyButton.onclick = () => copy(ncUri);
```

Add a "Connect with Clave" button that wraps the URI in the Universal Link form:

```ts
// After — same nostrconnect URI, also offered via Universal Link
const ncUri = createNostrConnectURI({ clientPubkey, relays, secret, name });
const claveUrl = `https://clave.casa/connect/?uri=${encodeURIComponent(ncUri)}`;

showQrCode(ncUri);                   // existing — for any signer
copyButton.onclick = () => copy(ncUri); // existing — for paste-into-signer
claveButton.href = claveUrl;            // new — Clave-specific button
```

That's it. The button can be an `<a>` tag (recommended — iOS recognizes it as a Universal Link target on tap) or a programmatic `window.location.href = claveUrl`. The relay-listening logic that consumes the signer's ack stays unchanged.

## Drop-in snippets

### Vanilla HTML/JS

```html
<a id="clave-button" target="_self" rel="noopener">Connect with Clave</a>

<script>
  // ncUri is the nostrconnect URI you'd otherwise show as a QR.
  const claveUrl = `https://clave.casa/connect/?uri=${encodeURIComponent(ncUri)}`;
  document.getElementById('clave-button').href = claveUrl;
</script>
```

`target="_self"` matters on iOS — Universal Links only fire on same-tab navigations, not on `_blank`. Most browsers default to `_self` but explicitly setting it avoids surprises.

### React

```tsx
function ClaveButton({ ncUri }: { ncUri: string }) {
  const claveUrl = `https://clave.casa/connect/?uri=${encodeURIComponent(ncUri)}`;
  return (
    <a href={claveUrl} className="clave-button">
      Connect with Clave
    </a>
  );
}
```

### Svelte

```svelte
<script>
  export let ncUri;
  $: claveUrl = `https://clave.casa/connect/?uri=${encodeURIComponent(ncUri)}`;
</script>

<a href={claveUrl} class="clave-button">Connect with Clave</a>
```

### Vue

```vue
<template>
  <a :href="claveUrl" class="clave-button">Connect with Clave</a>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ ncUri: String });
const claveUrl = computed(
  () => `https://clave.casa/connect/?uri=${encodeURIComponent(props.ncUri)}`
);
</script>
```

## Recommended UX

Show **both** affordances side-by-side:

```
┌───────────────────────────────────────┐
│  ████████ ███ ██████  Scan with any  │
│  ██  ██   ██  █   ██  signer (Amber, │
│  ██████   ███ ██████  nsec.app, etc.)│
│  [QR code]                            │
├───────────────────────────────────────┤
│  [Connect with Clave]   ← iOS users   │
│  [Copy connect URI]      ← any signer │
└───────────────────────────────────────┘
```

The QR + copy button cover any signer; the "Connect with Clave" button is the one-tap path for the most-likely-installed iOS signer. Don't make Clave the only option — your users may have Amber, nsec.app, or a future signer.

## What happens when the user taps the button?

| User state | Behavior |
|---|---|
| Clave installed, AASA cached | iOS opens Clave directly with the connect URI; signer publishes ack to the relay; your client's relay listener receives it and the connection is established. |
| Clave installed, AASA not yet cached (rare — first encounter on a fresh device) | Safari opens `https://clave.casa/connect/?uri=...`. Page renders the URI as a QR. User can scan it with Clave on a different device, or wait ~24h for AASA to propagate. |
| No Clave, has another signer | Safari opens our fallback page; user sees QR + copy button to feed into their existing signer. |
| No signer at all | Safari opens our fallback page; install links for Clave / Amber / nsec.app are surfaced. |

In every case, your client's relay listener picks up the signer's ack the same way as before. The Universal Link is purely an additional transport for the URI, not a replacement for your existing handshake logic.

## Brand

The official "Connect with Clave" button lives at `https://clave.casa/brand/` (source: [`static/brand/`](../static/brand/)). It's in the same idiom as the Sign in with Google / Apple buttons, so it lines up beside them.

Include the stylesheet once — it's self-contained, the Clave mark is embedded — and put the classes on the `<a>` from the snippets above:

```html
<link rel="stylesheet" href="https://clave.casa/brand/connect-with-clave.css">

<a class="clave-connect clave-connect--light" href={claveUrl} target="_self">
  <span class="clave-connect__mark" aria-hidden="true"></span>
  Connect with Clave
</a>
```

- **Variants:** `clave-connect--light` (light UIs) and `clave-connect--dark` (dark UIs) are the recommended defaults; `clave-connect--brand` (Clave Violet gradient) when the button is the page's one primary action; add `clave-connect--block` for full-width.
- **Beside Google/Apple:** default height is 44px (Apple's); set `--clave-connect-height: 40px` to match Google's.
- **Static images** (email, design tools): `connect-with-clave-{light,dark,brand}.svg`, 200×44, self-contained.
- Keep the label exactly "Connect with Clave" and the mark as the circle it ships as.

Full notes, knobs, and do/don't in [`static/brand/README.md`](../static/brand/README.md).

## Constraints to keep in mind

- **Universal Links don't fire from `target="_blank"`** — keep your button as `target="_self"` (or omit `target` entirely; default is `_self`).
- **Universal Links don't fire from JavaScript-triggered navigations in some webviews.** Use a real `<a>` tag with `href` whenever possible. `window.location.href` works in Safari but can be flaky in third-party browsers.
- **AASA cache propagation.** First-time devices fetch AASA opportunistically — usually within seconds of first attempting a Universal Link, but can take longer. The fallback page handles this gracefully (renders the QR).
- **Don't double-encode the URI.** `encodeURIComponent(ncUri)` once; passing an already-encoded URI gets `%`-encoded a second time and breaks parsing.

## Reciprocal: receiving a bunker URI from clave.casa

If your client wants to support the inverse flow — a user pastes a Clave-generated bunker URI into your app — there's nothing Clave-specific to do. Bunker URIs (`bunker://...`) are standard NIP-46. Your existing bunker-paste UI works unchanged.

The Universal Link integration is **only** needed for the nostrconnect direction (your client generates a URI that the signer consumes).

## Testing

1. Generate a `https://clave.casa/connect/?uri=nostrconnect://...` link from your client.
2. **On a real iOS device with Clave installed**, tap the link from a context that supports Universal Links (Safari, Notes app, Messages, Mail). Confirm Clave opens with the connect prompt visible.
3. **On the same device after running `sudo swcutil reset`**, tap again — first tap may trigger an AASA fetch + retry. Second tap should be instant.
4. **On a device without Clave installed**, tap the link. Confirm Safari opens clave.casa with the inbound-URI fallback page, QR rendered, install panel visible.
5. **End-to-end smoke test**: with Clave installed, tap → approve in Clave → confirm your client's relay listener received the ack and the session is established.

Universal Links don't fire from in-app webviews of some apps (Twitter's in-app browser, Slack's preview, etc.) — that's an iOS quirk you can't fix client-side. Users who hit those will fall through to Safari, and our fallback page covers that case cleanly.

## Reach out

Filing issues / PRs against [DocNR/clave-casa](https://github.com/DocNR/clave-casa) is welcome. We're particularly interested in:

- Clients shipping Universal Link support (we'll add a "compatible clients" list to the README)
- Edge cases that break (e.g. specific browsers / webviews / iOS versions where the fallback page misbehaves)
- Brand asset requests beyond what's in `static/brand/` (icon variants, other sizes, other formats)

The goal is to make `nostrconnect://` scheme-squatting a non-issue across the Nostr ecosystem. Every client that adopts Universal Links makes the bug less visible to users.
