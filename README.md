# syncflow-agency

The source of [syncflow.agency](https://syncflow.agency), the website of a digital architecture studio, and the reference code behind what that site claims: a fail-safe event queue, signed and verified webhooks, example integration mappers, and a release gate that anyone can run.

Nothing in this repository is a client system. The site says so too: its showcase pages are the studio's own specimens, not client work.

## Verify it yourself

You need Git, Node.js 20.19 or newer and npm. The release gate also needs Google Chrome (set `CHROME_PATH` if it is not in a standard location) and a free port 3190.

```bash
git clone --depth 1 https://github.com/yusufsutcu5441-web/syncflow-agency.git
cd syncflow-agency/syncflow-web
npm ci

npm run arch:verify -- --report   # the reference queue: contract tests plus a table of every failure scenario; a few seconds, no browser
npm run release:verify            # the whole release gate, eight steps; 13 to 15 minutes on a quiet machine
```

To check exactly what was recorded for a release, add `--branch <tag>` to the clone. Release tags are named `release-YYYY-MM-DD`, with a letter suffix for a second release on the same day (`git ls-remote --tags origin` lists them). The results recorded for each release are in [syncflow-web/docs/deployment.md](syncflow-web/docs/deployment.md), section 7.

### What the release gate runs

| Step | What it checks |
|---|---|
| 1 | Types, lint and translation parity across the seven live languages |
| 2 | Design audit with a production build: dependencies, design tokens, i18n, security and briefing hardening, motion, a ban on unverified claims, the first-load bundle budget |
| 3 | Briefing delivery contract tests (an SMTP conversation and the Telegram Bot API, each against a loopback fake) |
| 4 | Architecture contract tests: queue, signed envelope, example mappers, generated documents |
| 5 | The production server starts |
| 6 | HTTP smoke test against the production server |
| 7 | CSP violations and console errors over 12 page visits |
| 8 | Real-browser flow in Chrome |

The gate deliberately leaves the delivery and bot-check variables unset. It proves the build that ships with the site's honest defaults: the briefing form opens a prepared email draft, and the legal pages are drafts.

### Limits you should know before you run it

- Tested on Windows 11 with Node 24 and Chrome. The scripts contain macOS and Linux Chrome paths, but those platforms were not run.
- The design audit prints its labels and its summary in Turkish: `233 geçti, 1 uyarı, 0 hata` means 233 passed, 1 warning, 0 failed.
- Release tags up to `release-2026-10-19b` load the delivery tests' TypeScript directly, which only Node 22.18 or newer can do: on Node 20.19 to 22.17 step 3 of the gate fails there (`ERR_UNKNOWN_FILE_EXTENSION`, seen on 20.19.0). From the next commit on the tests are compiled first and pass on Node 20.19.0 as well; `npm run arch:verify` was never affected.
- The browser step (8) is timing-sensitive on a heavily loaded machine. If it fails, run the gate again on a quiet machine before reporting it. `node scripts/browser-flow.mjs <url> --throttle=4` runs the same checks with every page's CPU slowed fourfold, which is how that sensitivity is measured.
- A passing gate is evidence about this repository at one commit. It is not a certification or a security audit, and it says nothing about a client's volumes, credentials or legal context.

## What is in the repository

```
syncflow-web/            the Next.js 16 application (App Router, React 19, strict TypeScript, Tailwind v4, next-intl); every command runs here
  lib/arch/              the reference architecture: fail-safe queue, signed envelope (HMAC-SHA256, AES-256-GCM), example mappers
  tests/arch/            its contract tests (Node's built-in test runner)
  docs/architecture/     the evidence documents, in English
  docs/adr/              the architecture decision records, in Turkish
  scripts/               the release gate and the checks it runs
  messages/              translations (seven live languages)
LICENSE                  MIT
```

The Salesforce, HubSpot, SAP and Oracle mappers are illustrative payload shapes with contract tests. They are not integrations with those systems.

### Evidence tiers

The architecture documents sort every claim into one of three tiers, and a claim is never described as being in a higher tier than it is:

- **A.** Implemented in this repository and exercised by its tests.
- **B.** A reference implementation verified by executable contract tests, not wired to any client's systems. The fail-safe queue is tier B.
- **C.** Not claimed.

Start with [syncflow-web/docs/architecture/README.md](syncflow-web/docs/architecture/README.md); it ends with what is not claimed.

### Status of the live site

- The briefing form opens a prepared email draft until delivery credentials are set. The signed-webhook delivery path is verified against a mock receiver only.
- The legal pages are drafts with placeholders and are marked `noindex`.
- The translations other than English and Turkish are machine-written drafts that have not had a native-speaker review.

## Languages

This page and [syncflow-web/docs/architecture/](syncflow-web/docs/architecture/) are in English, as is the code. The application README ([syncflow-web/README.md](syncflow-web/README.md)) and the decision records are in Turkish, the studio's working language.

## License

[MIT](LICENSE) for the source code. Not covered by it:

- The typefaces in `syncflow-web/public/fonts` (Inter Display and Syne) are under the SIL Open Font License 1.1; the license texts sit next to the files.
- The studio's name, logo and brand artwork (`syncflow-web/brand/`, the generated logo paths in `syncflow-web/lib/brand-paths.ts`, and the icons under `syncflow-web/app/` and `syncflow-web/public/brand/`) are not licensed for reuse.
- Dependencies keep their own licenses. The optional video-rendering toolchain (Remotion, a development dependency) has its own terms; see `syncflow-web/README.md`, section 6.

## Contact

[contact@syncflow.agency](mailto:contact@syncflow.agency). Security reports: <https://syncflow.agency/.well-known/security.txt>.
