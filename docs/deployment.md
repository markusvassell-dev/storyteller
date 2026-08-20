# Deployment

The app is a static site — the host only ever serves the application shell and
the public-domain demo stories. Private books never touch the host.

No secrets or environment variables are required (see `.env.example`).

## Node version (required)

The build needs **Node ≥ 20.19 or ≥ 22.12** — Vite 8 refuses to run on older
releases, and a host that defaults to Node 18 fails at `vite build` with
nothing in `dist/`. The repo pins this two ways so no dashboard setting is
needed:

- `.node-version` (`22.22.2`) — read by Cloudflare Pages, Netlify and Vercel.
- `engines.node` in `package.json` — documents the same requirement.

If a host ignores both, set the environment variable `NODE_VERSION=22.22.2`
in its build settings instead.

## Cloudflare Workers (the current dashboard default)

Cloudflare now steers new projects to **Workers** rather than Pages. A Workers
build deploys through wrangler, which needs a config naming the assets
directory — `wrangler.jsonc` at the repo root provides it:

- `assets.directory: "./dist"` — what to upload. Without this, the deploy step
  fails with *"Missing entry-point to Worker script or to assets directory"*
  even though the build succeeded.
- `assets.not_found_handling: "single-page-application"` — serves
  `index.html` for client-routed paths.
- There is deliberately no `main`: the app is static, so the Worker serves
  assets and runs no server code.

**`name` must match the Worker in your account.** It is set to `storyteller`;
if the dashboard named yours differently, edit that one line.

Build settings: build command `npm run build`, deploy command
`npx wrangler deploy` (Workers Builds substitutes `npx wrangler versions
upload` for non-production branches, which uploads a version without putting
it live). Set the **production branch to `main`** so pushes there go live.

## Alternative: Cloudflare Pages (free)

Unlimited free bandwidth, HTTPS, free custom domains, direct GitHub builds.

1. Sign in at https://dash.cloudflare.com → **Workers & Pages → Create →
   Pages → Connect to Git** and pick this repository.
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - (Leave environment variables empty.)
3. Deploy. The site appears at `https://<project>.pages.dev`.
4. Every push to the production branch redeploys automatically. Two files in
   `public/` ship with the build and configure the host:
   - `_headers` — immutable caching for hashed assets, no-cache for
     `index.html`/`sw.js` so updates roll out correctly.
   - `_redirects` — `/* /index.html 200`, the SPA fallback. Without it a cold
     request for `/book/<slug>`, `/admin` or `/settings` (a shared link, a
     bookmark, or the installed app's start_url after a cache miss) gets the
     host's 404 instead of the app. Static files still take precedence.

**Custom domain**: Pages project → Custom domains → add your domain (free,
including automatic HTTPS). Any registrar works; DNS on Cloudflare is easiest.

**Rollback**: Pages keeps every deployment — open the deployments list and
"Rollback to this deployment". Because `sw.js` is served no-cache, clients
pick up the rolled-back version on their next update check, via the in-app
"fresh version is ready" banner.

## Fallback: GitHub Pages (no extra account)

A ready workflow lives at `.github/workflows/deploy-pages.yml`. It is
**manual-only** — it does not run on push, because `actions/deploy-pages`
fails with a 404 until Pages is enabled, and publishing to a second host by
accident is worse than not publishing at all.

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Actions tab → *Deploy to GitHub Pages* → **Run workflow**. It builds with
   `BASE_PATH=/<repo>/` so the PWA works from the project sub-path.
3. Site: `https://<user>.github.io/<repo>/`. Custom domains are supported in
   the Pages settings.

## Cache & update strategy

- Hashed build assets (`/assets/*`): `immutable`, cached for a year.
- `index.html`, `sw.js`, `manifest.webmanifest`: `no-cache` (always
  revalidated) — this is what makes updates propagate.
- The service worker precaches the shell + demo stories; narration audio and
  the PDF worker are cached on first use.
- Updates are **user-prompted**: the new service worker waits until the
  reader taps "Reload" in the update banner (no mid-session cache swap).
- Cache versioning is automatic: Workbox revisions every precached file by
  content hash on each build.

## Installing on iPhone and iPad (current process, verified)

**iPhone**: open the deployed URL in Safari → tap **Share** (the square with
an up arrow) → **Add to Home Screen** → **Add**.

**iPad**: open the URL in Safari → **Share** in the toolbar → **Add to Home
Screen** → **Add**.

The 🌙 Storytime icon launches full screen, works offline, and gets durable
storage. The same guide (with tips) is inside the app: Settings → *Install on
iPhone or iPad*. This is an installable website, not an App Store app.

## After installation

1. **Import private books** on the device itself: Settings → Owner workshop →
   set your PIN → Add a book (see docs/admin-guide.md).
2. **Back up** after adding books: Owner workshop → Backup & restore →
   Export (optionally with a password). Save the file to Files/iCloud Drive.
3. **Transfer to another device**: install the app there, then Owner
   workshop → Backup & restore → choose the backup file. Libraries do not
   sync automatically.

## Pre-deploy checklist

`npm run check && npm run build && npm run audit:links && npm run test:e2e` —
or use the `deploy-check` project skill. The build itself refuses to ship if
the bundled-content rights audit fails.
