import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVisibleLibraryBooks, type LibraryBook } from '@/lib/library'
import { buildSearchIndex, searchBooks } from '@/lib/search'
import { BUILT_IN_CATEGORIES } from '@/lib/categories'
import Shelf from '@/components/Shelf'
import BookCard from '@/components/BookCard'
import EmptyState from '@/components/EmptyState'
import styles from './LibraryHome.module.css'

interface Filters {
  category: string
  author: string
  ageRange: string
  readingLevel: string
  length: '' | 'short' | 'medium' | 'long'
  narration: '' | 'prerecorded' | 'tts-only'
  origin: '' | 'builtin' | 'imported'
  favouritesOnly: boolean
}

const NO_FILTERS: Filters = {
  category: '',
  author: '',
  ageRange: '',
  readingLevel: '',
  length: '',
  narration: '',
  origin: '',
  favouritesOnly: false,
}

function hasPrerecorded(entry: LibraryBook): boolean {
  return Boolean(
    entry.book.narration?.bookAudio || entry.book.pages.some((p) => p.audio),
  )
}

function applyFilters(books: LibraryBook[], f: Filters): LibraryBook[] {
  return books.filter((entry) => {
    const { book, state, origin } = entry
    if (f.category && !book.categories.includes(f.category)) return false
    if (f.author && !book.authors.includes(f.author)) return false
    if (f.ageRange && book.ageRange !== f.ageRange) return false
    if (f.readingLevel && book.readingLevel !== f.readingLevel) return false
    if (f.length) {
      const mins = book.estimatedMinutes ?? book.pages.length
      if (f.length === 'short' && mins > 5) return false
      if (f.length === 'medium' && (mins <= 5 || mins > 12)) return false
      if (f.length === 'long' && mins <= 12) return false
    }
    if (f.narration === 'prerecorded' && !hasPrerecorded(entry)) return false
    if (f.narration === 'tts-only' && hasPrerecorded(entry)) return false
    if (f.origin && origin !== f.origin) return false
    if (f.favouritesOnly && !state?.favourite) return false
    return true
  })
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'A story before sleep?'
  if (h < 12) return 'Good morning, reader!'
  if (h < 18) return 'Story time!'
  return 'Time for a bedtime story'
}

export default function LibraryHome() {
  const { books, loading } = useVisibleLibraryBooks()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [panelOpen, setPanelOpen] = useState(false)
  const panelId = useId()
  const headingBase = useId()

  const index = useMemo(() => buildSearchIndex(books), [books])
  const authors = useMemo(
    () => [...new Set(books.flatMap((b) => b.book.authors))].sort(),
    [books],
  )

  const activeFilterCount = useMemo(
    () =>
      (Object.keys(NO_FILTERS) as (keyof Filters)[]).filter(
        (k) => filters[k] !== NO_FILTERS[k],
      ).length,
    [filters],
  )
  const filtering = query.trim() !== '' || activeFilterCount > 0

  const results = useMemo(() => {
    const searched = searchBooks(index, books, query)
    return applyFilters(searched, filters)
  }, [index, books, query, filters])

  const shelves = useMemo(() => {
    if (filtering) return null
    const continueReading = books
      .filter((b) => b.state && b.state.currentPage > 1 && !b.state.completed)
      .sort((a, b) => (b.state?.lastOpenedAt ?? '').localeCompare(a.state?.lastOpenedAt ?? ''))
    const favourites = books
      .filter((b) => b.state?.favourite)
      .sort((a, b) => (b.state?.favouritedAt ?? '').localeCompare(a.state?.favouritedAt ?? ''))
    const recentlyAdded = [...books]
      .sort((a, b) => b.book.createdAt.localeCompare(a.book.createdAt))
      .slice(0, 8)
    const imported = books.filter((b) => b.origin === 'imported')
    const categoryShelves = BUILT_IN_CATEGORIES.map((cat) => ({
      cat,
      list: books.filter((b) => b.book.categories.includes(cat.id)),
    })).filter(({ list }) => list.length > 0)
    return { continueReading, favourites, recentlyAdded, imported, categoryShelves }
  }, [books, filtering])

  if (loading) {
    return (
      <p role="status" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        Opening the library…
      </p>
    )
  }

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }))

  return (
    <>
      <div className={styles.greeting}>
        <h1>{greeting()}</h1>
        <p>Pick a book from the shelf, or search for an old friend.</p>
      </div>

      <search role="search" aria-label="Find a book">
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <span aria-hidden="true">🔎</span>
            <input
              type="search"
              placeholder="Search books, authors…"
              aria-label="Search books and authors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.filterToggle}
            aria-expanded={panelOpen}
            aria-controls={panelId}
            onClick={() => setPanelOpen((v) => !v)}
          >
            <span aria-hidden="true">🎚️</span>
            Filters
            {activeFilterCount > 0 ? (
              <span className={styles.filterCount} aria-label={`${activeFilterCount} active`}>
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {panelOpen ? (
          <div className={styles.filterPanel} id={panelId}>
            <div className="field">
              <label htmlFor="f-category">Category</label>
              <select
                id="f-category"
                value={filters.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">All categories</option>
                {BUILT_IN_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-author">Author</label>
              <select
                id="f-author"
                value={filters.author}
                onChange={(e) => set('author', e.target.value)}
              >
                <option value="">All authors</option>
                {authors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-age">Age range</label>
              <select
                id="f-age"
                value={filters.ageRange}
                onChange={(e) => set('ageRange', e.target.value)}
              >
                <option value="">Any age</option>
                <option value="0-3">0–3</option>
                <option value="3-5">3–5</option>
                <option value="4-8">4–8</option>
                <option value="6-10">6–10</option>
                <option value="all-ages">All ages</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-level">Reading level</label>
              <select
                id="f-level"
                value={filters.readingLevel}
                onChange={(e) => set('readingLevel', e.target.value)}
              >
                <option value="">Any level</option>
                <option value="pre-reader">Pre-reader</option>
                <option value="early-reader">Early reader</option>
                <option value="independent">Independent</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-length">Length</label>
              <select
                id="f-length"
                value={filters.length}
                onChange={(e) => set('length', e.target.value as Filters['length'])}
              >
                <option value="">Any length</option>
                <option value="short">Short (≤ 5 min)</option>
                <option value="medium">Medium (6–12 min)</option>
                <option value="long">Long (12+ min)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-narration">Narration</label>
              <select
                id="f-narration"
                value={filters.narration}
                onChange={(e) => set('narration', e.target.value as Filters['narration'])}
              >
                <option value="">Any</option>
                <option value="prerecorded">Has recorded narration</option>
                <option value="tts-only">Read-aloud voice only</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-origin">Collection</label>
              <select
                id="f-origin"
                value={filters.origin}
                onChange={(e) => set('origin', e.target.value as Filters['origin'])}
              >
                <option value="">Built-in and imported</option>
                <option value="builtin">Built-in books</option>
                <option value="imported">My imported books</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-fav">Favourites</label>
              <select
                id="f-fav"
                value={filters.favouritesOnly ? 'yes' : ''}
                onChange={(e) => set('favouritesOnly', e.target.value === 'yes')}
              >
                <option value="">All books</option>
                <option value="yes">Favourites only</option>
              </select>
            </div>
            <div className={styles.filterFoot}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setFilters(NO_FILTERS)}
                disabled={activeFilterCount === 0}
              >
                Clear filters
              </button>
              <button type="button" className="btn" onClick={() => setPanelOpen(false)}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </search>

      {filtering ? (
        <section aria-label="Search results">
          <p className={styles.resultCount} role="status">
            {results.length === 0
              ? 'No books match yet'
              : `${results.length} ${results.length === 1 ? 'book' : 'books'} found`}
          </p>
          {results.length === 0 ? (
            <EmptyState emoji="🕯️" title="Nothing on this shelf yet">
              <p>Try a different word, or clear the filters to see every book.</p>
            </EmptyState>
          ) : (
            <ul className={styles.grid}>
              {results.map((entry) => (
                <li key={entry.book.id}>
                  <BookCard entry={entry} wide />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : books.length === 0 ? (
        <EmptyState emoji="🌙📚" title="Your library is waiting for its first story">
          <p style={{ marginBottom: 'var(--space-4)' }}>
            Add your own picture books from the owner workshop, and they'll appear right
            here — stored safely on this device.
          </p>
          <Link to="/admin" className="btn btn-primary">
            Open the workshop
          </Link>
        </EmptyState>
      ) : (
        shelves && (
          <>
            <Shelf
              headingId={`${headingBase}-continue`}
              title="Continue Reading"
              emoji="🔖"
              books={shelves.continueReading}
            />
            <Shelf
              headingId={`${headingBase}-fav`}
              title="Favourites"
              emoji="⭐"
              books={shelves.favourites}
            />
            <Shelf
              headingId={`${headingBase}-recent`}
              title="Recently Added"
              emoji="✨"
              books={shelves.recentlyAdded}
            />
            {shelves.categoryShelves.map(({ cat, list }) => (
              <Shelf
                key={cat.id}
                headingId={`${headingBase}-${cat.id}`}
                title={cat.label}
                emoji={cat.emoji}
                books={list}
              />
            ))}
            <Shelf
              headingId={`${headingBase}-imported`}
              title="My Imported Books"
              emoji="📥"
              books={shelves.imported}
            />
          </>
        )
      )}
    </>
  )
}
