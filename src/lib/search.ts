import MiniSearch from 'minisearch'
import type { LibraryBook } from './library'

/** Typo-tolerant client-side search over the visible library. */

interface SearchDoc {
  id: string
  title: string
  subtitle: string
  authors: string
  description: string
  categories: string
  tags: string
}

export function buildSearchIndex(books: LibraryBook[]): MiniSearch<SearchDoc> {
  const mini = new MiniSearch<SearchDoc>({
    fields: ['title', 'subtitle', 'authors', 'description', 'categories', 'tags'],
    storeFields: ['id'],
    searchOptions: {
      boost: { title: 3, authors: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  })
  mini.addAll(
    books.map(({ book }) => ({
      id: book.id,
      title: book.title,
      subtitle: book.subtitle ?? '',
      authors: book.authors.join(' '),
      description: book.description,
      categories: book.categories.join(' '),
      tags: book.tags.join(' '),
    })),
  )
  return mini
}

export function searchBooks(
  index: MiniSearch<SearchDoc>,
  books: LibraryBook[],
  query: string,
): LibraryBook[] {
  const q = query.trim()
  if (!q) return books
  const results = index.search(q)
  const byId = new Map(books.map((b) => [b.book.id, b]))
  return results
    .map((r) => byId.get(String(r.id)))
    .filter((b): b is LibraryBook => Boolean(b))
}
