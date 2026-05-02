# Contributing to clave.casa

Thanks for your interest. clave.casa is a small SvelteKit web app — easy to read, easy to extend.

## Quick start

```bash
git clone https://github.com/DocNR/clave-casa.git
cd clave-casa
nvm use 20
npm install
npm run dev
```

## Working on a change

1. **Pick something off [BACKLOG.md](./BACKLOG.md)** or open an issue describing what you want to do.
2. **Branch off `main`.** Convention: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
3. **Run `npm run check`** before every commit. Zero errors, zero warnings is the bar.
4. **Run the dev server and exercise the change against a real NIP-46 signer.** clave.casa interoperates with Clave iOS, Amber, nsec.app, and other NIP-46 implementations — quirks vary.
5. **Commit messages**: conventional-commits style, lowercase scope, imperative mood. Examples:
   - `feat(profile): add NIP-39 external identity editor`
   - `fix(connect): handle empty relay array in nostrconnect URI`
   - `docs(readme): clarify Tailwind v4 dark-mode setup`
6. **Open a PR** against `main`.

## Style

- **TypeScript strict.** Don't suppress with `any` — use `unknown` and narrow.
- **Svelte 5 runes** (`$state`, `$derived`, `$derived.by`, `$effect`, `$props`, `$bindable`). No `$:` reactive statements.
- **Tailwind 4** with `dark:` variants gated by `@variant dark (.dark &)` (currently no `.dark` is ever applied, so dark utilities stay inactive — by design).
- **CSS variables** for design tokens (`--clave-tint`, `--clave-surface`, etc.). Don't bake hardcoded colors into components.
- **Keep components small and focused.** Each file should have one clear responsibility with a well-defined interface.

## Design language

clave.casa shares its visual language with [Clave iOS](https://github.com/DocNR/clave). Before introducing new components, surfaces, or color treatments, read [`docs/design-system.md`](./docs/design-system.md) — it covers the AccountTheme palette + SHA-256 hash, identity-vs-functional zone philosophy, avatar treatments, modal patterns, and anti-patterns to avoid. iOS is the source of truth ([clave/docs/design-system.md](https://github.com/DocNR/clave/blob/main/docs/design-system.md)); the web doc records the small set of platform translations.

## Testing strategy

We don't currently ship automated tests. Verification today is:

1. `npm run check` (TypeScript + Svelte type-check)
2. `npm run build` (production bundle succeeds)
3. Manual exercise via the dev server with a real signer — connect, edit, save, publish, sync

Adding tests is in the backlog. If you want to lead that, say hi in an issue.

## Privacy & security

- Don't add analytics, telemetry, or third-party scripts. `README.md`'s privacy promise is a design contract.
- Don't change clipboard / NIP-46 / signing flows without thinking about footguns. The two-stage NIP-46 response handler in `signer.ts` is non-obvious — read the comments before refactoring.
- Don't store anything that could re-identify a user beyond their public npub.

## License

By contributing you agree your contributions are released under the [MIT License](./LICENSE).
