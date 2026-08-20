import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAllLibraryBooks } from '@/lib/library'
import { getStorageEstimate, type StorageEstimateInfo } from '@/lib/db'
import { formatBytes } from '@/lib/util'

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-4)',
  textDecoration: 'none',
  color: 'inherit',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
}

export default function AdminDashboard() {
  const { books, loading } = useAllLibraryBooks()
  const [estimate, setEstimate] = useState<StorageEstimateInfo>()
  useEffect(() => {
    void getStorageEstimate().then(setEstimate)
  }, [])

  const imported = books.filter((b) => b.origin === 'imported')
  const quarantined = books.filter((b) => b.quarantined)
  const hidden = books.filter((b) => b.hidden)

  return (
    <>
      <h1 style={{ marginBottom: 'var(--space-2)' }}>Owner workshop</h1>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '60ch', marginBottom: 'var(--space-5)' }}>
        Add, edit and organise the books in your private library. Everything you import
        stays on this device.
      </p>

      {!loading && quarantined.length > 0 ? (
        <p className="badge badge-warning" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          ⚠️ {quarantined.length} book{quarantined.length > 1 ? 's' : ''} in rights review —
          they stay out of the library until resolved.
        </p>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <Link to="/admin/books/new" style={{ ...cardStyle, borderColor: 'var(--color-accent)' }}>
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            ➕
          </span>
          <strong>Add a book</strong>
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
            Import a PDF, page images, a ZIP/CBZ or a story package.
          </span>
        </Link>
        <Link to="/admin/books" style={cardStyle}>
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            📚
          </span>
          <strong>Manage books</strong>
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
            {loading
              ? 'Counting…'
              : `${books.length} books · ${imported.length} imported · ${hidden.length} hidden`}
          </span>
        </Link>
        <Link to="/admin/categories" style={cardStyle}>
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            🏷️
          </span>
          <strong>Categories</strong>
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
            Curate the shelves children see.
          </span>
        </Link>
        <Link to="/admin/backup" style={cardStyle}>
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            🧳
          </span>
          <strong>Backup &amp; restore</strong>
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
            Export the library, or move it to another device.
          </span>
        </Link>
        <Link to="/admin/integrity" style={cardStyle}>
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            🩺
          </span>
          <strong>Library check</strong>
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
            Find missing pages, assets and rights gaps.
          </span>
        </Link>
        <Link to="/settings/storage" style={cardStyle}>
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
            💾
          </span>
          <strong>Storage</strong>
          <span style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)' }}>
            {estimate
              ? `${formatBytes(estimate.usage)} used${estimate.nearlyFull ? ' — nearly full!' : ''}`
              : 'Usage & protected storage.'}
          </span>
        </Link>
      </div>

      <section
        style={{
          marginTop: 'var(--space-6)',
          background: 'var(--color-accent-soft)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          maxWidth: '70ch',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>
          📌 A note on rights
        </h2>
        <p style={{ fontSize: 'var(--text-sm)' }}>
          Only import books you own or have permission to use (like your Robert Munsch
          collection). Imports stay private on this device. Never load files from
          unauthorised copies or sharing sites — the importer will always ask you to
          confirm the source.
        </p>
      </section>
    </>
  )
}
