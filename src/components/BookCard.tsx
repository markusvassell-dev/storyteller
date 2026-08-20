import { Link } from 'react-router-dom'
import type { LibraryBook } from '@/lib/library'
import { useAssetUrl } from '@/lib/useAssetUrl'
import styles from './BookCard.module.css'

interface Props {
  entry: LibraryBook
  /** Wider card for grid views. */
  wide?: boolean
}

export default function BookCard({ entry, wide }: Props) {
  const { book, state } = entry
  const coverUrl = useAssetUrl(book.thumbnail ?? book.cover)
  const inProgress =
    state && state.currentPage > 1 && !state.completed ? state.currentPage : undefined
  const percent =
    inProgress && state ? Math.round((state.currentPage / state.totalPages) * 100) : 0

  const progressLabel = inProgress
    ? `, page ${state?.currentPage} of ${state?.totalPages}`
    : state?.completed
      ? ', finished'
      : ''

  return (
    <Link
      to={`/book/${book.slug}`}
      className={styles.card}
      style={wide ? ({ '--card-width': '100%' } as React.CSSProperties) : undefined}
      aria-label={`${book.title} by ${book.authors.join(', ')}${progressLabel}${
        state?.favourite ? ', favourite' : ''
      }`}
    >
      <div className={styles.coverWrap} aria-hidden="true">
        {coverUrl ? (
          <img className={styles.cover} src={coverUrl} alt="" loading="lazy" />
        ) : (
          <div className={styles.coverFallback}>📖</div>
        )}
        {state?.favourite ? (
          <span className={styles.favBadge} title="Favourite">
            ⭐
          </span>
        ) : null}
        {inProgress ? (
          <div className={styles.progress}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        ) : null}
      </div>
      <span className={styles.title}>{book.title}</span>
      <span className={styles.author}>{book.authors.join(', ')}</span>
    </Link>
  )
}
