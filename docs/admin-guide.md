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
   pages (likely duplicates are flagged).
4. **Page text** — required *picture description* (alt text) per page, plus
   optional printed text and read-aloud text. For scanned books, type the
   words from your copy; there is deliberately no OCR, so what ships is what
   you reviewed. "Hear it" previews the device voice.
5. **Narration** — per-page audio files, or one whole-book recording with
   per-page timestamps; who's narrating; whether the audio is
   computer-generated (this is disclosed to readers); auto page turns.
6. **Rights** — where the files came from and on what basis you may use them.
   Owner-supplied books require an explicit permission confirmation.
   "Not sure yet" saves the book into quarantine.
7. **Preview** — validation results plus a summary and page flick-through.
8. **Save** — validated books land in the library instantly; quarantined
   books wait in the workshop until their rights are settled.

Progress, error and recovery states appear inline; nothing is saved until the
final step succeeds.

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
