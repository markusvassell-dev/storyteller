---
name: deploy-check
description: Run the full Storytime Library release gate — typecheck, lint, unit + e2e tests, rights audit, asset audit, link check, production build, PWA validation. Use this before any deploy or push to main, whenever the user says "is it ready to ship", "run all checks", "release", or "deploy".
---

# Deploy check

Run the gates in this order (fast → slow), stopping to fix on first failure:

```bash
npm run typecheck        # TypeScript project build
npm run lint             # ESLint
npm run test             # Vitest unit/integration
npm run audit:rights     # bundled-content rights (also runs inside build)
npm run audit:assets     # image/audio format+size+alt checks
npm run build            # production build (includes rights audit)
npm run audit:links      # story refs, docs links, dist PWA essentials
npm run test:e2e         # Playwright across 5 viewports (needs the build)
```

`npm run check` bundles the non-e2e gates. A release is shippable only when
every command exits 0.

## PWA validation specifics

`npm run audit:links` verifies dist/ has index.html, sw.js,
manifest.webmanifest (name, standalone display, start_url, icon files) and
that the service worker precaches the shell. After deploying, verify on a real
device: install to Home Screen, then airplane-mode relaunch must still open
the library with all six demo books readable.

## Deployment

Hosting is static-only (Cloudflare Pages primary; GitHub Pages fallback needs
`BASE_PATH=/storyteller/`). Follow `docs/deployment.md` for the exact steps,
cache/update behaviour, and rollback notes. Never deploy with a failing rights
audit — that gate exists to keep private or under-documented content off the
public host.
