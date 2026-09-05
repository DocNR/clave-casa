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

**One relay you must include: `wss://relay.powr.build`.** Put it in the `relays` you pass to `createNostrConnectURI`. Clave answers requests on any relay while it's in the foreground, but a *backgrounded* Clave is woken by a push that its proxy sends only for requests it sees on `relay.powr.build`. Your later `sign_event` / `nip44_*` requests go to the relays from the URI — if that set doesn't include it, Clave never wakes and the request times out. (The shim below merges it in for you.)

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

## The shim: `clave-connect.js`

If you'd rather not hand-roll the wrapping and the iOS return leg, there's a small dependency-free ES module that does exactly the Clave-specific parts and nothing else. **You keep your own NIP-46 transport** (nostr-tools, NDK, …) — the shim never sees your keys and never talks to a relay.

```html
<script type="module">
  import { ClaveConnect, openLink } from 'https://clave.casa/sdk/clave-connect-0.2.0.js';
  // pin the version and the hash: integrity="sha384-qMIsXKObQr4vKbEKax1xx35EJyWyQDDXIccR1M0R51iXATG+wToJZYnalByf3TUF" crossorigin="anonymous"

  const cc = new ClaveConnect({
    // Called whenever a NEW attempt is needed. Persist the client keypair across attempts;
    // only the secret is fresh each time.
    mint: () => ({
      clientPubkey,                 // your persisted client keypair's pubkey (64 hex)
      secret: freshSecret(),        // e.g. 16 random hex chars
      relays: myRelays,             // wss://relay.powr.build is merged in for you
      perms: ['sign_event:1', 'get_public_key'],
      name: 'Conduit',
      url: 'https://sell.conduit.market',   // its domain is what Clave shows largest
      image: 'https://sell.conduit.market/icon.png',
      // Optional return leg — same host as `url`, carrying only a nonce you minted (see "The return leg").
      callback: 'https://sell.conduit.market/clave/return?state=' + freshNonce(),
    }),
  });

  // When the user comes back to the tab, confirm the session even if the connect ack was
  // lost: send get_public_key with your session keypair. It never prompts for a paired
  // client. On an answer, the session is live.
  cc.onReturn(async (attempt) => {
    const pubkey = await myNip46.getPublicKey();   // your transport, your call
    if (pubkey) cc.established();
  });

  // First tap starts an attempt; later taps re-fire the SAME link (same secret) for ~10 min,
  // so a user whose first approval didn't get acked just taps again — no error, no new prompt.
  button.onclick = () => openLink(cc.retry());

  // On an explicit denial from Clave (or your own timeout policy): cc.denied() — the next tap re-mints.
</script>
```

What each piece is for:

| Call | Does |
|---|---|
| `buildConnectURI(params)` | `nostrconnect://` URI with Clave's push-wake relay merged in; values encoded with `encodeURIComponent` (spaces → `%20`, never `+`); throws on a `callback` Clave would drop |
| `universalLink(uri)` | wraps it as `https://clave.casa/connect/?uri=…`, encoded exactly once |
| `openLink(link)` | navigates via a real same-tab `<a>` click — what iOS requires for a Universal Link to fire |
| `cc.start()` / `cc.retry()` | mint a new attempt / re-fire the pending one (10-minute window, persisted in `sessionStorage`) |
| `cc.onReturn(cb)` | fires once per return-to-foreground while an attempt is pending — send the resume probe here |
| `cc.established()` / `cc.denied()` | end the attempt so the next tap mints a fresh secret |

Treat an ack timeout as **retry, not error**: show "Tap Connect again" rather than a failure. The same-device handshake can lose the connect ack (the page's socket freezes seconds after Clave comes to the front); the resume probe recovers a session that was paired, and the re-fire recovers one whose ack never arrived — Clave answers a repeated connect for a pairing it already made without a second prompt.

Versioned copies (`/sdk/clave-connect-<version>.js`) are immutable and CORS-enabled; `/sdk/clave-connect.js` is "latest". The SRI hash for each version is published alongside it (`.sri`).

### The return leg (`callback=`)

Clave reads an optional `callback=` on the nostrconnect URI (Sign in with Clave, Phase 2 — [DocNR/clave#98](https://github.com/DocNR/clave/pull/98); check that PR's status before relying on it in production). What it does with it depends on the scheme:

| Your `callback` | After the user approves |
|---|---|
| `yourapp://…` (native iOS app) | Clave **opens it** — your app comes to the front with the URL. |
| `https://…` (website or installed web app) | Clave **names it, never opens it**: the sheet reads "Afterwards, return to *sell.conduit.market*". iOS would open an https URL in a *new* Safari tab — not the tab, or the installed web app, holding the pending pairing — so the user taps the "◀ Safari" chip instead, which lands on the exact tab or web-app window they left. `cc.onReturn` fires there. |

Rules — the shim enforces the ones it can and throws, because Clave drops a rejected callback *silently* (not shown, not opened):

- **Carry only an opaque nonce you minted.** Never the secret, never the signer pubkey, nothing you would mind in browser history or delivered to another app: a custom scheme is squattable by any installed app. A hijacked callback must cost the user an app switch, not a session.
- **An https callback must have exactly the same host as `url`** — lowercased, one leading `www.` aside, no other normalisation. `attacker.github.io` can never call back as `github.io`, and two tenants of one shared suffix (`*.pages.dev`, `*.vercel.app`) can never redirect to each other. No `url` → no https callback.
- **Absolute URL, no whitespace.** A custom scheme passes as given; schemes iOS itself acts on (`tel:`, `sms:`, `mailto:`, `facetime:`, `itms*`, `shortcuts:`, Settings) and Clave's own (`nostrconnect:`, `clave:`) are refused on the phone.
- **Never on denial, never from the lock screen.** The return leg only follows a foreground approval, and only after the connect ack is on the wire.

Treat the return as a *foreground signal*, not a result: the pairing completes over the relay exactly as before. On return, run the resume probe.

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

In every case, your client's relay listener picks up the signer's ack the same way as before. The Universal Link is purely an additional transport for the URI, not a replacement for your existing handshake logic. If you sent a `callback`, the approval sheet also names where to go back to — see [The return leg](#the-return-leg-callback).

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
- **Include `wss://relay.powr.build` in the URI's relays.** It's the only relay Clave's push-wake proxy watches; without it, requests to a backgrounded Clave time out. If your client caps the relay count, swap one public relay out rather than leaving this one off.

## Reciprocal: receiving a bunker URI from clave.casa

If your client wants to support the inverse flow — a user pastes a Clave-generated bunker URI into your app — there's nothing Clave-specific to do. Bunker URIs (`bunker://...`) are standard NIP-46. Your existing bunker-paste UI works unchanged.

The Universal Link integration is **only** needed for the nostrconnect direction (your client generates a URI that the signer consumes).

## Testing

1. Generate a `https://clave.casa/connect/?uri=nostrconnect://...` link from your client.
2. **On a real iOS device with Clave installed**, tap the link from a context that supports Universal Links (Safari, Notes app, Messages, Mail). Confirm Clave opens with the connect prompt visible.
3. **On the same device after running `sudo swcutil reset`**, tap again — first tap may trigger an AASA fetch + retry. Second tap should be instant.
4. **On a device without Clave installed**, tap the link. Confirm Safari opens clave.casa with the inbound-URI fallback page, QR rendered, install panel visible.
5. **End-to-end smoke test**: with Clave installed, tap → approve in Clave → confirm your client's relay listener received the ack and the session is established.
6. **With `callback` set**: the approval sheet reads "Afterwards, return to *your host*"; after Approve, the "◀ Safari" chip returns to the original tab (or your installed web app), `cc.onReturn` fires there, and the resume probe answers.

Universal Links don't fire from in-app webviews of some apps (Twitter's in-app browser, Slack's preview, etc.) — that's an iOS quirk you can't fix client-side. Users who hit those will fall through to Safari, and our fallback page covers that case cleanly.

## Reach out

Filing issues / PRs against [DocNR/clave-casa](https://github.com/DocNR/clave-casa) is welcome. We're particularly interested in:

- Clients shipping Universal Link support (we'll add a "compatible clients" list to the README)
- Edge cases that break (e.g. specific browsers / webviews / iOS versions where the fallback page misbehaves)
- Brand asset requests beyond what's in `static/brand/` (icon variants, other sizes, other formats)

The goal is to make `nostrconnect://` scheme-squatting a non-issue across the Nostr ecosystem. Every client that adopts Universal Links makes the bug less visible to users.
