import { useState } from 'react'
import PagePreview from './PagePreview'
import type { Draft } from './wizardTypes'
import styles from './wizard.module.css'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

export default function StepPages({ draft, update }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= draft.pages.length || from === to) return
    const next = [...draft.pages]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    update({ pages: next })
  }

  const remove = (index: number) => {
    const page = draft.pages[index]
    if (page?.previewUrl) URL.revokeObjectURL(page.previewUrl)
    update({ pages: draft.pages.filter((_, i) => i !== index) })
  }

  const firstIndexOfHash = new Map<string, number>()
  draft.pages.forEach((p, i) => {
    if (p.hash && !firstIndexOfHash.has(p.hash)) firstIndexOfHash.set(p.hash, i)
  })

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>3 · Review the page order</h2>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '65ch', marginBottom: 'var(--space-4)' }}>
        Pages were ordered by filename. Drag a card — or use the arrow buttons — to fix
        the order, and remove any page that doesn't belong (blank scans, duplicates).
      </p>
      <ul className={styles.pageGrid}>
        {draft.pages.map((page, i) => {
          const dup = page.hash !== undefined && firstIndexOfHash.get(page.hash) !== i
          return (
            <li
              key={page.key}
              className={`${styles.pageCard} ${overIndex === i ? styles.dragOver : ''}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault()
                setOverIndex(i)
              }}
              onDragLeave={() => setOverIndex((v) => (v === i ? null : v))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex !== null) moveTo(dragIndex, i)
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
            >
              <span className={styles.pageNum}>
                Page {i + 1}
                {dup ? (
                  <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                    ⚠️ duplicate?
                  </span>
                ) : null}
              </span>
              <PagePreview page={page} alt={`Preview of page ${i + 1}`} />
              {page.sourceName ? (
                <span className={styles.pageName} title={page.sourceName}>
                  {page.sourceName}
                </span>
              ) : null}
              <div className={styles.pageBtns}>
                <button
                  type="button"
                  onClick={() => moveTo(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move page ${i + 1} earlier`}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveTo(i, i + 1)}
                  disabled={i === draft.pages.length - 1}
                  aria-label={`Move page ${i + 1} later`}
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove page ${i + 1}`}
                >
                  🗑
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
