import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFullBook, useAllLibraryBooks, type LibraryBook } from '@/lib/library'
import {
  deleteImportedBook,
  duplicateBook,
  reorderBooks,
  setBookHidden,
} from '@/lib/bookAdmin'
import { useAssetUrl } from '@/lib/useAssetUrl'

function CoverThumb({ entry }: { entry: LibraryBook }) {
  const url = useAssetUrl(entry.book.thumbnail ?? entry.book.cover)
  return url ? (
    <img
      src={url}
      alt=""
      width={44}
      height={58}
      style={{ borderRadius: 6, objectFit: 'cover', background: 'var(--color-bg-sunken)' }}
    />
  ) : (
    <span style={{ fontSize: '1.6rem' }} aria-hidden="true">
      📖
    </span>
  )
}

export default function AdminBooks() {
  const { books, loading } = useAllLibraryBooks()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= books.length) return
    const next = [...books]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item!)
    await reorderBooks(next)
  }

  if (loading) return <p role="status">Loading books…</p>

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <h1 style={{ flex: 1 }}>Books</h1>
        <Link to="/admin/books/new" className="btn btn-primary">
          ➕ Add a book
        </Link>
      </div>
      {message ? (
        <p role="status" className="badge badge-positive" style={{ marginBottom: 'var(--space-3)' }}>
          {message}
        </p>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
        {books.map((entry, i) => {
          const { book } = entry
          return (
            <li
              key={book.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                background: 'var(--color-bg-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                flexWrap: 'wrap',
              }}
            >
              <CoverThumb entry={entry} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <strong>{book.title}</strong>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span>{book.authors.join(', ')}</span>
                  <span>· {book.pageCount} pages</span>
                  <span>· {entry.origin === 'imported' ? 'Imported (on device)' : 'Built-in'}</span>
                  {entry.hidden ? <span className="badge">🙈 Hidden</span> : null}
                  {entry.quarantined ? (
                    <span className="badge badge-warning">⚠️ Rights review</span>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${book.title} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void move(i, 1)}
                  disabled={i === books.length - 1}
                  aria-label={`Move ${book.title} down`}
                >
                  ↓
                </button>
                <Link to={`/book/${book.slug}`} className="btn" aria-label={`Preview ${book.title}`}>
                  👁 Preview
                </Link>
                <Link
                  to={`/admin/books/${book.id}/edit`}
                  className="btn"
                  aria-label={`Edit ${book.title}`}
                >
                  ✏️ Edit
                </Link>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    // Shelves hold summaries; duplication needs the pages.
                    void fetchFullBook(entry)
                      .then((full) => {
                        if (!full) throw new Error('Could not load this book')
                        return duplicateBook(full)
                      })
                      .then(() => setMessage(`Duplicated “${book.title}”.`))
                      .catch((err) => setMessage(String(err)))
                      .finally(() => setBusy(false))
                  }}
                  aria-label={`Duplicate ${book.title}`}
                >
                  📄 Duplicate
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void setBookHidden(entry, !entry.hidden)}
                  aria-pressed={entry.hidden}
                  aria-label={`${entry.hidden ? 'Show' : 'Hide'} ${book.title}`}
                >
                  {entry.hidden ? '👀 Unhide' : '🙈 Hide'}
                </button>
                {entry.origin === 'imported' ? (
                  confirmDelete === book.id ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          void deleteImportedBook(book.id).then(() => {
                            setConfirmDelete(null)
                            setMessage(`Deleted “${book.title}” from this device.`)
                          })
                        }}
                      >
                        Delete forever
                      </button>
                      <button type="button" className="btn" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setConfirmDelete(book.id)}
                      aria-label={`Delete ${book.title}`}
                    >
                      🗑 Delete…
                    </button>
                  )
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)', maxWidth: '65ch' }}>
        Built-in demonstration books can be hidden but not deleted; editing one creates
        your own local copy and tucks the original away. Deleting an imported book
        removes its files from this device — export a backup first if you might want it
        back.
      </p>
    </>
  )
}
