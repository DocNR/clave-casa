# clave.casa Backlog

Open work, ordered roughly by priority.

## Now (next session)

- [ ] **Deploy to clave.casa** — set up Cloudflare Pages (or Vercel / GitHub Pages) on the `clave.casa` apex, point DNS, configure auto-deploy on `main` push. Static-only, no backend.
- [ ] **Marketing landing page on clave.casa root** — currently `/` is a minimal "Connect" CTA. Real landing should explain who it's for, what NIP-46 is, link to Clave / Amber / nsec.app, screenshots, footer with privacy promise + GitHub link. Could live at `/` and push the connect-or-edit flow to `/app` (or keep current behavior of redirecting authenticated users straight to `/edit`).
- [ ] **Clave iOS new-account flow integration** — when a Clave user generates a fresh account, present an "Open profile editor" affordance that hands off to `clave.casa/connect#bunker=…`. Lands on `feat/multi-account` after that branch merges to `main`. Spec'd in `~/.claude/plans/are-there-any-nostr-gentle-ripple.md` (the original macro plan).

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
- [ ] **Automated tests** — currently zero test coverage. Worth at least: SHA-256 → palette index parity vs iOS, deprecated alias migration logic, three-tier publish report shape.
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
