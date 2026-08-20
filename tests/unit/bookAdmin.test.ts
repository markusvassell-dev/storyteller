import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { BookValidationError, saveImportedBook, uniqueSlug } from '@/lib/bookAdmin'
import { validateStoryBook, type StoryBook, type StoryBookInput } from '@/lib/schema'

function makeBook(overrides: Partial<StoryBookInput> = {}): StoryBook {
  const result = validateStoryBook({
    id: 'imp-1',
    slug: 'imported-book',
    title: 'Imported Book',
    authors: ['Owner'],
    description: 'desc',
    language: 'en',
    cover: 'stories/t/cover.svg',
    pages: [{ number: 1, image: 'stories/t/01.svg', alt: 'page one' }],
    rights: { status: 'owner-permission', ownerPermissionConfirmed: true },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } satisfies StoryBookInput)
  if (!result.ok || !result.book) throw new Error('fixture invalid')
  return result.book
}

describe('admin book persistence', () => {
  beforeEach(async () => {
    await db.books.clear()
    await db.bookState.clear()
  })

  it('saves a valid imported book', async () => {
    const row = await saveImportedBook(makeBook())
    expect(row.quarantined).toBe(0)
    expect((await db.books.get('imp-1'))?.title).toBe('Imported Book')
  })

  it('quarantines needs-review books instead of publishing them', async () => {
    const row = await saveImportedBook(makeBook({ rights: { status: 'needs-review' } }))
    expect(row.quarantined).toBe(1)
  })

  it('throws a structured error for invalid books', async () => {
    const bad = { ...makeBook(), pages: [] } as StoryBook
    await expect(saveImportedBook(bad)).rejects.toBeInstanceOf(BookValidationError)
    expect(await db.books.get('imp-1')).toBeUndefined()
  })

  it('assigns increasing sort order to new books', async () => {
    const a = await saveImportedBook(makeBook({ id: 'a', slug: 'a' }))
    const b = await saveImportedBook(makeBook({ id: 'b', slug: 'b' }))
    expect(b.sortOrder).toBeGreaterThan(a.sortOrder)
  })

  it('uniqueSlug avoids collisions', async () => {
    await saveImportedBook(makeBook({ id: 'x', slug: 'my-book', title: 'My Book' }))
    expect(await uniqueSlug('My Book')).toBe('my-book-2')
    expect(await uniqueSlug('Other Book')).toBe('other-book')
  })
})
