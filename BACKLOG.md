# clave.casa Backlog

Open work, ordered roughly by priority.

## Now (next session)

- [x] **Deploy to clave.casa** — shipped 2026-05-03. Cloudflare Pages auto-deploys on every push to `main`. Custom domain `clave.casa` (apex) via CNAME-flattening to `clave-casa.pages.dev`. Build config: `npm run build` → `build/`, `NODE_VERSION=20` env var override. CF-free-tier suffices for the foreseeable future. AASA at `/.well-known/apple-app-site-association` validated via Apple CDN. Site live, all routes (`/`, `/connect`, `/edit`) responding 200, HTTPS auto-provisioned via CF Universal SSL. Web Analytics intentionally OFF (privacy promise).
- [x] **Marketing landing page on clave.casa root** — shipped 2026-05-02. Clave-iOS-led, seven sections, real-component product mockup, no analytics. Spec at `docs/superpowers/specs/2026-05-02-marketing-landing-design.md`. Follow-ups under "Marketing landing follow-ups" below.
- [ ] **Clave iOS new-account flow integration** — when a Clave user generates a fresh account, present an "Open profile editor" affordance that hands off to `clave.casa/connect#bunker=…`. Lands on `feat/multi-account` after that branch merges to `main`. Spec'd in `~/.claude/plans/are-there-any-nostr-gentle-ripple.md` (the original macro plan).
- [x] **`/edit#bunker=…` route** — shipped 2026-05-03 at `8878b4c`. Coordinates with iOS Edit-on-clave.casa row (shipped iOS-side at `c189162`/`d8feae1` in build 45). Algorithm exactly as specified: parse fragment → check existing pairing by `bp.pubkey` → switch-or-pair → scrub fragment via `history.replaceState`. Verified end-to-end on device with build 45+.
- [x] **AASA at `/.well-known/apple-app-site-association`** — shipped 2026-05-03 at `306f63e` + `1d98425`. Two-component scoping (`/connect/?uri=*` + `/connect?uri=*`), `Content-Type: application/json` via `static/_headers`, app ID `944AF56S27.dev.nostr.Clave` (capital C — verified in Xcode pbxproj). Apple CDN-validated. Pairs with iOS Phase B (`1bac9a9`) — Universal Links route `nostrconnect://` deeplinks to Clave even when Primal is installed. **Note:** the original BACKLOG draft used lowercase `dev.nostr.clave` placeholder in the appIDs JSON; actual bundle ID is mixed-case. Critical: don't unify with the lowercase namespace identifiers (app group `group.dev.nostr.clave` and keychain `dev.nostr.clave.shared` predate the bundle-ID spec and are namespace-distinct).

## Marketing landing follow-ups (post-deploy)

- [x] **Real public TestFlight URL** — landed 2026-05-02. `src/lib/marketing.ts:TESTFLIGHT_URL` now points to `https://testflight.apple.com/join/5Mx5AZx7`.
- [ ] **Replace `<EditorMockup />` with a real screenshot** — once we deploy and have a polished /edit page, capture a 1× and 2× PNG of the editor in a clean state, swap into section 4 of `src/routes/+page.svelte` via `<img>`. The component is built so this is a 1-line change.
- [ ] **OG image at 1200×630** — for Twitter Card / Facebook share preview. Reuse the design-system Violet ambient gradient + "Clave" wordmark + tagline. Save to `static/og.png` and add `<meta property="og:image">` in the `<svelte:head>` of `src/routes/+page.svelte`.
- [ ] **Clave iOS app icon SVG** — once available, replace the inline-SVG iPhone outline in `src/lib/components/marketing/HeroPhone.svelte` with the actual app icon (or supplement with it).
- [ ] **Marketing analytics? — only if privacy-preserving** — out of scope for v1 (design contract: zero third-party scripts). If we ever revisit, candidates: Plausible self-hosted, Simple Analytics, or just counting GitHub repo stars as a proxy. Before doing this, update the privacy section accordingly.

## Soon

- [ ] **Sync button visibility for users with NIP-65 published.** Currently the "Sync across Nostr" button is hidden when `nip65Present === true` (assumption: NIP-65 users' write relays already cover what they need). But users with NIP-65 may still want to push their kind:0 wider — to popular discovery relays (BROADCAST_SET) or to the SCAN_SET so other clients with different read-sets can find their profile. Make Sync available regardless of NIP-65 presence; possibly relabel ("Broadcast wider" or "Sync across more relays") to clarify it's additive on top of their declared write set. Reported during external-rollout review (build 51 ship day, 2026-05-04).

- [ ] **Approach #3 follow-up to the kind:0 wipe hotfix:** full original-content merge on save. Today's hotfix (PR #1, `e9202fb`) covers the picture field via `pictureExplicitlySet` and warns on `no-event` via the confirm dialog, but doesn't address fields like banner/about/lud16 that still get dropped via `stripEmpty` if the loaded kind:0 was incomplete. Cleaner long-term fix: cache the parsed kind:0 on load in `originalContent`, then at save time merge form edits onto the original — only fields the user explicitly edited override the original; cleared-by-user fields are removed; unknown fields ride along untouched. Requires per-field "user edited" tracking. Queue for v0.2.2 of clave.casa.

- [ ] **Ecosystem outreach: PR Universal Link support to Nostr web clients.** Doc shipped at `docs/integrations.md` 2026-05-03 — drop-in 5-line change that fixes the `nostrconnect://` scheme-squatting issue. Targets, in rough order of likely traction:
  - **POWR** (own project) — first integration, validates the flow end-to-end on a real client
  - **nostrudel** — high-traffic web client, friendly maintainer (greenart7c3)
  - **Snort** — another high-traffic web client
  - **Coracle** — known to be receptive to NIP-46 work; also fixes their fresh-npub stall via the fallback page
  - **Damus web** — if it picks up
  - **iris.to**, **plebs.zone**, **Habla**, **Highlighter** — long tail
  - PR template: link `docs/integrations.md` + paste the React/Svelte/Vue snippet that matches their stack + add a "Connect with Clave" button next to their existing nostrconnect QR. Each PR should add a single button, not replace anything. Track adoption status in a "Compatible clients" section in `README.md`.
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
- [ ] **Drop redundant `setActivePubkey` synthetic-storage dispatches.** The `setActivePubkey` helper now centrally dispatches a synthetic `storage` event for same-tab listeners (`007a962`, 2026-05-03). The earlier-shipped manual dispatches in `src/routes/connect/+page.svelte:finalizeConnection` and `src/lib/components/AccountSwitcher.svelte:pick` + `signOut` are now redundant — they fire listeners twice. Cosmetic, no functional impact. Remove for hygiene.
- [ ] **Upstream PR/issue on nostr-tools** — `BunkerSigner.signEvent` resolves on the first response and ignores the `permission denied → signed event` two-stage pattern. Our `signEventViaBunker` works around it; getting it merged upstream would let us delete that custom code.
- [ ] **Automated tests — expand coverage.** Vitest set up in 2026-05-02 commit. First suite at `src/lib/theme.test.ts` covers SHA-256 → palette index parity vs iOS (22 tests, ✓). Still TODO: deprecated alias migration logic (`displayName` → `display_name`, `username` → `name` in `/edit` save path), three-tier publish report shape (`PublishReport` + `ScanReport` from `propagation.ts`), `displayLabel` precedence chain (`lib/labels.ts`).
- [ ] **Bundle size budget** — track final gzipped size; consider code-splitting `qrcode` so it only loads on `/connect`.
- [x] **"Invalid string" reconnect failure investigation** — root cause confirmed + closed 2026-05-03. Was the connect path surfacing Clave's exact `"Invalid or missing bunker secret"` error string with no categorization. Fixed across multiple commits: `c5616ea` adds `FriendlyConnectError` categorization with `STALE_AT_CONNECT_PATTERNS` + auto-clean redirect to `/connect?reason=stale`. `77c9174` fixes the regex (old `/invalid secret/i` didn't match the actual phrase since "invalid" and "secret" aren't adjacent — replaced with `/\binvalid\b.{0,30}\bsecret\b/i`). Also added sign-time fail-fast in `signEventViaBunker` (was hanging 120s on "Client not paired" because it treated all errors as Clave's two-stage approval pending). Connect timeout tightened 45s→15s for faster recovery on the account-deleted path (where proxy can't route → no response possible).

## Cross-platform NIP-46 work (proposed extension)

- [ ] **NIP-46 `session_terminated` event spec PR.** Local design at `docs/proposals/nip46-session-termination.md`. clave.casa receiver shipped 2026-05-03 at `27c175b` (no-op until signers publish). iOS publish-side queued for next iOS session (in HANDOFF Next Session Scope #4). Once Clave iOS + clave.casa + POWR all support it, file PR against `nostr-protocol/nips`. Tag Amber + nsec.app + nostr-tools maintainers for ecosystem feedback. Validation: deletion in Clave iOS while clave.casa has the account active in another tab should redirect to `/connect?reason=stale` within ~1s without user interaction.
- [ ] **POWR Universal Link integration** (already in "Soon → Ecosystem outreach" but bumping visibility) — first non-Clave client adoption. Drop-in change per `docs/integrations.md`. Becomes the screenshot/video for upstream PRs to nostrudel/Snort/Coracle.

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
