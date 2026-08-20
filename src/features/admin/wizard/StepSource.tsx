import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { renderPdfToImages } from '@/lib/import/pdf'
import { extractImagesFromZip, extractZipEntries } from '@/lib/import/zip'
import { importStoryPackage, StoryPackageError } from '@/lib/import/storyPackage'
import { saveImportedBook } from '@/lib/bookAdmin'
import { hashBlob } from '@/lib/imageProcessing'
import { naturalSort } from '@/lib/util'
import { newDraftPage, type Draft, type DraftPage } from './wizardTypes'
import styles from './wizard.module.css'

interface Props {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']

export default function StepSource({ draft, update }: Props) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const appendPages = async (items: { name: string; blob: Blob }[]) => {
    const existingHashes = new Map<string, number>()
    draft.pages.forEach((p, i) => {
      if (p.hash) existingHashes.set(p.hash, i + 1)
    })
    const additions: DraftPage[] = []
    let duplicates = 0
    for (const item of items) {
      const hash = await hashBlob(item.blob)
      if (existingHashes.has(hash) || additions.some((a) => a.hash === hash)) duplicates++
      additions.push(
        newDraftPage({
          imageBlob: item.blob,
          // Kept so straighten/trim always re-renders from the import.
          originalBlob: item.blob,
          previewUrl: URL.createObjectURL(item.blob),
          sourceName: item.name,
          hash,
        }),
      )
    }
    update({ pages: [...draft.pages, ...additions] })
    setNotice(
      `Added ${additions.length} page${additions.length === 1 ? '' : 's'}.` +
        (duplicates > 0
          ? ` ⚠️ ${duplicates} look like duplicates — review them in the Page order step.`
          : ''),
    )
  }

  const handleFiles = async (files: File[]) => {
    setError(undefined)
    setNotice(undefined)
    if (files.length === 0) return
    try {
      const first = files[0]!
      const lowerName = first.name.toLowerCase()

      if (files.length === 1 && lowerName.endsWith('.pdf')) {
        setBusy('Rendering PDF pages on this device…')
        const rendered = await renderPdfToImages(first, (done, total) =>
          setBusy(`Rendering PDF page ${done} of ${total}…`),
        )
        await appendPages(
          rendered.map((p) => ({
            name: `${first.name} · page ${p.pageNumber}`,
            blob: p.blob,
          })),
        )
        return
      }

      if (files.length === 1 && /\.(zip|cbz)$/.test(lowerName)) {
        setBusy('Reading archive…')
        const entries = await extractZipEntries(first)
        if (entries.has('story.json')) {
          // A complete Storytime package: import it whole.
          setBusy('Importing story package…')
          const book = await importStoryPackage(first)
          await saveImportedBook(book)
          void navigate('/admin/books')
          return
        }
        const images = await extractImagesFromZip(first)
        if (images.length === 0) {
          setError('That archive has no readable page images (JPG, PNG, WebP…).')
          return
        }
        await appendPages(images)
        return
      }

      // Loose image files (multi-select / folder selection).
      const images = files.filter(
        (f) => IMAGE_TYPES.includes(f.type) || /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(f.name),
      )
      if (images.length === 0) {
        setError('Please choose a PDF, a ZIP/CBZ of page images, image files, or a story package.')
        return
      }
      setBusy(`Preparing ${images.length} image${images.length === 1 ? '' : 's'}…`)
      const ordered = naturalSort(images, (f) => f.name)
      await appendPages(ordered.map((f) => ({ name: f.name, blob: f })))
    } catch (err) {
      if (err instanceof StoryPackageError) setError(err.message)
      else setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(undefined)
    }
  }

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    void handleFiles(Array.from(e.dataTransfer.files))
  }

  const onCover = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      update({ coverBlob: file, coverPreviewUrl: URL.createObjectURL(file) })
    }
    e.target.value = ''
  }

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-2)' }}>1 · Choose the book's files</h2>
      <p style={{ color: 'var(--color-ink-soft)', maxWidth: '65ch', marginBottom: 'var(--space-4)' }}>
        Everything is processed on this device — nothing is uploaded. Supported sources:
        a scanned <strong>PDF</strong>, a <strong>ZIP/CBZ</strong> of page images,
        individual <strong>JPG/PNG/WebP</strong> images, or a Storytime{' '}
        <strong>story package</strong> exported earlier.
      </p>

      <div
        className={`${styles.dropZone} ${dragActive ? styles.active : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <span style={{ fontSize: '2.4rem' }} aria-hidden="true">
          📥
        </span>
        <p>
          <strong>Drop files here</strong> or
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={Boolean(busy)}
        >
          Choose files…
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.zip,.cbz,image/*,application/pdf,application/zip"
          className="visually-hidden"
          aria-label="Choose book files"
          onChange={onInput}
        />
      </div>

      {busy ? (
        <p role="status" className={styles.progressNote} style={{ marginTop: 'var(--space-3)' }}>
          ⏳ {busy}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="badge badge-positive" style={{ marginTop: 'var(--space-3)' }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', fontWeight: 600, marginTop: 'var(--space-3)' }}>
          ❌ {error}
        </p>
      ) : null}

      {draft.pages.length > 0 ? (
        <p style={{ marginTop: 'var(--space-3)', fontWeight: 700 }}>
          📄 {draft.pages.length} page{draft.pages.length === 1 ? '' : 's'} ready — you can
          add more files, or continue to Details.
        </p>
      ) : null}

      <div style={{ marginTop: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>
          Cover image (optional)
        </h3>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
          Without a cover, the first page is used.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {draft.coverPreviewUrl ? (
            <img
              src={draft.coverPreviewUrl}
              alt="Chosen cover"
              style={{ width: 80, borderRadius: 8, aspectRatio: '3/4', objectFit: 'cover' }}
            />
          ) : null}
          <button type="button" className="btn" onClick={() => coverRef.current?.click()}>
            {draft.coverBlob || draft.coverRef ? 'Replace cover…' : 'Choose cover…'}
          </button>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            aria-label="Choose cover image"
            onChange={onCover}
          />
        </div>
      </div>
    </>
  )
}
