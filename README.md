# clave.casa

Web companion tools for [Clave](https://github.com/DocNR/clave) and any other NIP-46 remote signer. Edit your Nostr profile (and eventually contact list / relay list) without ever exposing your nsec to the browser — every signing operation goes through your remote signer.

---

## What it does today

- **Edit kind 0 profile metadata** — name, display name, picture, banner, bio, NIP-05, Lightning address, website, bot flag.
- **NIP-46 sign-in** — connect via QR (`nostrconnect://`) or paste a bunker URI. Works with Clave, Amber, nsec.app, any NIP-46 signer.
- **Multi-account** — pair multiple signers, switch between them in the header dropdown. Each account has its own per-pubkey gradient identity (palette lifted verbatim from Clave iOS for cross-platform parity).
- **Three-tier publish** — saves to your declared NIP-65 write relays + a curated broadcast set (purplepag.es, relay.damus.io, nos.lol, nostr.wine, relay.primal.net), with per-relay status reporting.
- **Stale-relay sync** — `Sync across Nostr` button scans ~16 relays for outdated copies of your kind 0 and rebroadcasts the latest signed event to any that are stale or missing.
- **Two-stage NIP-46 approval** — handles signers (like Clave) that respond `permission denied` first and the signed event second after user approval, without retrying or requiring blanket "Always allow" permissions.
- **Default avatars** — Robohash deterministic robot keyed on the npub, with a 5-style picker (Robots / Monsters / Abstract / Kittens / Humans). Auto-fills when no kind 0 picture is set; user can override with a custom URL or clear it for no picture.
- **No analytics, no telemetry, no tracking.**

## Stack

- [SvelteKit 2](https://svelte.dev/docs/kit/) (Svelte 5 runes mode)
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) with class-based dark mode (currently light only)
- [nostr-tools 2](https://github.com/nbd-wtf/nostr-tools) — NIP-46 (`BunkerSigner`), `SimplePool`, NIP-04/44 encryption
- [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) — SHA-256 for the per-account gradient hash
- [`qrcode`](https://github.com/soldair/node-qrcode) — SVG QR for the nostrconnect login flow
- [`@sveltejs/adapter-static`](https://kit.svelte.dev/docs/adapter-static) — outputs a deployable static site

## Local development

Requires Node 20+ (Vite 8 / Svelte 5 dependency).

```bash
nvm use 20
npm install
npm run dev               # http://localhost:5173
npm run dev -- --host     # also bind on LAN (for phone testing)
```

Other commands:

```bash
npm run check    # svelte-check + tsc
npm run build    # static output in build/
npm run preview  # serve the production build locally
```

## Project structure

```
src/
├── routes/
│   ├── +layout.svelte           # sticky blur header + per-account ambient gradient
│   ├── +page.svelte             # landing
│   ├── connect/+page.svelte     # QR (nostrconnect) + bunker paste tabs
│   └── edit/+page.svelte        # kind 0 editor
└── lib/
    ├── theme.ts                 # 12-color Clave palette, SHA-256 gradient hash
    ├── signer.ts                # connectSigner, connectViaNostrConnect, signEventViaBunker
    ├── propagation.ts           # publishThreeTier, scanAndRebroadcast, fetchLatestProfile
    ├── connections.ts           # localStorage CRUD for paired signers
    ├── clipboard.ts             # cross-context copy helper (HTTPS + HTTP fallback)
    ├── avatar-defaults.ts       # Robohash default URL + style picker state
    ├── relays.ts                # broadcast set + scan set
    └── components/              # Avatar, AccountSwitcher, FormSectionCard, StatusPill, …
```

## NIP coverage

| NIP | Status |
|---|---|
| **NIP-01** kind 0 metadata | ✅ |
| **NIP-05** verifier | ✅ |
| **NIP-19** bech32 (npub display + nostrconnect URIs) | ✅ |
| **NIP-24** display_name, website, banner, bot + deprecated alias migration | ✅ |
| **NIP-44** encrypted content for NIP-46 transport | ✅ |
| **NIP-46** remote signing (bunker:// + nostrconnect://) with two-stage response | ✅ |
| **NIP-65** write/read relay list (read-only today) | ⏳ Editor planned |
| **NIP-96** signed HTTP file storage | ⏳ Image upload planned |
| **NIP-39** external identities | ⏳ Editor planned |
| **NIP-30** custom emoji | ⏳ Editor planned |

## Privacy

- **Your nsec never leaves your remote signer.** clave.casa only stores ephemeral local NIP-46 keypairs (the wire-encryption keypair, not your identity) plus the bunker URIs you've paired.
- **No analytics.** No GA, Plausible, Sentry, Cloudflare Web Analytics, or anything else. Server-side is just static asset hosting; the browser does all the work.
- **Robohash sees your npub** when rendering default avatars. The npub is public anyway, but if this bothers you, paste your own picture URL or click `Remove picture` to publish a kind 0 with no picture (other clients will use their own default).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The roadmap and known follow-ups are in [BACKLOG.md](./BACKLOG.md).

## License

[MIT](./LICENSE).
