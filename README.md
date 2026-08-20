# 🌙 Storytime Library

A cozy, **private, single-owner** digital library of children's picture books,
built as an installable Progressive Web App for iPhone and iPad.

- **Read** illustrated books page by page, portrait or landscape, with a
  two-page spread on tablets.
- **Listen** with prerecorded narration or the device's read-aloud voice.
- **Import your own books** (PDF, page images, ZIP/CBZ, audio) through a
  private owner workshop — they are stored **only on your device**, never
  uploaded.
- **Works offline** once installed, including all built-in demo stories.

This is an installable website (a PWA), not an App Store app. There are no
accounts, no ads, no tracking, and no cloud storage of your books.

## Quick start

```bash
npm install
npm run dev          # develop at http://localhost:5173
npm run build        # production build into dist/ (runs the rights audit first)
npm run preview      # serve the production build locally
```

Requires Node 20+.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Rights audit → typecheck → production build (PWA) |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Unit/integration tests (Vitest) |
| `npm run test:e2e` | Browser tests at 5 iPhone/iPad/desktop viewports (Playwright) |
| `npm run check` | Typecheck + lint + unit tests + rights & asset audits |
| `npm run audit:rights` | Rights/licence audit of bundled content (fails builds on violations) |
| `npm run audit:assets` | Image/audio format, size, duplicate and alt-text checks |
| `npm run audit:links` | Story asset refs, docs links, built-output PWA essentials |
| `npm run narration:map` | Narration/audio mapping validation |
| `npm run books:fetch` | Fetch the public-domain classics into `public/library/` |
| `npm run books:probe` | Check which catalog titles are available and illustrated |

## The library

**42 books ship with the app, about 19,000 pages.**

- **36 public-domain classics** with their original illustrations wherever the
  source edition has them — Walter Crane's *Household Stories by the Brothers
  Grimm*, Tenniel's *Alice*, Beatrix Potter's *Peter Rabbit*, Edward Lear's
  *Book of Nonsense*, Kate Greenaway's *A Apple Pie*, Jessie Willcox Smith's
  *A Child's Garden of Verses*, *The Jungle Book*, *Treasure Island*, the Lang
  fairy books, Andersen, *The Secret Garden*, *Anne of Green Gables*, both Oz
  books and more. 1,109 original illustrations in total.
- **6 original demonstration stories** — retellings of traditional tales with
  project-made artwork; one includes prerecorded (synthetic, disclosed)
  narration.

Full works, unabridged. Complete provenance for every book — including two
(*Tom Sawyer*, *Peter Pan*) that carry a content advisory for period racial
content and show a "note for grown-ups" on their page:
[docs/content-sources.md](docs/content-sources.md).

Refresh or extend the classics with:

```bash
npm run books:probe    # check which titles are available and illustrated
npm run books:fetch    # fetch, normalise and validate the catalog
```

The catalog lives in `scripts/books/catalog.ts`.

## Adding your own books

Open **Settings → Owner workshop** (protected by a local PIN you choose), then
**Add a book**. The 8-step wizard accepts:

- a **PDF** — each page is rendered to an image on your device (pdf.js)
- **JPG/PNG/WebP images** — ordered by natural filename sort, reviewable
- a **ZIP or CBZ** of page images
- **MP3/M4A/AAC/OGG audio** — one file per page, or one recording for the
  whole book with per-page timestamps
- a **story package** (`.zip` with `story.json`) exported by this app

You'll be asked to describe each page (alt text), optionally type the page
text for read-aloud, and record where the files came from and that you have
the rights to use them. Imported books are stored in the browser's IndexedDB
**on that device only**. See [docs/admin-guide.md](docs/admin-guide.md) and
[docs/adding-a-story.md](docs/adding-a-story.md).

**Content rules:** import only books you own or have permission to use (for
example, your own Robert Munsch collection scanned from your own copies). The
app never fetches book content from the internet, and the build fails if
private or under-documented material is ever bundled. See
[docs/licensing.md](docs/licensing.md).

## Narration

- **Prerecorded**: attach audio in the wizard; playback offers play/pause,
  replay page, speed, volume, mute, captions and optional auto page turns.
- **Device voice**: uses the Web Speech API where supported (iPhone/iPad
  supported), with voice and speed choice. It is always labelled as generated
  by the device, and never autoplays — narration starts from a tap.

## Offline behaviour

The app shell and the six demo stories are precached, so a freshly installed
app works with no network at all. The 36 classics (about 56 MB) are cached as
they are read, which keeps installation small — and any book can be pinned
deliberately with **Save for offline** on its page.

## Local storage, backup & restore

Everything personal lives on-device: imported books, favourites, reading
progress, settings. **Browser or device data deletion can remove locally
stored books** — export a backup (Owner workshop → Backup & restore) after
adding books. Backups are single files (optionally AES-encrypted with a
password) and restoring one on another device is how you move your library
between iPhone and iPad — libraries do not sync automatically. See
[docs/backup-and-restore.md](docs/backup-and-restore.md).

## Installing on iPhone / iPad

Open the deployed site in **Safari** → Share → **Add to Home Screen** → Add.
The app gets its own icon, launches full screen, and works offline. In-app
guide: Settings → *Install on iPhone or iPad*. Details:
[docs/deployment.md](docs/deployment.md).

## Deployment

Free static hosting; **Cloudflare Pages** is recommended (unlimited free
bandwidth, HTTPS, custom domains), with a ready-made **GitHub Pages** workflow
as a no-signup fallback. The host serves only the app shell and the
public-domain demo content — never your private books. Steps:
[docs/deployment.md](docs/deployment.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/product-spec.md](docs/product-spec.md) | What the product is and does |
| [docs/architecture.md](docs/architecture.md) | Stack, data model, trade-offs |
| [docs/research.md](docs/research.md) | Research: prior art, hosting, iOS PWA status |
| [docs/content-sources.md](docs/content-sources.md) | Provenance of every bundled story |
| [docs/licensing.md](docs/licensing.md) | Rights workflow and rules |
| [docs/privacy-notes.md](docs/privacy-notes.md) | Privacy design decisions |
| [docs/accessibility.md](docs/accessibility.md) | Accessibility approach and status |
| [docs/deployment.md](docs/deployment.md) | Hosting, updates, custom domains, installation |
| [docs/adding-a-story.md](docs/adding-a-story.md) | Adding books (owner + developer paths) |
| [docs/admin-guide.md](docs/admin-guide.md) | Owner workshop manual |
| [docs/backup-and-restore.md](docs/backup-and-restore.md) | Backups and device transfer |
| [docs/testing.md](docs/testing.md) | Test suite and how to run it |

## Known limitations

- No automatic sync between devices (by design — use backups).
- The owner PIN is a convenience lock, not security; nothing private is
  remotely hosted either way.
- Device text-to-speech quality/voices depend on the device; speech starts
  only from a tap (an iOS requirement).
- OCR is not included: page text for scanned books is typed by the owner.
- Very large PDFs import page-by-page on-device; expect a wait on old phones.
- Some classics are text-only: the mirror used to fetch them is a 2015
  snapshot without those editions' plates. They gain their original artwork if
  `www.gutenberg.org` is reachable — the adapter is written and dormant (see
  [docs/research.md](docs/research.md)).
- Alt text for historical illustrations comes from the source edition and is
  generic where the edition supplied none.
- Browser storage can be evicted by the OS in extreme low-space situations —
  keep backups.
