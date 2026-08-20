import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BookRow, type BookStateRow, type BuiltinOverrideRow } from './db'
import {
  builtinIndexSchema,
  summarize,
  validateStoryBook,
  type BookSummary,
  type StoryBook,
} from './schema'
import { staticUrl } from './assets'

/**
 * The library merges two tiers:
 *  - built-in books: static files shipped with the app
 *  - imported private books: rows in IndexedDB (on-device only)
 *
 * Shelves, search and filters work on lightweight summaries so opening the
 * app costs a single small request no matter how large the collection is.
 * A book's pages are fetched only when it is actually opened (`useFullBook`).
 */

export interface LibraryBook {
  book: BookSummary
  origin: 'builtin' | 'imported'
  hidden: boolean
  quarantined: boolean
  sortOrder: number
  state?: BookStateRow
}

interface BuiltinStore {
  books: BookSummary[]
  loaded: boolean
  error?: string
  /** Books that failed validation — surfaced in the admin integrity check. */
  invalid: { path: string; issues: string[] }[]
  load: () => Promise<void>
}

export const useBuiltinStore = create<BuiltinStore>((set, get) => ({
  books: [],
  loaded: false,
  invalid: [],
  load: async () => {
    if (get().loaded) return
    try {
      const res = await fetch(staticUrl('stories/index.json'))
      if (!res.ok) throw new Error(`index.json → HTTP ${res.status}`)
      const parsed = builtinIndexSchema.safeParse(await res.json())
      if (!parsed.success) {
        set({
          error: 'Library index is invalid',
          invalid: parsed.error.issues.map((i) => ({
            path: `index.json:${i.path.join('.')}`,
            issues: [i.message],
          })),
          loaded: true,
        })
        return
      }
      const books = [...parsed.data.books].sort((a, b) => a.title.localeCompare(b.title))
      set({ books, loaded: true })
    } catch (err) {
      set({ error: String(err), loaded: true })
    }
  },
}))

function combine(
  builtins: BookSummary[],
  rows: BookRow[] | undefined,
  overrides: BuiltinOverrideRow[] | undefined,
  states: BookStateRow[] | undefined,
): LibraryBook[] {
  const overrideMap = new Map((overrides ?? []).map((o) => [o.bookId, o]))
  const stateMap = new Map((states ?? []).map((s) => [s.bookId, s]))
  const importedIds = new Set((rows ?? []).map((r) => r.id))

  const fromBuiltin: LibraryBook[] = builtins
    // An imported copy supersedes the built-in original (edit-on-copy).
    .filter((b) => !importedIds.has(b.id))
    .map((book, i) => {
      const o = overrideMap.get(book.id)
      return {
        book,
        origin: 'builtin' as const,
        hidden: (o?.hidden ?? (book.hidden ? 1 : 0)) === 1,
        quarantined: book.rightsStatus === 'needs-review',
        sortOrder: o?.sortOrder ?? i,
        state: stateMap.get(book.id),
      }
    })

  const fromImported: LibraryBook[] = (rows ?? []).map((row) => ({
    // Imported books hold the whole book locally; summarise for list views.
    book: summarize(row.book, `idb:${row.id}`),
    origin: 'imported' as const,
    hidden: row.hidden === 1,
    quarantined: row.quarantined === 1,
    sortOrder: row.sortOrder,
    state: stateMap.get(row.id),
  }))

  return [...fromBuiltin, ...fromImported].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.book.title.localeCompare(b.book.title),
  )
}

/** All books, including hidden/quarantined (admin uses this). */
export function useAllLibraryBooks(): { books: LibraryBook[]; loading: boolean } {
  const builtins = useBuiltinStore((s) => s.books)
  const builtinsLoaded = useBuiltinStore((s) => s.loaded)
  const rows = useLiveQuery(() => db.books.toArray(), [])
  const overrides = useLiveQuery(() => db.builtinOverrides.toArray(), [])
  const states = useLiveQuery(() => db.bookState.toArray(), [])
  const books = useMemo(
    () => combine(builtins, rows, overrides, states),
    [builtins, rows, overrides, states],
  )
  // Loading must cover the per-book state too — the reader's resume logic
  // initialises once loading turns false and needs saved progress present.
  const loading =
    !builtinsLoaded || rows === undefined || overrides === undefined || states === undefined
  return { books, loading }
}

/** Reader-facing library: visible, non-quarantined books only. */
export function useVisibleLibraryBooks(): { books: LibraryBook[]; loading: boolean } {
  const { books, loading } = useAllLibraryBooks()
  const visible = useMemo(() => books.filter((b) => !b.hidden && !b.quarantined), [books])
  return { books: visible, loading }
}

export function useLibraryBook(slug: string | undefined): {
  entry?: LibraryBook
  loading: boolean
} {
  const { books, loading } = useAllLibraryBooks()
  const entry = useMemo(() => books.find((b) => b.book.slug === slug), [books, slug])
  return { entry, loading }
}

/* ------------------------------------------------------------------ */
/* Full books (pages) — fetched on demand                              */
/* ------------------------------------------------------------------ */

const fullBookCache = new Map<string, Promise<StoryBook | undefined>>()

async function loadFullBook(entry: LibraryBook): Promise<StoryBook | undefined> {
  if (entry.origin === 'imported') {
    const row = await db.books.get(entry.book.id)
    return row?.book
  }
  const res = await fetch(staticUrl(entry.book.path))
  if (!res.ok) throw new Error(`${entry.book.title}: story file unavailable (HTTP ${res.status})`)
  const result = validateStoryBook(await res.json())
  if (!result.ok || !result.book) {
    throw new Error(
      `${entry.book.title} failed validation: ${result.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `${i.path}: ${i.message}`)
        .join('; ')}`,
    )
  }
  return { ...result.book, storageLocation: 'builtin' }
}

export function fetchFullBook(entry: LibraryBook): Promise<StoryBook | undefined> {
  // Imported books can change under the admin screens, so never cache those.
  if (entry.origin === 'imported') return loadFullBook(entry)
  const key = entry.book.path
  const cached = fullBookCache.get(key)
  if (cached) return cached
  const promise = loadFullBook(entry).catch((err) => {
    fullBookCache.delete(key)
    throw err
  })
  fullBookCache.set(key, promise)
  return promise
}

/** Loads a book's pages. Returns `undefined` while loading. */
export function useFullBook(entry: LibraryBook | undefined): {
  book?: StoryBook
  loading: boolean
  error?: string
} {
  const [state, setState] = useState<{ book?: StoryBook; loading: boolean; error?: string }>({
    loading: Boolean(entry),
  })
  const key = entry ? `${entry.origin}:${entry.book.id}:${entry.book.updatedAt}` : undefined

  useEffect(() => {
    if (!entry) {
      setState({ loading: false })
      return
    }
    let alive = true
    setState({ loading: true })
    fetchFullBook(entry)
      .then((book) => {
        if (alive) setState({ book, loading: false })
      })
      .catch((err: unknown) => {
        if (alive) setState({ loading: false, error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
