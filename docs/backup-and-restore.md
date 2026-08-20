# Backup & restore

Your imported books live only on the device that imported them. A backup file
is the safety net **and** the way to move the library between devices.

## Why backups matter

- Clearing Safari/browser website data deletes locally stored books.
- Deleting the Home Screen app can delete its storage.
- Devices break, get lost, or get replaced.
- Libraries do **not** sync between iPhone and iPad automatically.

The app requests protected ("persistent") storage and installing to the Home
Screen makes eviction much less likely — but only an exported backup is truly
safe.

## Exporting

Owner workshop → **Backup & restore** → *Export the library*.

- The file contains every imported book (pages, covers, audio, metadata),
  plus favourites, reading progress, settings, custom categories, and your
  hide/reorder choices for built-in books.
- Built-in demo books are not duplicated into the file — they ship with the
  app itself.
- **Optional password**: with a password the file is AES-256-GCM encrypted
  (key derived with PBKDF2, 250k iterations) and saved as `.stbke`; without
  one it is a plain `.zip`. There is **no password recovery** — write it down.
- On iPhone/iPad the exported file lands in Files (choose iCloud Drive to get
  it onto your other devices automatically).

Export again after adding or editing books — a backup is a snapshot.

## Restoring / transferring

On the target device (fresh install or existing library):

1. Open the app → Settings → Owner workshop → Backup & restore.
2. If the backup is encrypted, type its password.
3. Choose the backup file.

Restore is additive: books from the backup are added; a book with the same
identity replaces the local copy; nothing else is deleted. Progress,
favourites and settings from the backup are applied. Run **Library check**
afterwards if anything looks off.

## Single-book packages

The story-package format (docs/adding-a-story.md) moves one book at a time;
the full backup moves everything. Packages are handy for sharing a single
original story between your own devices without touching the rest.

## Storage hygiene

Settings → Storage shows approximate usage per imported book and lets you
remove books you've already backed up. The app warns when storage is nearly
full.
