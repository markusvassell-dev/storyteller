import type { ValidationIssue } from '@/lib/schema'
import PagePreview from './PagePreview'
import { stringToList, type Draft } from './wizardTypes'
import styles from './wizard.module.css'

interface Props {
  draft: Draft
  issues: ValidationIssue[]
}

export default function StepPreview({ draft, issues }: Props) {
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>7 · Preview &amp; check</h2>

      {errors.length === 0 ? (
        <p className="badge badge-positive" style={{ marginBottom: 'var(--space-3)' }}>
          ✅ The book passes validation and is ready to save.
        </p>
      ) : (
        <ul role="alert" className={styles.blockers}>
          {errors.map((e, i) => (
            <li key={i}>
              ❌ {e.path}: {e.message}
            </li>
          ))}
        </ul>
      )}
      {warnings.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
          {warnings.map((w, i) => (
            <li key={i} className="badge badge-warning" style={{ whiteSpace: 'normal' }}>
              ⚠️ {w.message}
            </li>
          ))}
        </ul>
      ) : null}

      {draft.rights.status === 'needs-review' ? (
        <p className="badge badge-warning" style={{ marginBottom: 'var(--space-3)', whiteSpace: 'normal' }}>
          🔒 Rights are “needs review”, so this book saves into quarantine and won't
          appear in the library until its rights are settled.
        </p>
      ) : null}

      <section
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          border: '1px solid var(--color-border)',
        }}
        aria-label="Book summary"
      >
        <div style={{ width: 130 }}>
          {draft.coverPreviewUrl ? (
            <img
              src={draft.coverPreviewUrl}
              alt={`Cover of ${draft.title}`}
              style={{ width: '100%', borderRadius: 8, aspectRatio: '3/4', objectFit: 'cover' }}
            />
          ) : draft.pages[0] ? (
            <PagePreview page={draft.pages[0]} alt={`First page of ${draft.title}`} />
          ) : null}
        </div>
        <dl style={{ flex: 1, minWidth: 220, display: 'grid', gap: 'var(--space-1)' }}>
          <div>
            <dt className="visually-hidden">Title</dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800 }}>
              {draft.title || '(untitled)'}
            </dd>
          </div>
          <div>
            <dt className="visually-hidden">Authors</dt>
            <dd style={{ margin: 0 }}>{stringToList(draft.authors).join(', ') || '—'}</dd>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
            <span className="badge">📄 {draft.pages.length} pages</span>
            <span className="badge">🎂 Ages {draft.ageRange.replace('-', '–')}</span>
            <span className="badge">
              🔊{' '}
              {draft.useBookAudio || draft.pages.some((p) => p.audioBlob || p.audioRef)
                ? 'Recorded narration'
                : 'Device voice'}
            </span>
            <span className="badge">🏷 {draft.categories.length} shelves</span>
          </div>
          {draft.description ? (
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-ink-soft)' }}>{draft.description}</p>
          ) : null}
        </dl>
      </section>

      <h3 style={{ fontSize: 'var(--text-md)', margin: 'var(--space-4) 0 var(--space-2)' }}>
        Pages in order
      </h3>
      <ul className={styles.pageGrid}>
        {draft.pages.map((p, i) => (
          <li className={styles.pageCard} key={p.key}>
            <span className={styles.pageNum}>Page {i + 1}</span>
            <PagePreview page={p} alt={p.alt || `Page ${i + 1}`} />
            {p.text ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.text}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  )
}
