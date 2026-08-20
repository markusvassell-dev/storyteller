---
name: book-importer
description: Convert a PDF, ZIP/CBZ, image set, or audio files into a validated Storytime Library story package or bundled demo book. Use this whenever the user wants to add a book, import pages, convert a scanned picture book, create a story.json, or bundle a new demonstration story — even if they just say "add this book to the app".
---

# Book importer

Turn source files into a book the Storytime Library app can show, while keeping
the rights record honest. There are two distinct destinations — pick the right
one first:

1. **Private book (the normal case).** The owner's own books (e.g. their Robert
   Munsch collection) are imported **inside the running app**: Settings → Owner
   workshop → Add a book. They are processed on-device and stored in
   IndexedDB, never committed to this repo. Your job is usually to help the
   owner get their files into a form the wizard accepts, not to add files here.
2. **Bundled demo book (rare).** Only verified public-domain, openly licensed,
   or project-original content may be added under `public/stories/` — it ships
   publicly with the app.

## Adding public-domain classics (the automated path)

Most bundled books come from the catalog pipeline rather than by hand:

```bash
npm run books:probe                       # which titles exist / are illustrated
npm run books:fetch -- --dry-run          # what would be built
npm run books:fetch -- --only <slug>      # one book
npm run books:fetch                       # the whole catalog
npm run books:fetch -- --index-only       # just regenerate stories/index.json
```

Add a title by appending to `scripts/books/catalog.ts` (Project Gutenberg
title + ebook id, credits, categories, PD basis) and running the fetch.
Downloads are cached under `.cache/books/`, so reruns are cheap.

The pipeline strips Project Gutenberg boilerplate, gives full plates their own
page, tucks chapter ornaments above the text they decorate, paginates prose
into text pages, encodes WebP, generates a bookplate cover when the edition has
no artwork, and validates against the story schema before writing anything.

Books with period content that a grown-up should vet get `hiddenByDefault` and
a `contentAdvisory` in the catalog — never a fake rights status. The audit
fails the build if an advisory book is not hidden.

## Adding a bundled book by hand

1. Create `public/library/<slug>/` (or `public/stories/<slug>/` for a demo)
   with a cover, `pages/NN.*`, and optional `audio/NN.mp3`.
2. Write `story.json` conforming to `src/lib/schema.ts` (`storyBookSchema`).
   `public/stories/tortoise-and-hare/story.json` shows pages, alt text,
   per-page audio and a complete rights record.
3. Regenerate the index: `npm run books:fetch -- --index-only`. Never
   hand-edit `public/stories/index.json` — it is derived from the story files.
4. Page order is `number: 1..n` with no gaps. Picture pages need `image` +
   `alt`; text pages (`layout.kind: "text"`) need `text`.
5. Fill the `rights` block truthfully. Bundled content must have
   `remoteStorageAllowed: true` and `personalUseOnly: false` — if that isn't
   honestly true for this material, it must NOT be bundled (import it in-app
   instead). Never mark something public-domain without recording the basis.
6. Validate: `npm run audit:rights && npm run audit:assets && npm run audit:links`.
   The rights audit intentionally fails the build on violations — never work
   around it by weakening the rights record.

## Converting sources

- **PDF → page images**: the app renders PDFs client-side (pdf.js) in the
  wizard. For bundled books, render pages to WebP ≤1600px long edge.
- **Image sets**: name files so natural sort gives the right order
  (`01.webp, 02.webp…`). The importer sorts naturally and shows the order for
  review before saving.
- **Phone photographs**: don't pre-process them. Wizard step 3 has
  **Trim every page** (auto background removal), rotate-all, and a per-page
  straighten/crop editor; the logic lives in `src/lib/imageEditing.ts`
  (`autoTrimBounds` is pure and unit-tested — extend it there, not in the UI).
  Every edit re-renders from `DraftPage.originalBlob`, so edits never compound
  and Reset always restores the import.
- **One recording for a whole book**: don't ask the owner for timestamps.
  Wizard step 5 → **Listen & tap to set them** captures them by tapping along
  (`src/lib/audioCues.ts` + `AudioSync.tsx`). Marks are page *end* times;
  `cuesFromMarks` turns them into per-page `bookAudioCue` ranges and
  `validateCues` reports timings that can't work.
- **Audio**: MP3 or M4A. To regenerate the synthetic demo narration:
  `npx tsx scripts/generate-demo-narration.ts` (needs `espeak-ng` + `lame`;
  mark such audio `narration.synthetic: true` — the UI must disclose it).
- **Placeholder art**: regenerate with `npx tsx scripts/generate-demo-art.ts`
  (parametric original SVG; edit the scene definitions in that script).

## Story package (portable single book)

The app exports/imports `.zip` story packages: `story.json` at the root with
`pkg:<path>` asset refs pointing at ZIP entries (see
`src/lib/import/storyPackage.ts`). Use this format when the user wants to move
one book between devices without a full library backup.

## Never do

- Never bypass or weaken rights validation to make an import succeed.
- Never fetch book content from unauthorized sources; files come from the owner.
- Never commit owner-supplied private book files to the repository.
