import { db, type BookRow } from './db'
import { deleteBookAssets, getAssetBlob, isIdbRef, saveAsset } from './assets'
import { validateStoryBook, type StoryBook } from './schema'
import type { LibraryBook } from './library'
import { nowIso, slugify, uid } from './util'

/** Admin operations on the library. All local, all reversible via backup. */

export class BookValidationError extends Error {
  issues: { path: string; message: string }[]
  constructor(issues: { path: string; message: string }[]) {
    super(`Book failed validation: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
    this.issues = issues
  }
}

async function nextSortOrder(): Promise<number> {
  const rows = await db.books.toArray()
  return rows.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
}

export async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const want = slugify(base) || 'book'
  const rows = await db.books.toArray()
  const taken = new Set(rows.filter((r) => r.id !== ignoreId).map((r) => r.slug))
  if (!taken.has(want)) return want
  for (let i = 2; ; i++) {
    const candidate = `${want}-${i}`
    if (!taken.has(candidate)) return candidate
  }
}

/** Validates and stores a book. Quarantines instead of failing when rights are `needs-review`. */
export async function saveImportedBook(book: StoryBook): Promise<BookRow> {
  const result = validateStoryBook(book)
  if (!result.ok || !result.book) {
    throw new BookValidationError(result.issues.filter((i) => i.severity === 'error'))
  }
  const validated = result.book
  const existing = await db.books.get(validated.id)
  const row: BookRow = {
    id: validated.id,
    slug: validated.slug,
    title: validated.title,
    hidden: validated.hidden ? 1 : 0,
    sortOrder: existing?.sortOrder ?? (await nextSortOrder()),
    quarantined: validated.rights.status === 'needs-review' ? 1 : 0,
    book: { ...validated, storageLocation: 'local' },
    createdAt: existing?.createdAt ?? validated.createdAt,
    updatedAt: nowIso(),
  }
  await db.books.put(row)
  return row
}

export async function deleteImportedBook(id: string): Promise<void> {
  await deleteBookAssets(id)
  await db.books.delete(id)
  await db.bookState.delete(id)
}

/**
 * Duplicate a book into a new imported book (assets copied). Takes the full
 * book because the library's shelves only hold summaries.
 */
export async function duplicateBook(src: StoryBook): Promise<BookRow> {
  const newId = uid()
  async function copyRef<T extends string | undefined>(
    ref: T,
    kind: 'image' | 'thumbnail' | 'cover' | 'audio',
  ): Promise<T> {
    if (!ref) return ref
    if (!isIdbRef(ref)) return ref // static assets can be shared
    const blob = await getAssetBlob(ref)
    if (!blob) throw new Error(`Missing asset while duplicating: ${ref}`)
    return (await saveAsset({ bookId: newId, kind, blob })) as T
  }

  const pages = []
  for (const page of src.pages) {
    pages.push({
      ...page,
      image: await copyRef(page.image, 'image'),
      audio: await copyRef(page.audio, 'audio'),
    })
  }
  const copy: StoryBook = {
    ...src,
    id: newId,
    slug: await uniqueSlug(`${src.slug}-copy`),
    title: `${src.title} (copy)`,
    cover: await copyRef(src.cover, 'cover'),
    thumbnail: await copyRef(src.thumbnail, 'thumbnail'),
    pages,
    narration: src.narration
      ? { ...src.narration, bookAudio: await copyRef(src.narration.bookAudio, 'audio') }
      : undefined,
    storageLocation: 'local',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  return await saveImportedBook(copy)
}

/** Hide/unhide any book (built-ins get an override row, imports flip the row). */
export async function setBookHidden(entry: LibraryBook, hidden: boolean): Promise<void> {
  if (entry.origin === 'imported') {
    const row = await db.books.get(entry.book.id)
    if (row) {
      await db.books.put({
        ...row,
        hidden: hidden ? 1 : 0,
        book: { ...row.book, hidden },
        updatedAt: nowIso(),
      })
    }
  } else {
    const existing = await db.builtinOverrides.get(entry.book.id)
    await db.builtinOverrides.put({
      bookId: entry.book.id,
      hidden: hidden ? 1 : 0,
      sortOrder: existing?.sortOrder,
    })
  }
}

/** Persist a full manual ordering across built-in and imported books. */
export async function reorderBooks(entries: LibraryBook[]): Promise<void> {
  await db.transaction('rw', db.books, db.builtinOverrides, async () => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!
      if (entry.origin === 'imported') {
        const row = await db.books.get(entry.book.id)
        if (row && row.sortOrder !== i) await db.books.put({ ...row, sortOrder: i })
      } else {
        const existing = await db.builtinOverrides.get(entry.book.id)
        await db.builtinOverrides.put({
          bookId: entry.book.id,
          hidden: existing?.hidden,
          sortOrder: i,
        })
      }
    }
  })
}
