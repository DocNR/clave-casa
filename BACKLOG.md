# clave.casa Backlog

Open work, ordered roughly by priority.

## Now (next session)

- [x] **Deploy to clave.casa** — shipped 2026-05-03. Cloudflare Pages auto-deploys on every push to `main`. Custom domain `clave.casa` (apex) via CNAME-flattening to `clave-casa.pages.dev`. Build config: `npm run build` → `build/`, `NODE_VERSION=20` env var override. CF-free-tier suffices for the foreseeable future. AASA at `/.well-known/apple-app-site-association` validated via Apple CDN. Site live, all routes (`/`, `/connect`, `/edit`) responding 200, HTTPS auto-provisioned via CF Universal SSL. Web Analytics intentionally OFF (privacy promise).
- [x] **Marketing landing page on clave.casa root** — shipped 2026-05-02. Clave-iOS-led, seven sections, real-component product mockup, no analytics. Spec at `docs/superpowers/specs/2026-05-02-marketing-landing-design.md`. Follow-ups under "Marketing landing follow-ups" below.
- [ ] **Clave iOS new-account flow integration** — when a Clave user generates a fresh account, present an "Open profile editor" affordance that hands off to `clave.casa/connect#bunker=…`. Lands on `feat/multi-account` after that branch merges to `main`. Spec'd in `~/.claude/plans/are-there-any-nostr-gentle-ripple.md` (the original macro plan).
- [ ] **`/edit#bunker=…` route — accept fragment-prebound deeplink from Clave iOS AccountDetailView.** Coordinates with the iOS-side AccountDetailView redesign sprint shipping in build 45 (v0.2.0). New iOS-side "Edit on clave.casa" row in the Profile section opens `https://clave.casa/edit#bunker=<URL-encoded-bunker-uri>`. Required clave.casa work: (a) extract `signer_pubkey` from the parsed bunker URI in the fragment; (b) check `connections.ts` localStorage for an existing pairing on that pubkey; (c) **if match** → ignore the secret entirely (account already paired), set active account = matched account, navigate to `/edit`; (d) **if no match** → pair using the full bunker URI handshake, store in localStorage, set active, navigate to `/edit`; (e) `history.replaceState` to scrub the fragment from the URL bar after parse (same pattern `/connect` already uses). Different active account on clave.casa at link-open time = implicit switch (the user's intent is unambiguous — they tapped Edit-for-account-X from Clave iOS). Malformed / expired URI → fall through to manual connect form with inline error.
- [ ] **Apple App Site Association (AASA) file at `/.well-known/apple-app-site-association`.** Coordinates with iOS-side Phase B (Universal Links wiring) to fix the `nostrconnect://` scheme-squatting issue (Primal also registers the scheme; iOS provides no user override). Required: serve valid AASA JSON declaring `applinks` for the Clave iOS app ID. **Critical scoping rule:** the `components` filter MUST be tight to `/connect/` ONLY — never claim `/edit`, never claim apex `/`. Universal Links is for inbound deeplinks Clave iOS owns (the `nostrconnect://` replacement at `/connect/?uri=…`); `/edit#bunker=…` and the marketing landing at `/` MUST stay routed to Safari/clave.casa. Bundle ID format: `<TEAMID>.dev.nostr.clave` — confirm exact TEAMID + bundle ID with Clave iOS Xcode project (Signing & Capabilities) before publishing the AASA. Recommended `components` shape:

  ```json
  {
    "applinks": {
      "details": [{
        "appIDs": ["<TEAMID>.dev.nostr.clave"],
        "components": [
          { "/": "/connect/", "?": { "uri": "?*" } }
        ]
      }]
    }
  }
  ```

  Verify after deploy with `curl -s https://clave.casa/.well-known/apple-app-site-association | jq .` and Apple's [AASA Validator](https://branch.io/resources/aasa-validator/). iOS caches AASA aggressively (~24h propagation), so verify on a fresh device or `swcutil reset` to force re-fetch during dev.

## Marketing landing follow-ups (post-deploy)

- [x] **Real public TestFlight URL** — landed 2026-05-02. `src/lib/marketing.ts:TESTFLIGHT_URL` now points to `https://testflight.apple.com/join/5Mx5AZx7`.
- [ ] **Replace `<EditorMockup />` with a real screenshot** — once we deploy and have a polished /edit page, capture a 1× and 2× PNG of the editor in a clean state, swap into section 4 of `src/routes/+page.svelte` via `<img>`. The component is built so this is a 1-line change.
- [ ] **OG image at 1200×630** — for Twitter Card / Facebook share preview. Reuse the design-system Violet ambient gradient + "Clave" wordmark + tagline. Save to `static/og.png` and add `<meta property="og:image">` in the `<svelte:head>` of `src/routes/+page.svelte`.
- [ ] **Clave iOS app icon SVG** — once available, replace the inline-SVG iPhone outline in `src/lib/components/marketing/HeroPhone.svelte` with the actual app icon (or supplement with it).
- [ ] **Marketing analytics? — only if privacy-preserving** — out of scope for v1 (design contract: zero third-party scripts). If we ever revisit, candidates: Plausible self-hosted, Simple Analytics, or just counting GitHub repo stars as a proxy. Before doing this, update the privacy section accordingly.

## Soon

- [ ] **`/edit/relays`** — kind 10002 (NIP-65) editor. Highest impact of the deferred kinds because it lets users fix the "no relay list found" warning that appears in `/edit` today. Read/write list management + same three-tier publish + stale-scan tooling.
- [ ] **`/edit/contacts`** — kind 3 contact list viewer + backup/restore. Phase 1: read-only listing with export. Phase 2: add/remove follows.
- [ ] **`/p/<identifier>` public profile viewer** — render any account's kind 0 by `npub`, hex pubkey, or NIP-05 (`<local>@<domain>`). No auth required. Useful for sharing profile links.
- [ ] **Banner pencil overlay** — symmetric with the picture pencil. Banner edit modal with the same URL input + Remove pattern. Currently banner URL is in the form but has no visual entry point.
- [ ] **NIP-96 image upload** — replace "paste URL" with "drag and drop / click to upload". Need a default NIP-96 server recommendation (nostr.build / nostrcheck.me are candidates).

## Later

- [ ] **NIP-39 external identities** — `i` tags for Twitter, GitHub, Mastodon, Telegram. Form section with verify-from-platform flows where applicable.
- [ ] **NIP-30 custom emoji** — `emoji` tag editor. Lower priority; few users actually use this.
- [ ] **Profile snapshot/history** — local backup of every kind 0 we've seen for each account, with restore. Useful when a kind 0 gets clobbered.
- [ ] **Outbox-to-followers publish** — opt-in tier 3 of the publish pipeline. Derive followers' read relays from their kind 10002s and broadcast there too. Maximum reach but bandwidth-heavy.
- [ ] **Per-account Robohash style preference** — currently the Robohash set picker is global per device. Most users have ≤2 accounts so this doesn't matter much, but could be per-account.
- [ ] **Banner crop / aspect-ratio preview in modal** — currently picture is 1:1 cropped, banner is wide. The picture editor shows a live preview but the banner editor (when added) should preview at the right aspect.

## Cleanup / tech debt

- [ ] **Drop unused `signWithApprovalWait`** — replaced by `signEventViaBunker` in `signer.ts`. Still exported but no callers.
- [ ] **Upstream PR/issue on nostr-tools** — `BunkerSigner.signEvent` resolves on the first response and ignores the `permission denied → signed event` two-stage pattern. Our `signEventViaBunker` works around it; getting it merged upstream would let us delete that custom code.
- [ ] **Automated tests — expand coverage.** Vitest set up in 2026-05-02 commit. First suite at `src/lib/theme.test.ts` covers SHA-256 → palette index parity vs iOS (22 tests, ✓). Still TODO: deprecated alias migration logic (`displayName` → `display_name`, `username` → `name` in `/edit` save path), three-tier publish report shape (`PublishReport` + `ScanReport` from `propagation.ts`), `displayLabel` precedence chain (`lib/labels.ts`).
- [ ] **Bundle size budget** — track final gzipped size; consider code-splitting `qrcode` so it only loads on `/connect`.
- [ ] **Investigate "invalid string" reconnect failure** — observed 2026-05-02: existing-account Save threw a generic "invalid string" on `connectSigner`; recovered by signing out + re-pairing via `/connect`. Root cause unconfirmed. Likely candidates: corrupted `clave-casa.localKey.<bunker-pubkey>` entry, stale bunker secret after iOS-side rotation, or `parseBunkerInput` regression. **Next time it happens:** capture full DevTools console stack + screenshot the `clave-casa.*` localStorage keys before re-pairing. Consider wrapping the signer connect path with more descriptive error mapping (so the surface message names which input failed to parse).

## Smoke checklist (verify on real device after deploy)

- [ ] Avatar gradient parity vs Clave iOS — connect the same npub on both, confirm matching color. Hash function in `theme.ts` matches `Clave/Shared/AccountTheme.swift` line 31-35.
- [ ] Mobile viewport (iPhone Safari at 375px) — header, picker, modals all readable.
- [ ] Cross-client read — publish from clave.casa, view in Damus / Amethyst / Coracle / Primal within minutes.
- [ ] Sync after partial publish — failing 3 of 5 relays, click Sync, verify the failed relays get retried.

## Future ideas (parked, no pressure)

- Cross-device flow: clave.casa as installable PWA on Mac, with a QR-scan-to-pair flow from iOS.
- Identity origin pinning for NIP-46 (open NIP discussion + propose `&origin=https://clave.casa` in bunker URIs).
- Custom domain hosting (clave.casa subdomain → user's profile, NIP-05 endpoint included).
- Profile-import from another client's existing kind 0 with cross-relay diffing.
