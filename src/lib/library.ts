import { useMemo } from 'react'
import { create } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BookRow, type BookStateRow, type BuiltinOverrideRow } from './db'
import { builtinIndexSchema, validateStoryBook, type StoryBook } from './schema'
import { staticUrl } from './assets'

/**
 * The library merges two tiers:
 *  - built-in demonstration books: static JSON shipped with the app
 *  - imported private books: rows in IndexedDB (on-device only)
 */

export interface LibraryBook {
  book: StoryBook
  origin: 'builtin' | 'imported'
  hidden: boolean
  quarantined: boolean
  sortOrder: number
  state?: BookStateRow
}

interface BuiltinStore {
  books: StoryBook[]
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
      const index = builtinIndexSchema.parse(await res.json())
      const books: StoryBook[] = []
      const invalid: BuiltinStore['invalid'] = []
      await Promise.all(
        index.books.map(async (path) => {
          try {
            const r = await fetch(staticUrl(path))
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            const result = validateStoryBook(await r.json())
            if (result.ok && result.book) {
              books.push({ ...result.book, storageLocation: 'builtin' })
            } else {
              invalid.push({ path, issues: result.issues.map((i) => `${i.path}: ${i.message}`) })
            }
          } catch (err) {
            invalid.push({ path, issues: [String(err)] })
          }
        }),
      )
      books.sort((a, b) => a.title.localeCompare(b.title))
      set({ books, invalid, loaded: true })
    } catch (err) {
      set({ error: String(err), loaded: true })
    }
  },
}))

function combine(
  builtins: StoryBook[],
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
        quarantined: book.rights.status === 'needs-review',
        sortOrder: o?.sortOrder ?? i,
        state: stateMap.get(book.id),
      }
    })

  const fromImported: LibraryBook[] = (rows ?? []).map((row) => ({
    book: row.book,
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
  const entry = useMemo(
    () => books.find((b) => b.book.slug === slug),
    [books, slug],
  )
  return { entry, loading }
}
