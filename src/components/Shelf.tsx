import type { ReactNode } from 'react'
import type { LibraryBook } from '@/lib/library'
import BookCard from './BookCard'
import styles from './Shelf.module.css'

interface Props {
  title: string
  emoji?: string
  books: LibraryBook[]
  action?: ReactNode
  headingId: string
}

export default function Shelf({ title, emoji, books, action, headingId }: Props) {
  if (books.length === 0) return null
  return (
    <section className={styles.shelf} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 className={styles.title} id={headingId}>
          {emoji ? (
            <span className={styles.emoji} aria-hidden="true">
              {emoji}
            </span>
          ) : null}
          {title}
          <span className={styles.count} aria-label={`${books.length} books`}>
            {books.length}
          </span>
        </h2>
        {action}
      </div>
      <ul
        className={styles.row}
        style={{ listStyle: 'none', padding: 0 }}
      >
        {books.map((entry) => (
          <li key={entry.book.id} style={{ display: 'contents' }}>
            <BookCard entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  )
}
