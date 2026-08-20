import { describe, expect, it } from 'vitest'
import { buildSearchIndex, searchBooks } from '@/lib/search'
import { validateStoryBook, type StoryBookInput } from '@/lib/schema'
import type { LibraryBook } from '@/lib/library'

function entry(title: string, extras: Partial<StoryBookInput> = {}): LibraryBook {
  const result = validateStoryBook({
    id: `id-${title}`,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title,
    authors: ['Traditional'],
    description: `${title} description`,
    language: 'en',
    cover: 'stories/t/cover.svg',
    pages: [{ number: 1, image: 'stories/t/01.svg', alt: 'page' }],
    rights: { status: 'original' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extras,
  } satisfies StoryBookInput)
  if (!result.ok || !result.book) throw new Error('fixture invalid')
  return {
    book: result.book,
    origin: 'builtin',
    hidden: false,
    quarantined: false,
    sortOrder: 0,
  }
}

const books = [
  entry('The Tortoise and the Hare', { tags: ['aesop', 'race'] }),
  entry('Goldilocks and the Three Bears'),
  entry('The Gingerbread Man', { categories: ['funny'] }),
]

describe('library search', () => {
  it('finds exact title words', () => {
    const index = buildSearchIndex(books)
    const results = searchBooks(index, books, 'gingerbread')
    expect(results.map((r) => r.book.title)).toEqual(['The Gingerbread Man'])
  })

  it('tolerates typos (fuzzy matching)', () => {
    const index = buildSearchIndex(books)
    expect(
      searchBooks(index, books, 'tortois').map((r) => r.book.title),
    ).toContain('The Tortoise and the Hare')
    expect(
      searchBooks(index, books, 'goldiloks').map((r) => r.book.title),
    ).toContain('Goldilocks and the Three Bears')
  })

  it('matches prefixes while typing', () => {
    const index = buildSearchIndex(books)
    expect(searchBooks(index, books, 'ging').map((r) => r.book.title)).toContain(
      'The Gingerbread Man',
    )
  })

  it('searches tags and categories', () => {
    const index = buildSearchIndex(books)
    expect(searchBooks(index, books, 'aesop').map((r) => r.book.title)).toContain(
      'The Tortoise and the Hare',
    )
  })

  it('returns everything for an empty query', () => {
    const index = buildSearchIndex(books)
    expect(searchBooks(index, books, '  ')).toHaveLength(3)
  })

  it('returns nothing for nonsense', () => {
    const index = buildSearchIndex(books)
    expect(searchBooks(index, books, 'zzzqqqxxx')).toHaveLength(0)
  })
})
