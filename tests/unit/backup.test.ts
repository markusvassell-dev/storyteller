import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  BackupPasswordError,
  exportLibrary,
  importLibrary,
  isEncryptedBackup,
} from '@/lib/backup'
import { saveImportedBook } from '@/lib/bookAdmin'
import { validateStoryBook, type StoryBookInput } from '@/lib/schema'
import { recordPageTurn, toggleFavourite } from '@/lib/bookState'

function fixtureBook(id: string, slug: string) {
  const result = validateStoryBook({
    id,
    slug,
    title: `Book ${id}`,
    authors: ['Owner'],
    description: 'd',
    language: 'en',
    // static refs so the round trip needs no blob assets in fake-indexeddb
    cover: 'stories/t/cover.svg',
    pages: [{ number: 1, image: 'stories/t/01.svg', alt: 'page one' }],
    rights: { status: 'owner-permission', ownerPermissionConfirmed: true },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } satisfies StoryBookInput)
  if (!result.ok || !result.book) throw new Error('fixture invalid')
  return result.book
}

async function wipe() {
  await db.books.clear()
  await db.assets.clear()
  await db.bookState.clear()
  await db.builtinOverrides.clear()
  await db.kv.clear()
}

describe('library export / import round trip', () => {
  beforeEach(wipe)

  it('restores books, progress and favourites from a plain backup', async () => {
    await saveImportedBook(fixtureBook('bk1', 'book-one'))
    await recordPageTurn('bk1', 1, 1)
    await toggleFavourite('bk1', 1)

    const blob = await exportLibrary()
    expect(isEncryptedBackup(new Uint8Array(await blob.arrayBuffer()))).toBe(false)

    await wipe()
    expect(await db.books.count()).toBe(0)

    const summary = await importLibrary(blob)
    expect(summary.errors).toEqual([])
    expect(summary.imported).toBe(1)
    expect((await db.books.get('bk1'))?.slug).toBe('book-one')
    const state = await db.bookState.get('bk1')
    expect(state?.favourite).toBe(1)
    expect(state?.completed).toBe(1)
  })

  it('replaces an existing copy of the same book rather than duplicating', async () => {
    await saveImportedBook(fixtureBook('bk1', 'book-one'))
    const blob = await exportLibrary()
    const summary = await importLibrary(blob)
    expect(summary.replaced).toBe(1)
    expect(await db.books.count()).toBe(1)
  })

  it('encrypted backups need the right password', async () => {
    await saveImportedBook(fixtureBook('bk2', 'book-two'))
    const blob = await exportLibrary('correct horse battery')
    expect(isEncryptedBackup(new Uint8Array(await blob.arrayBuffer()))).toBe(true)

    await wipe()
    await expect(importLibrary(blob)).rejects.toBeInstanceOf(BackupPasswordError)
    await expect(importLibrary(blob, 'wrong password')).rejects.toBeInstanceOf(
      BackupPasswordError,
    )

    const summary = await importLibrary(blob, 'correct horse battery')
    expect(summary.imported).toBe(1)
    expect((await db.books.get('bk2'))?.slug).toBe('book-two')
  })

  it('rejects files that are not Storytime backups', async () => {
    const junk = new Blob([new Uint8Array([1, 2, 3, 4, 5])])
    await expect(importLibrary(junk)).rejects.toThrow()
  })
})
