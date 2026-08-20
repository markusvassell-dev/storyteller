# Adding a story

There are two paths, for two kinds of content.

## Path 1 — Owner imports a private book (in the app)

For books you own (e.g. your Robert Munsch collection, scanned from your own
copies). Nothing leaves the device.

1. Get the files onto the device you'll read on (AirDrop, Files/iCloud
   Drive, or a cable). Best formats: one PDF, or page images named in order
   (`01.jpg`, `02.jpg`…), plus optional MP3/M4A audio.
2. In the app: Settings → **Owner workshop** → **Add a book**.
3. Follow the wizard (full walkthrough in docs/admin-guide.md):
   choose files → enter details → confirm page order → write picture
   descriptions and page text → attach narration → record rights → preview →
   save.
4. Export a backup afterwards (Owner workshop → Backup & restore).

Tips for scans: aim for one image per book page, roughly 3:4, at least
~1200 px on the long edge — the importer optimises them automatically and
never touches your original files.

Photographing rather than scanning is fine. Lay the book flat in even light,
shoot every page from roughly the same distance, and don't worry about the
desk showing around the edges or a slight tilt: the wizard's **Trim every
page** and per-page straighten tools clean the whole set up in step 3
(docs/admin-guide.md → *Tidying up photographed pages*).

If the author or publisher offers a free recording of the book, you can attach
it as one whole-book file and tap along with it once to mark where each page
turns — no timestamps to type (docs/admin-guide.md → *Matching one recording
to the pages*). Recordings are subject to the same rights record as the pages:
say where the audio came from in step 6.

## Path 2 — Developer adds a bundled demo book (in the repo)

Only for verified public-domain, openly licensed, or project-original
content, because bundled books ship on the public host.

1. Create `public/stories/<slug>/` with `cover.svg` (or `.webp`), `pages/`
   images, optional `audio/`.
2. Write `story.json` against `storyBookSchema` (`src/lib/schema.ts`) — copy
   `public/stories/tortoise-and-hare/story.json` as a template; it exercises
   pages, alt text, per-page audio and a complete rights record.
3. List it in `public/stories/index.json`.
4. Validate: `npm run audit:rights && npm run audit:assets && npm run audit:links`.
5. Record provenance in docs/content-sources.md.

The `book-importer` project skill automates guidance for both paths.

## Story package format (portable single book)

A `.zip` containing `story.json` at the root plus its assets, with asset refs
written as `pkg:<zip-path>`. The app exports and imports this format; it is
also easy to generate by hand or script for batch conversions. On import the
package is re-validated and its assets become local (`idb:`) blobs.

## Requirements every book must meet

- Pages numbered 1..n with no gaps; every page has alt text.
- `language: "en"` (initial version is English-only).
- A truthful rights record (see docs/licensing.md) — unclear rights save into
  quarantine rather than the library.
