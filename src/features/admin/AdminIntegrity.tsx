import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllLibraryBooks, useBuiltinStore } from '@/lib/library'
import { runIntegrityCheck, type IntegrityFinding } from '@/lib/integrity'

export default function AdminIntegrity() {
  const { books, loading } = useAllLibraryBooks()
  const invalidBuiltins = useBuiltinStore((s) => s.invalid)
  const [findings, setFindings] = useState<IntegrityFinding[]>()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number }>()

  const run = async () => {
    setRunning(true)
    setProgress({ done: 0, total: books.length })
    try {
      setFindings(
        await runIntegrityCheck(books, invalidBuiltins, (done, total) =>
          setProgress({ done, total }),
        ),
      )
    } finally {
      setRunning(false)
      setProgress(undefined)
    }
  }

  const errors = findings?.filter((f) => f.severity === 'error') ?? []
  const warnings = findings?.filter((f) => f.severity === 'warning') ?? []

  return (
    <>
      <h1 style={{ marginBottom: 'var(--space-2)' }}>Library check</h1>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '60ch', marginBottom: 'var(--space-4)' }}>
        Scans every book for missing pages, missing files, broken metadata and rights
        gaps.
      </p>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => void run()}
        disabled={running || loading}
      >
        {running ? 'Checking…' : 'Run library check'}
      </button>
      {progress ? (
        <p role="status" style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>
          Checking book {progress.done} of {progress.total}…
        </p>
      ) : null}

      {findings !== undefined && !running ? (
        <section style={{ marginTop: 'var(--space-5)' }} aria-live="polite">
          {findings.length === 0 ? (
            <p className="badge badge-positive" style={{ fontSize: 'var(--text-md)' }}>
              ✅ Everything looks healthy — {books.length} books checked.
            </p>
          ) : (
            <>
              <p style={{ marginBottom: 'var(--space-3)', fontWeight: 700 }}>
                {errors.length} problem{errors.length === 1 ? '' : 's'}, {warnings.length}{' '}
                warning{warnings.length === 1 ? '' : 's'}:
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-2)', maxWidth: 720 }}>
                {findings.map((f, i) => (
                  <li
                    key={i}
                    className={`badge ${f.severity === 'error' ? 'badge-danger' : 'badge-warning'}`}
                    style={{ justifyContent: 'flex-start', fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', whiteSpace: 'normal' }}
                  >
                    <span aria-hidden="true">{f.severity === 'error' ? '❌' : '⚠️'}</span>
                    <span>
                      <strong>{f.bookTitle}</strong>: {f.message}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
                Fix problems from <Link to="/admin/books">Books</Link> (edit the affected
                book) or free space in <Link to="/settings/storage">Storage</Link>.
              </p>
            </>
          )}
        </section>
      ) : null}
    </>
  )
}
