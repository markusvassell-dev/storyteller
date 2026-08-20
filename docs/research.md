# Research notes

Research performed at implementation time (August 2026) before and during the
build. Sources were used for facts and architectural ideas only — no code,
artwork, or content was copied from any of them.

## Sourcing the public-domain classics library (August 2026)

### Egress restrictions found

The session's organisation egress policy **blocks every conventional book
source**. Verified by probing each host and by
`curl "$HTTPS_PROXY/__agentproxy/status"`, which recorded
`connect_rejected … gateway answered 403` per host:

| Host | Reachable | Notes |
| --- | --- | --- |
| `www.gutenberg.org`, `gutenberg.org`, mirrors | ❌ 403 | Primary source blocked |
| `archive.org`, `iiif.archive.org` | ❌ 403 | Blocks true scanned page images |
| `openlibrary.org`, `standardebooks.org` | ❌ 403 | |
| `commons.wikimedia.org`, `upload.wikimedia.org`, `en.wikisource.org` | ❌ 403 | |
| `raw.githubusercontent.com` | ✅ | Serves any public repo by exact path |
| `api.github.com` | ⚠️ | Session-scoped — cannot list repositories |

WebFetch is subject to the same policy (developers.cloudflare.com was refused);
WebSearch works, which is how titles and ebook ids were confirmed.

### Source chosen: GITenberg (Project Gutenberg mirrored on GitHub)

`raw.githubusercontent.com/GITenberg/<Title-Slug>_<pgId>/master/<pgId>-h/<pgId>-h.htm`
plus its `images/` directory. Verified working end to end, including binary
image downloads. Because the GitHub API cannot list repos here, discovery is
WebSearch (for the illustrated edition's ebook id) plus direct path probes —
`npm run books:probe` automates the probing half.

**Caveat recorded for the future:** GITenberg is a ~2015 snapshot, so a number
of titles are text-only there even though gutenberg.org carries a properly
illustrated edition (Oz, Peter Pan, the Lang fairy books, Andersen). Those
books gain their original artwork the moment `www.gutenberg.org` is unblocked
and `scripts/books/sources/gutenberg.ts` can run — that adapter is written and
dormant, as is `sources/archive.ts` for Internet Archive scanned page images.

### Probe results

80 candidates probed: 14 carried illustrations in the mirror, 28 were
text-only, the rest were absent or listed under a different ebook id. Richest
finds: Household Stories by the Brothers Grimm / Walter Crane (225 images),
Treasure Island (228), Tom Sawyer (166), Lear's Book of Nonsense (115), The
Jungle Book (110), The Green Fairy Book (103), A Child's Garden of Verses (95),
Indian Fairy Tales (85), Alice with Tenniel's engravings (28), and Beatrix
Potter's Peter Rabbit (28).

### Why the library is not 10 GB

The owner asked for up to 10 GB. That cannot ship on free static hosting:
Cloudflare Pages' free tier allows **20,000 files and 25 MB per file**, and a
multi-gigabyte git repository is impractical. A 10 GB library of scanned pages
would be roughly 65,000 files — over the file cap before considering repo size.
The bundled library is therefore a curated ~50 MB, and multi-gigabyte
collections remain possible through the app's existing on-device import path
(IndexedDB on an installed iOS web app can hold gigabytes), which is where
private books already live.

Sources: [Cloudflare Pages limits discussion](https://community.cloudflare.com/t/pages-20-000-file-limit-not-lifted-despite-workers-paid-plan-static-site-with-50k/911111),
[Pages file-limit changelog](https://developers.cloudflare.com/changelog/post/2026-01-23-pages-file-limit-increase/).

## Projects reviewed (prior art)

| Project | URL | Licence | Verdict |
| --- | --- | --- | --- |
| Booksie — open catalog of free picture storybooks | https://github.com/sgtpep/booksie | MIT | **Ideas adopted:** cover-first shelf UI, offline-saved books, zero-tracking stance. Rejected its catalog-of-remote-PDFs model — our books are local-first. |
| bookmarkd — React PWA ebook reader | https://github.com/oliverjam/bookmarkd | MIT | **Ideas adopted:** PWA reader shell that mimics a native app. Rejected EPUB reflow — picture books need fixed pages. |
| eLibri — offline eBook reader (IndexedDB) | https://github.com/marco-c/eLibri | MPL | **Idea adopted:** storing whole books in IndexedDB. Dated (2012) — implementation not reused. |
| thelinuxcast/reader — PWA reader with OPDS | https://codeberg.org/thelinuxcast/reader | GPL-3.0 | Reviewed for offline/IndexedDB patterns. Nothing copied (GPL kept at arm's length; ideas only). |

## Libraries selected (all in package.json)

| Library | Licence | Why |
| --- | --- | --- |
| React 19 + Vite 8 | MIT | Mature, typed, static-first build |
| vite-plugin-pwa (Workbox) | MIT | Well-maintained PWA/manifest/service-worker generation; `registerType: 'prompt'` gives the required update notification |
| Dexie 4 | Apache-2.0 | Ergonomic IndexedDB with live queries (`dexie-react-hooks`) |
| Zod 4 | MIT | Runtime schema validation — malformed books fail loudly |
| pdfjs-dist 6 | Apache-2.0 | Client-side PDF→canvas rendering; keeps scanned books as pictures; loaded lazily so the reader never pays for it |
| fflate | MIT | Small, fast ZIP for CBZ import + backup archives |
| MiniSearch | MIT | Tiny client-side index with fuzzy (typo-tolerant) + prefix search |
| Baloo 2 / Nunito via Fontsource | OFL-1.1 (fonts), MIT (packaging) | Rounded, child-friendly type; self-hosted so offline works |

## Free hosting comparison (checked August 2026)

| Host | Free tier | PWA/HTTPS | Custom domain | Notes |
| --- | --- | --- | --- | --- |
| **Cloudflare Pages** ✅ | Unlimited bandwidth, unlimited sites, 500 builds/mo | Yes/Yes | Free | **Selected.** Only major host with unmetered free bandwidth; serves at site root (clean service-worker scope); direct GitHub integration; `_headers` support for cache rules. |
| GitHub Pages | 100 GB/mo soft cap, public repo (or Pro) | Yes/Yes | Free | **Fallback** — zero extra signup since the repo lives on GitHub. Project sites serve from `/<repo>/`, handled via `BASE_PATH` (workflow included). |
| Netlify | Moved to usage-based credits; tighter free tier | Yes/Yes | Free | Rejected: free tier now metered/credit-based. |
| Vercel | Hobby tier with bandwidth metering, commercial-use limits | Yes/Yes | Free | Rejected: metering + terms friction for no benefit (no SSR needed). |

Sources: [Cloudflare Pages vs alternatives (2026)](https://guptadeepak.com/tools/top-5-static-site-hosting-jamstack-platforms-2026/),
[Static host comparison (2026)](https://htmlpub.com/blog/static-site-hosting-comparison-2026),
[GitHub Pages vs Netlify vs Cloudflare vs Vercel](https://jp-my-blog.vercel.app/blog/github-pages-vs-netlify-cloudflare-pages-and-vercel-the-only-free-static-site-host-comparison-that-matters).

## iOS / iPadOS PWA status (verified August 2026)

- Installation: Safari → Share → **Add to Home Screen**; recent iOS versions
  open added sites as standalone web apps by default. No prompt API on iOS —
  hence the in-app illustrated guide (Settings → Install).
- Service workers, Cache Storage, and IndexedDB are supported; installed
  Home Screen web apps get much more durable storage than plain Safari tabs
  (Safari may evict a *browser* origin's data after ~7 days of non-use).
- `navigator.storage.persist()` is supported on current Safari; the app
  requests it from the Storage screen. Backups remain the real safety net —
  clearing Safari website data still removes local books.
- Web Speech API (`speechSynthesis`) works but only when triggered by a user
  gesture — the app never autoplays narration.
- Audio is streamed with HTTP range requests — the service worker uses
  Workbox's `rangeRequests` handling for cached narration audio.
- Splash screens: `apple-touch-startup-image` still works and requires
  exact-size images per device class; a set of six common portrait sizes is
  generated into `public/splash/`.

Sources: [PWAs on iOS — complete guide (2026)](https://www.mobiloud.com/blog/progressive-web-apps-ios),
[What PWAs can and cannot do on iOS in 2026](https://tips.ojapp.app/en/pwa-ios-2026-complete-guide/),
[PWA iOS limitations & Safari support](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide),
[Safari data persistence discussion](https://developer.apple.com/forums/thread/710157).

## Content sources reviewed

- Traditional folk/fairy tales (Three Little Pigs, Goldilocks, Gingerbread
  Man, Billy Goats Gruff, Aesop's Tortoise & Hare, Grimms' star-money tale)
  are centuries-old and public domain **as tales**. Specific modern
  translations, retellings, and illustrations are usually copyrighted, so the
  demo texts were **written from scratch for this project** and the artwork is
  **original project-generated SVG**, clearly labelled as placeholder art.
  This removes edition-verification risk entirely.
- Project Gutenberg / Wikisource were reviewed as future sources for verified
  public-domain editions; recorded in docs/content-sources.md as candidates,
  not bundled.

## Privacy & copyright risks identified

1. **Bundling private material by mistake** → mitigated by the build-blocking
   rights audit (`scripts/rights-audit.ts`): `owner-permission`,
   `personal-use-only`, or `needs-review` content in `public/stories/` fails
   the build.
2. **Local data loss** (browser eviction, device reset) → persistent-storage
   request + prominent backup flow + in-app warnings.
3. **Accidental uploads** → there is no upload code path at all; the deployed
   site is static and the app makes no network writes.
4. **Unauthorized downloading of copyrighted books** → the importer accepts
   only local files and the UI/docs state the owner-supplied-files rule.
