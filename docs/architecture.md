# Architecture

## Stack

- **Vite 8 + React 19 + TypeScript (strict)** — static-first SPA, no backend.
- **CSS Modules + design tokens** (`src/styles/tokens.css`) — no CSS framework;
  tokens cover typography, spacing, radius, shadows, motion, safe areas,
  touch-target sizes, and both light ("storybook paper") and dark ("bedtime")
  themes.
- **Zod** — one schema (`src/lib/schema.ts`) is the source of truth for the
  story-package format; the importer, built-in loader, backups, and build-time
  audits all validate against it.
- **Dexie (IndexedDB)** — all private data. **zustand** for light UI state,
  with settings persisted to localStorage (so theme/text size apply instantly
  on boot).
- **vite-plugin-pwa (Workbox)** — precached app shell + demo content, runtime
  caching for audio (range-request aware) and the pdf.js worker, and a
  `prompt`-style update flow (the in-app "new version" banner).
- **pdfjs-dist** (lazy-loaded, admin-only chunk), **fflate** (ZIP/CBZ +
  backups), **MiniSearch** (typo-tolerant search).

## Three content tiers

| | Demo stories | Public-domain classics | Imported private books |
| --- | --- | --- | --- |
| Where | `public/stories/` | `public/library/` | IndexedDB on the device |
| Rights | Original to this project | Public domain, audited at build time | Owner-supplied, never leaves the device |
| Offline | Precached at install | Cached on first read; "Save for offline" pins a book | Inherently offline (local blobs) |
| Asset refs | `stories/<slug>/…` | `library/<slug>/…` | `idb:<uuid>` |

Splitting the demos from the classics is what keeps installation small: the
demo collection is a couple of megabytes and precaches, so a freshly installed
app is readable with no network, while the ~56 MB of classics arrive as they
are opened.

## The library index

Shelves, search and filters run on **summaries**, not whole books. A book's
pages are fetched only when it is opened (`useFullBook`), because the library
now holds ~19,000 pages and several books are megabytes of text on their own —
loading everything at start-up would make the app unusable.

- `public/stories/index.json` (`version: 2`) holds one `BookSummary` per book:
  identity, cover, categories, `pageCount`, `hasRecordedNarration`, rights
  status and the `path` to the full story.
- `scripts/books/emit.ts#buildIndex` regenerates it from whatever `story.json`
  files exist on disk, so index and content cannot drift apart. The rights
  audit additionally cross-checks id, slug, page count and rights status.

## Page kinds

`layout.kind` distinguishes the two ways a page reads:

- **`picture`** — artwork leads and fills the screen, as a plate filled a page
  in the printed book. `image` is required.
- **`text`** — prose fills the page, optionally under a chapter header
  ornament. `text` is required, `image` optional.

Chapter headers and tailpieces are classified at import time
(`scripts/books/images.ts#classifyImage`) and attached above the text they
decorate instead of taking a page of their own, which is where they sat in the
original books.

`src/lib/library.ts` merges the tiers into one library. An imported book with
the same id as a built-in **shadows** it — that's how "editing" a built-in
works (copy-on-write); hide/reorder of built-ins is stored as small override
rows instead of copying assets.

## Data model (IndexedDB, `src/lib/db.ts`)

- `books` — one row per imported book; the full validated `StoryBook` JSON is
  embedded, plus list metadata (hidden, sortOrder, quarantined).
- `assets` — binary blobs (page images, covers, thumbnails, audio) keyed by
  uuid; referenced from books as `idb:<uuid>`; owned by a `bookId` for
  cleanup and storage accounting.
- `bookState` — per-book user state: current page, completion, favourite,
  last-opened. One row per book, for built-ins and imports alike.
- `builtinOverrides` — hide/reorder for built-in books.
- `kv` — custom categories and small flags.

Settings (theme, text size, narration preferences, reader layout) live in
localStorage via zustand-persist; the owner PIN hash (PBKDF2) also lives in
localStorage. Both are included in backups.

## Key flows

- **Reading**: `Reader.tsx` computes *spreads* (cover alone, then page pairs)
  when the viewport is ≥900 px and the layout setting allows; narration is a
  queue over the visible pages (`useNarration.ts`) so one tap reads a whole
  spread. Progress is written on every turn; object URLs for far-away imported
  pages are released; only the next spread is preloaded.
- **Import**: everything happens in the browser. PDFs render page-by-page to
  WebP/JPEG canvases; ZIP/CBZ entries are naturally sorted and de-duplicated
  by content hash; images are normalised to ≤1600 px WebP. The 8-step wizard
  builds a `StoryBook`, validates it, then persists blobs + row atomically
  enough to clean up stale assets after edits.
- **Backup**: a ZIP with `manifest.json`, per-book `story.json` (asset refs
  rewritten to `pkg:` paths) and the binary assets; optionally the whole file
  is AES-GCM encrypted with a PBKDF2-derived key. Restore rewrites `pkg:`
  refs back to fresh `idb:` blobs. Built-in static refs pass through untouched
  (the assets ship with the app on every device).
- **Rights**: every book carries a `rights` record. `needs-review` books are
  saved but *quarantined* (never shown in the child-facing library).
  `scripts/rights-audit.ts` runs at the start of every production build and
  fails it if bundled content is private, personal-use-only, unreviewed, or
  missing provenance.

## Service worker & updates

Workbox `generateSW` precaches the shell, fonts (Latin subsets only), icons,
and all demo-story JSON + SVG art. Narration audio and the pdf.js worker are
runtime-cached (CacheFirst; audio with range-request support for Safari).
Updates use `registerType: 'prompt'`: the new worker waits until the user taps
"Reload" in the update banner, so a mid-story cache swap can't happen.

## Trade-offs

- **No cloud sync** — keeps the app free, private, and simple; transfer is via
  backup files. Revisit only if the owner asks (would require real server-side
  auth per the privacy rules).
- **Embedded book JSON** (vs normalised page tables) — books are small
  (metadata + refs); blobs are the big part and live separately. Simpler
  migrations, atomic saves.
- **SPA, not SSG** — content is local/dynamic per device; nothing to
  pre-render. The shell stays under ~150 KB gzipped JS with pdf.js and the
  admin area split out of the main bundle.
- **PIN, not WebAuthn** — a convenience gate matches the threat model (a child
  tapping around). Nothing private is remotely hosted, so there is no remote
  asset to protect. WebAuthn could be added later without schema changes.

## Measured performance (production build, throttled mobile emulation)

4× CPU slowdown, 4 Mbps / 60 ms RTT, iPhone-size viewport, cold load:
FCP ≈ 1.3 s · LCP ≈ 2.1 s · CLS 0 · ~370 KB transferred (21 requests).
Reader page turns render only the visible spread and preload one spread ahead.
