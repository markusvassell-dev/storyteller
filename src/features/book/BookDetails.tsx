import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLibraryBook } from '@/lib/library'
import { useAssetUrl } from '@/lib/useAssetUrl'
import { toggleFavourite } from '@/lib/bookState'
import { useOwnerGate } from '@/lib/ownerGate'
import { categoryLabel } from '@/lib/categories'
import { formatMinutes } from '@/lib/util'
import EmptyState from '@/components/EmptyState'
import styles from './BookDetails.module.css'

const RIGHTS_LABELS: Record<string, string> = {
  'public-domain': 'Public domain',
  'creative-commons': 'Creative Commons',
  'owner-permission': 'Owner-supplied (personal use)',
  original: 'Original to this project',
  'needs-review': 'Rights need review',
}

export default function BookDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { entry, loading } = useLibraryBook(slug)
  const unlocked = useOwnerGate((s) => s.unlocked)
  const coverUrl = useAssetUrl(entry?.book.cover)

  if (loading) {
    return <p role="status">Fetching this book…</p>
  }
  if (!entry) {
    return (
      <EmptyState emoji="🔍" title="We couldn't find that book">
        <Link to="/" className="btn btn-primary">
          Back to the library
        </Link>
      </EmptyState>
    )
  }

  const { book, state, origin } = entry
  const resumePage = state && state.currentPage > 1 && !state.completed ? state.currentPage : undefined
  const hasRecorded = Boolean(book.narration?.bookAudio || book.pages.some((p) => p.audio))
  const fav = Boolean(state?.favourite)

  return (
    <article>
      <Link to="/" className={styles.backLink}>
        <span aria-hidden="true">←</span> Library
      </Link>
      <div className={styles.layout}>
        <div className={styles.coverWrap}>
          {coverUrl ? (
            <img
              className={styles.cover}
              src={coverUrl}
              alt={`Cover of ${book.title}`}
            />
          ) : (
            <div className={styles.coverFallback} aria-hidden="true">
              📖
            </div>
          )}
        </div>

        <div>
          {book.categories[0] ? (
            <p className={styles.eyebrow}>{categoryLabel(book.categories[0])}</p>
          ) : null}
          <h1 className={styles.title}>{book.title}</h1>
          {book.subtitle ? <p className={styles.subtitle}>{book.subtitle}</p> : null}
          <p className={styles.credits}>
            Written by <strong>{book.authors.join(', ')}</strong>
            {book.illustrators.length > 0 && (
              <>
                {' · '}Illustrated by <strong>{book.illustrators.join(', ')}</strong>
              </>
            )}
            {book.translators.length > 0 && (
              <>
                {' · '}Translated by <strong>{book.translators.join(', ')}</strong>
              </>
            )}
          </p>

          <ul className={styles.facts}>
            <li className="badge">
              <span aria-hidden="true">🎂</span> Ages {book.ageRange.replace('-', '–')}
            </li>
            <li className="badge">
              <span aria-hidden="true">📄</span> {book.pages.length} pages
            </li>
            {book.estimatedMinutes ? (
              <li className="badge">
                <span aria-hidden="true">⏱️</span> {formatMinutes(book.estimatedMinutes)}
              </li>
            ) : null}
            <li className="badge">
              <span aria-hidden="true">🔊</span>{' '}
              {hasRecorded ? 'Recorded narration' : 'Read-aloud voice'}
            </li>
            <li className="badge badge-positive">
              <span aria-hidden="true">📱</span>{' '}
              {origin === 'imported' ? 'Stored on this device' : 'Available offline'}
            </li>
            {state?.completed ? (
              <li className="badge badge-positive">
                <span aria-hidden="true">✅</span> Finished
              </li>
            ) : null}
          </ul>

          {book.description ? (
            <p className={styles.description}>{book.description}</p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void navigate(`/read/${book.slug}`)}
            >
              <span aria-hidden="true">📖</span>
              {resumePage ? `Resume page ${resumePage}` : 'Read this book'}
            </button>
            {resumePage ? (
              <button
                type="button"
                className="btn btn-lg"
                onClick={() => void navigate(`/read/${book.slug}?page=1`)}
              >
                Start over
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-lg"
              aria-pressed={fav}
              onClick={() => void toggleFavourite(book.id, book.pages.length)}
            >
              <span aria-hidden="true">{fav ? '⭐' : '☆'}</span>
              {fav ? 'Favourite' : 'Add favourite'}
            </button>
            {unlocked ? (
              <Link to={`/admin/books/${book.id}/edit`} className="btn btn-outline btn-lg">
                <span aria-hidden="true">🛠️</span> Edit
              </Link>
            ) : null}
          </div>

          <details className={styles.rights}>
            <summary>
              <span aria-hidden="true">ℹ️</span> About this book's source &amp; rights
            </summary>
            <dl className={styles.rightsBody}>
              <dt>Rights status</dt>
              <dd>{RIGHTS_LABELS[book.rights.status] ?? book.rights.status}</dd>
              {book.rights.license ? (
                <>
                  <dt>Licence</dt>
                  <dd>{book.rights.license}</dd>
                </>
              ) : null}
              {book.rights.publicDomainBasis ? (
                <>
                  <dt>Public-domain basis</dt>
                  <dd>{book.rights.publicDomainBasis}</dd>
                </>
              ) : null}
              {book.source ? (
                <>
                  <dt>Source</dt>
                  <dd>{book.source}</dd>
                </>
              ) : null}
              {book.attribution ? (
                <>
                  <dt>Attribution</dt>
                  <dd>{book.attribution}</dd>
                </>
              ) : null}
              {book.rights.sourceUrl ? (
                <>
                  <dt>Source link</dt>
                  <dd>
                    <a href={book.rights.sourceUrl} target="_blank" rel="noreferrer">
                      {book.rights.sourceUrl}
                    </a>
                  </dd>
                </>
              ) : null}
              {book.rightsCheckedAt ? (
                <>
                  <dt>Rights checked</dt>
                  <dd>{new Date(book.rightsCheckedAt).toLocaleDateString('en')}</dd>
                </>
              ) : null}
              {origin === 'imported' ? (
                <>
                  <dt>Storage</dt>
                  <dd>
                    This book is stored only on this device and is never uploaded.
                  </dd>
                </>
              ) : null}
            </dl>
          </details>
        </div>
      </div>
    </article>
  )
}
