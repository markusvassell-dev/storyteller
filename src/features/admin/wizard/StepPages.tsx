import { useState } from 'react'
import { NO_EDIT, applyPageEdit, isEdited, suggestTrim, type PageEdit } from '@/lib/imageEditing'
import PagePreview from './PagePreview'
import PageEditor from './PageEditor'
import type { Draft, DraftPage } from './wizardTypes'
import styles from './wizard.module.css'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

export default function StepPages({ draft, update }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [bulk, setBulk] = useState<{ done: number; total: number }>()
  const [notice, setNotice] = useState<string>()

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

  const patchPage = (index: number, patch: Partial<DraftPage>) => {
    update({ pages: draft.pages.map((p, i) => (i === index ? { ...p, ...patch } : p)) })
  }

  /** Replaces a page's image with an edited render, keeping the original. */
  const applyEdit = (index: number, blob: Blob, edit: PageEdit) => {
    const page = draft.pages[index]
    if (!page) return
    if (page.previewUrl) URL.revokeObjectURL(page.previewUrl)
    patchPage(index, {
      originalBlob: page.originalBlob ?? page.imageBlob,
      imageBlob: blob,
      previewUrl: URL.createObjectURL(blob),
      edit,
    })
  }

  /**
   * Photographs of one book share a background and a tilt, so trimming the
   * whole set in one go is usually right — and far less tedious than doing
   * twenty pages by hand.
   */
  const trimAll = async () => {
    const editable = draft.pages
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.originalBlob ?? p.imageBlob)
    if (editable.length === 0) return

    setBulk({ done: 0, total: editable.length })
    setNotice(undefined)
    let trimmed = 0
    const next = [...draft.pages]
    for (const [n, { p, i }] of editable.entries()) {
      const source = p.originalBlob ?? p.imageBlob!
      const crop = await suggestTrim(source)
      if (crop) {
        const edit: PageEdit = { rotate: p.edit?.rotate ?? 0, crop }
        const blob = await applyPageEdit(source, edit)
        if (next[i]!.previewUrl) URL.revokeObjectURL(next[i]!.previewUrl!)
        next[i] = {
          ...next[i]!,
          originalBlob: source,
          imageBlob: blob,
          previewUrl: URL.createObjectURL(blob),
          edit,
        }
        trimmed++
      }
      setBulk({ done: n + 1, total: editable.length })
    }
    update({ pages: next })
    setBulk(undefined)
    setNotice(
      trimmed === 0
        ? 'No pages needed trimming — they already fill the frame.'
        : `Trimmed the background from ${trimmed} of ${editable.length} pages. Open any page to fine-tune.`,
    )
  }

  const rotateAll = async (degrees: number) => {
    const editable = draft.pages
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.originalBlob ?? p.imageBlob)
    if (editable.length === 0) return
    setBulk({ done: 0, total: editable.length })
    const next = [...draft.pages]
    for (const [n, { p, i }] of editable.entries()) {
      const source = p.originalBlob ?? p.imageBlob!
      const edit: PageEdit = {
        rotate: (p.edit?.rotate ?? 0) + degrees,
        crop: p.edit?.crop,
      }
      const blob = await applyPageEdit(source, edit)
      if (next[i]!.previewUrl) URL.revokeObjectURL(next[i]!.previewUrl!)
      next[i] = {
        ...next[i]!,
        originalBlob: source,
        imageBlob: blob,
        previewUrl: URL.createObjectURL(blob),
        edit,
      }
      setBulk({ done: n + 1, total: editable.length })
    }
    update({ pages: next })
    setBulk(undefined)
    setNotice(`Rotated ${editable.length} pages.`)
  }

  const firstIndexOfHash = new Map<string, number>()
  draft.pages.forEach((p, i) => {
    if (p.hash && !firstIndexOfHash.has(p.hash)) firstIndexOfHash.set(p.hash, i)
  })

  const editingPage = editing !== null ? draft.pages[editing] : undefined
  const editingSource = editingPage?.originalBlob ?? editingPage?.imageBlob
  const hasImportedImages = draft.pages.some((p) => p.originalBlob ?? p.imageBlob)

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>3 · Review the page order</h2>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '65ch', marginBottom: 'var(--space-3)' }}>
        Pages were ordered by filename. Drag a card — or use the arrow buttons — to fix
        the order, and remove any page that doesn't belong (blank scans, duplicates).
      </p>

      {hasImportedImages ? (
        <div className={styles.bulkTools}>
          <span className={styles.editorLabel}>Photographed the book?</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void trimAll()}
            disabled={Boolean(bulk)}
          >
            ✂️ Trim every page
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void rotateAll(-90)}
            disabled={Boolean(bulk)}
            aria-label="Rotate every page left"
          >
            ↺ Rotate all
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void rotateAll(90)}
            disabled={Boolean(bulk)}
            aria-label="Rotate every page right"
          >
            ↻ Rotate all
          </button>
          {bulk ? (
            <span role="status" className={styles.progressNote}>
              ⏳ {bulk.done}/{bulk.total}
            </span>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="badge badge-positive" style={{ marginBottom: 'var(--space-3)', whiteSpace: 'normal' }}>
          {notice}
        </p>
      ) : null}

      <ul className={styles.pageGrid}>
        {draft.pages.map((page, i) => {
          const dup = page.hash !== undefined && firstIndexOfHash.get(page.hash) !== i
          const canEdit = Boolean(page.originalBlob ?? page.imageBlob)
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
                {isEdited(page.edit) ? (
                  <span className="badge" style={{ marginLeft: 6 }}>
                    ✂️ tidied
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
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setEditing(i)}
                    aria-label={`Straighten and trim page ${i + 1}`}
                  >
                    ✂️
                  </button>
                ) : null}
                <button type="button" onClick={() => remove(i)} aria-label={`Remove page ${i + 1}`}>
                  🗑
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {editing !== null && editingPage && editingSource ? (
        <PageEditor
          original={editingSource}
          edit={editingPage.edit ?? NO_EDIT}
          pageNumber={editing + 1}
          onChange={(edit) => patchPage(editing, { edit })}
          onApply={(blob, edit) => applyEdit(editing, blob, edit)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  )
}
