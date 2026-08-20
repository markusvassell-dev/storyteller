# Deployment

The app is a static site — the host only ever serves the application shell and
the public-domain demo stories. Private books never touch the host.

No secrets or environment variables are required (see `.env.example`).

## Recommended: Cloudflare Pages (free)

Unlimited free bandwidth, HTTPS, free custom domains, direct GitHub builds.

1. Sign in at https://dash.cloudflare.com → **Workers & Pages → Create →
   Pages → Connect to Git** and pick this repository.
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - (Leave environment variables empty.)
3. Deploy. The site appears at `https://<project>.pages.dev`.
4. Every push to the production branch redeploys automatically; the included
   `public/_headers` file sets immutable caching for hashed assets and
   no-cache for `index.html`/`sw.js` so updates roll out correctly.

**Custom domain**: Pages project → Custom domains → add your domain (free,
including automatic HTTPS). Any registrar works; DNS on Cloudflare is easiest.

**Rollback**: Pages keeps every deployment — open the deployments list and
"Rollback to this deployment". Because `sw.js` is served no-cache, clients
pick up the rolled-back version on their next update check, via the in-app
"fresh version is ready" banner.

## Fallback: GitHub Pages (no extra account)

A ready workflow lives at `.github/workflows/deploy-pages.yml`.

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main` (or run the workflow manually). It builds with
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
