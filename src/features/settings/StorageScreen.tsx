import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getStorageEstimate, requestPersistentStorage, type StorageEstimateInfo } from '@/lib/db'
import { deleteBookAssets } from '@/lib/assets'
import { formatBytes } from '@/lib/util'
import styles from './SettingsScreen.module.css'

interface BookUsage {
  id: string
  title: string
  bytes: number
}

export default function StorageScreen() {
  const [estimate, setEstimate] = useState<StorageEstimateInfo>()
  const [persisted, setPersisted] = useState<boolean>()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [message, setMessage] = useState<string>()

  const usage = useLiveQuery(async () => {
    const books = await db.books.toArray()
    const assets = await db.assets.toArray()
    const byBook = new Map<string, number>()
    for (const a of assets) {
      byBook.set(a.bookId, (byBook.get(a.bookId) ?? 0) + a.size)
    }
    return books.map<BookUsage>((b) => ({
      id: b.id,
      title: b.title,
      bytes: byBook.get(b.id) ?? 0,
    }))
  }, [])

  const refreshEstimate = useCallback(() => {
    void getStorageEstimate().then(setEstimate)
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined)
  }, [])

  useEffect(() => {
    refreshEstimate()
  }, [refreshEstimate])

  const removeBook = async (id: string) => {
    await deleteBookAssets(id)
    await db.books.delete(id)
    await db.bookState.delete(id)
    setConfirmDelete(null)
    setMessage('Book removed from this device.')
    refreshEstimate()
  }

  return (
    <>
      <Link to="/settings" style={{ fontWeight: 700, textDecoration: 'none' }}>
        ← Settings
      </Link>
      <h1 style={{ margin: 'var(--space-3) 0 var(--space-4)' }}>Storage</h1>

      <section className={styles.section} aria-labelledby="st-usage">
        <h2 id="st-usage">Space used</h2>
        {estimate ? (
          <>
            <p>
              <strong>{formatBytes(estimate.usage)}</strong> used of about{' '}
              {formatBytes(estimate.quota)} available to this app.
            </p>
            {estimate.nearlyFull ? (
              <p className="badge badge-warning" role="alert" style={{ marginTop: 'var(--space-2)' }}>
                ⚠️ Storage nearly full — export a backup and remove unused books.
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.note}>This browser doesn't report storage usage.</p>
        )}
        <p className={styles.note} style={{ marginTop: 'var(--space-2)' }}>
          Imported books, narration audio, favourites and progress are all stored on this
          device only.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="st-persist">
        <h2 id="st-persist">Protect stored books</h2>
        {persisted ? (
          <p role="status">
            ✅ This device has granted protected storage — your books are much less
            likely to be cleared automatically.
          </p>
        ) : (
          <>
            <p className={styles.note}>
              Browsers may clear site data when space runs low. Ask for protected
              storage to reduce that risk. A regular exported backup is still the only
              real safety net.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => {
                void requestPersistentStorage().then((ok) => {
                  setPersisted(ok)
                  if (!ok) {
                    setMessage(
                      'The browser declined for now — installing the app to the Home Screen usually helps.',
                    )
                  }
                })
              }}
            >
              Request protected storage
            </button>
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="st-books">
        <h2 id="st-books">Imported books on this device</h2>
        {usage === undefined ? (
          <p role="status">Measuring…</p>
        ) : usage.length === 0 ? (
          <p className={styles.note}>
            No imported books yet. Built-in demonstration books live inside the app and
            use almost no extra space.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {usage.map((b) => (
              <li key={b.id} className={styles.row}>
                <span className={styles.rowLabel}>
                  {b.title}
                  <span style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
                    {' '}
                    · {formatBytes(b.bytes)}
                  </span>
                </span>
                {confirmDelete === b.id ? (
                  <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void removeBook(b.id)}
                    >
                      Delete forever
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmDelete(b.id)}
                  >
                    Remove…
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {message ? (
          <p role="status" className={styles.note} style={{ marginTop: 'var(--space-2)' }}>
            {message}
          </p>
        ) : null}
        <p className={styles.note} style={{ marginTop: 'var(--space-3)' }}>
          Removing a book deletes its pages and audio from this device. If it isn't in a
          backup, it can't be recovered. Backups live in the{' '}
          <Link to="/admin/backup">owner workshop</Link>.
        </p>
      </section>
    </>
  )
}
