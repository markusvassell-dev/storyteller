import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  NO_EDIT,
  applyPageEdit,
  isEdited,
  suggestTrim,
  type PageEdit,
  type Rect,
} from '@/lib/imageEditing'
import styles from './wizard.module.css'

/**
 * Straighten-and-trim editor for a scanned page.
 *
 * The original bytes are never discarded — every edit re-renders from the
 * page's original blob, so "Reset" always gets the photograph back and
 * repeated tweaks never compound compression artefacts.
 */

interface Props {
  /** The untouched source image. */
  original: Blob
  edit: PageEdit
  pageNumber: number
  onChange: (edit: PageEdit) => void
  onApply: (edited: Blob, edit: PageEdit) => void
  onClose: () => void
}

const HANDLES = [
  { id: 'left', label: 'Left edge' },
  { id: 'right', label: 'Right edge' },
  { id: 'top', label: 'Top edge' },
  { id: 'bottom', label: 'Bottom edge' },
] as const

export default function PageEditor({
  original,
  edit,
  pageNumber,
  onChange,
  onApply,
  onClose,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()
  const frameRef = useRef<HTMLDivElement>(null)

  // Live preview of the current edit.
  useEffect(() => {
    let alive = true
    let url: string | undefined
    void applyPageEdit(original, edit).then((blob) => {
      if (!alive) return
      url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [original, edit])

  const crop: Rect = edit.crop ?? { x: 0, y: 0, width: 1, height: 1 }
  const setCrop = (patch: Partial<Rect>) => {
    const next = { ...crop, ...patch }
    // Keep the crop inside the frame and never smaller than a usable sliver.
    next.x = Math.min(Math.max(0, next.x), 0.9)
    next.y = Math.min(Math.max(0, next.y), 0.9)
    next.width = Math.min(Math.max(0.1, next.width), 1 - next.x)
    next.height = Math.min(Math.max(0.1, next.height), 1 - next.y)
    onChange({ ...edit, crop: next })
  }

  const autoTrim = async () => {
    setBusy(true)
    setMessage(undefined)
    try {
      const suggested = await suggestTrim(original)
      if (suggested) {
        onChange({ ...edit, crop: suggested })
        setMessage('Trimmed the background away — nudge the edges if it took too much.')
      } else {
        setMessage('No obvious background to trim; the page already fills the photo.')
      }
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    setBusy(true)
    try {
      const blob = await applyPageEdit(original, edit)
      onApply(blob, edit)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const cropStyle: CSSProperties = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`,
  }

  return (
    <div className={styles.editorBackdrop} role="dialog" aria-label={`Edit page ${pageNumber}`}>
      <div className={styles.editorPanel}>
        <div className={styles.editorHeader}>
          <h3 style={{ fontSize: 'var(--text-md)' }}>Tidy up page {pageNumber}</h3>
          <button type="button" className="btn" onClick={onClose} aria-label="Close editor">
            ✕
          </button>
        </div>

        <div className={styles.editorStage} ref={frameRef}>
          {previewUrl ? (
            <img src={previewUrl} alt={`Page ${pageNumber} preview`} className={styles.editorImage} />
          ) : (
            <p role="status">Preparing…</p>
          )}
        </div>

        {/* The crop rectangle is shown over an unedited copy for context. */}
        <p className={styles.editorHint}>
          The preview above shows the finished page. Adjust with the controls below.
        </p>
        <div className={styles.editorCropMap} aria-hidden="true">
          <div className={styles.editorCropBox} style={cropStyle} />
        </div>

        <div className={styles.editorControls}>
          <div className={styles.editorRow}>
            <span className={styles.editorLabel}>Straighten</span>
            <button
              type="button"
              className="btn"
              onClick={() => onChange({ ...edit, rotate: edit.rotate - 90 })}
              aria-label="Rotate left 90 degrees"
            >
              ↺ 90°
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onChange({ ...edit, rotate: edit.rotate + 90 })}
              aria-label="Rotate right 90 degrees"
            >
              ↻ 90°
            </button>
          </div>

          <div className={styles.editorRow}>
            <label htmlFor="fine-rotate" className={styles.editorLabel}>
              Fine tilt
            </label>
            <input
              id="fine-rotate"
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={((edit.rotate % 90) + 90 + 45) % 90 > 45
                ? (((edit.rotate % 90) + 90) % 90) - 90
                : ((edit.rotate % 90) + 90) % 90}
              onChange={(e) => {
                const quarter = Math.round(edit.rotate / 90) * 90
                onChange({ ...edit, rotate: quarter + Number(e.target.value) })
              }}
              style={{ flex: 1 }}
            />
            <span className={styles.editorValue}>{edit.rotate.toFixed(1)}°</span>
          </div>

          <div className={styles.editorRow}>
            <span className={styles.editorLabel}>Trim edges</span>
            <button type="button" className="btn btn-primary" onClick={() => void autoTrim()} disabled={busy}>
              ✂️ Trim background
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onChange({ ...edit, crop: undefined })}
              disabled={!edit.crop}
            >
              Undo trim
            </button>
          </div>

          {HANDLES.map((handle) => {
            const value =
              handle.id === 'left'
                ? crop.x
                : handle.id === 'top'
                  ? crop.y
                  : handle.id === 'right'
                    ? crop.x + crop.width
                    : crop.y + crop.height
            return (
              <div className={styles.editorRow} key={handle.id}>
                <label htmlFor={`crop-${handle.id}`} className={styles.editorLabel}>
                  {handle.label}
                </label>
                <input
                  id={`crop-${handle.id}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.005}
                  value={value}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (handle.id === 'left') setCrop({ x: v, width: crop.x + crop.width - v })
                    else if (handle.id === 'top') setCrop({ y: v, height: crop.y + crop.height - v })
                    else if (handle.id === 'right') setCrop({ width: v - crop.x })
                    else setCrop({ height: v - crop.y })
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            )
          })}
        </div>

        {message ? (
          <p role="status" className={styles.editorHint}>
            {message}
          </p>
        ) : null}

        <div className={styles.editorActions}>
          <button
            type="button"
            className="btn"
            onClick={() => onChange(NO_EDIT)}
            disabled={!isEdited(edit)}
          >
            Reset to original
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void apply()} disabled={busy}>
            {busy ? 'Applying…' : 'Apply to this page'}
          </button>
        </div>
      </div>
    </div>
  )
}
