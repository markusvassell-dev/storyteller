# Owner workshop guide

The workshop is the private admin area: Settings → **Owner workshop** (or
`/admin`). The first visit asks you to choose a PIN (4+ digits). The PIN keeps
children out of the tools; it is a convenience lock, not high security — your
books are private because they never leave the device, not because of the PIN.
"Lock workshop" (top right) re-locks the session.

## Overview screen

Cards for every task, storage usage at a glance, and a warning banner when any
book is quarantined for rights review.

## Books

Each row offers:

- **↑ / ↓** — reorder books (this order drives the library shelves)
- **Preview** — open the book's reader page even while hidden
- **Edit** — reopens the wizard with the book loaded. Editing a *built-in*
  book creates your own local copy and tucks the original away automatically.
- **Duplicate** — full copy (assets included) for making variants
- **Hide / Unhide** — keep a book out of the child-facing library
- **Delete** — imported books only; removes the book and its files from the
  device permanently (built-ins can only be hidden). Export a backup first.

## Add a book — the 8-step wizard

1. **Files** — drop or choose a PDF, a ZIP/CBZ of page images, image files,
   or a story package. Everything is processed on-device. An optional cover
   image can be set here (otherwise page 1 is used).
2. **Details** — title, authors, illustrators, age range, reading level,
   estimated minutes, description, shelves (categories), tags. A book can be
   kept hidden while you polish it.
3. **Page order** — thumbnails in proposed order (natural filename sort for
   images). Drag to reorder or use the arrow buttons; remove blank/duplicate
   pages (likely duplicates are flagged). Photographed a book? The scan tools
   at the top of this step fix a whole shoot at once — see
   *Tidying up photographed pages* below.
4. **Page text** — required *picture description* (alt text) per page, plus
   optional printed text and read-aloud text. For scanned books, type the
   words from your copy; there is deliberately no OCR, so what ships is what
   you reviewed. "Hear it" previews the device voice.
5. **Narration** — per-page audio files, or one whole-book recording with
   per-page timestamps; who's narrating; whether the audio is
   computer-generated (this is disclosed to readers); auto page turns. For a
   whole-book recording you rarely need to type timestamps — see
   *Matching one recording to the pages* below.
6. **Rights** — where the files came from and on what basis you may use them.
   Owner-supplied books require an explicit permission confirmation.
   "Not sure yet" saves the book into quarantine.
7. **Preview** — validation results plus a summary and page flick-through.
8. **Save** — validated books land in the library instantly; quarantined
   books wait in the workshop until their rights are settled.

Progress, error and recovery states appear inline; nothing is saved until the
final step succeeds.

## Tidying up photographed pages

Pages shot with a phone arrive tilted and surrounded by desk. Step 3 of the
wizard can clean them up.

- **✂️ Trim every page** measures each photo, finds the page inside it, and
  crops the background away. Pages that already fill the frame are left alone,
  and a trim that would throw away most of the picture is refused rather than
  guessed at — the result tells you how many pages it changed.
- **↺ / ↻ Rotate all** turns the whole set a quarter-turn, for a book you
  photographed sideways.
- The **✂️** button on a page card opens that page on its own: rotate by
  quarter-turns, correct a small tilt with the *Fine tilt* slider, run
  **Trim background** for just this page, or drag the four edge sliders by
  hand. **Reset to original** undoes everything.

Edited pages get a **✂️ tidied** badge. Every edit is re-rendered from the
photo you imported, never from the previous edit, so nothing degrades as you
adjust it and Reset always gets the original back. Your source files on disk
are never modified.

## Matching one recording to the pages

When a book has a single recording — an author's own free audio, or a
grandparent reading the whole book in one take — the reader still needs to
know where each page begins. Step 5 gives you three ways to say so:

- **🎧 Listen & tap to set them** opens the read-along dialog. Press play,
  follow along with the book, and tap **Turn the page** the moment each page
  finishes; the tap *is* the timestamp. The current page's picture and text
  are shown so you can keep your place. Use **↩ Undo last** for a late tap,
  **Start over** to begin again, and the **−½s / +½s** buttons to nudge any
  mark afterwards. The last page runs to the end of the recording.
- **÷ Space evenly** spreads the pages equally across the recording — a rough
  starting point worth refining.
- The table below accepts typed seconds, if you already have exact times.

Timings that can't work — a page starting before the one before it, an end
before its start, a start past the end of the recording — are listed above the
table so you can fix them before saving.

## Categories

Built-in shelves are always available; add your own (name + emoji) here.
Custom categories appear in the wizard's Details step and as home shelves.

## Backup & restore

See docs/backup-and-restore.md. Also exports here include favourites,
progress, settings, and your custom categories.

## Library check

Runs the integrity scan: schema validation of every book, missing local
files, unreachable bundled assets, orphaned storage, and rights warnings.
Run it after restoring a backup or if a book misbehaves.

## Storage

Settings → Storage shows approximate usage, lets you request protected
storage, and removes individual imported books.
