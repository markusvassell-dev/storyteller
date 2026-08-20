import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAllLibraryBooks } from '@/lib/library'
import { saveAsset } from '@/lib/assets'
import { db } from '@/lib/db'
import { makeThumbnail, normaliseImage } from '@/lib/imageProcessing'
import { saveImportedBook, uniqueSlug, BookValidationError } from '@/lib/bookAdmin'
import { validateStoryBook, type StoryBook, type ValidationIssue } from '@/lib/schema'
import { nowIso, uid } from '@/lib/util'
import {
  collectIdbRefs,
  draftFromBook,
  emptyDraft,
  stringToList,
  type Draft,
} from './wizardTypes'
import StepSource from './StepSource'
import StepMetadata from './StepMetadata'
import StepPages from './StepPages'
import StepText from './StepText'
import StepNarration from './StepNarration'
import StepRights from './StepRights'
import StepPreview from './StepPreview'
import styles from './wizard.module.css'

const STEPS = [
  { id: 'source', label: 'Files' },
  { id: 'metadata', label: 'Details' },
  { id: 'pages', label: 'Page order' },
  { id: 'text', label: 'Page text' },
  { id: 'narration', label: 'Narration' },
  { id: 'rights', label: 'Rights' },
  { id: 'preview', label: 'Preview' },
  { id: 'save', label: 'Save' },
] as const

type StepId = (typeof STEPS)[number]['id']

export default function BookWizard() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const { books, loading } = useAllLibraryBooks()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [step, setStep] = useState<StepId>('source')
  const [loadingDraft, setLoadingDraft] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const loadedRef = useRef(false)

  // Load an existing book into the draft when editing.
  useEffect(() => {
    if (!editId || loadedRef.current || loading) return
    const entry = books.find((b) => b.book.id === editId)
    if (!entry) {
      setLoadingDraft(false)
      return
    }
    loadedRef.current = true
    void draftFromBook(entry.book).then((d) => {
      setDraft(d)
      setStep('metadata')
      setLoadingDraft(false)
    })
  }, [editId, books, loading])

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
  }, [])

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const stepBlockers = useMemo((): string[] => {
    switch (step) {
      case 'source':
        return draft.pages.length === 0 ? ['Add at least one page image, PDF or package first.'] : []
      case 'metadata': {
        const out: string[] = []
        if (!draft.title.trim()) out.push('The book needs a title.')
        if (stringToList(draft.authors).length === 0) out.push('Name at least one author.')
        return out
      }
      case 'text':
        return draft.pages.some((p) => !p.alt.trim())
          ? ['Every page needs alternative text (a short description of the picture).']
          : []
      case 'rights': {
        const out: string[] = []
        if (draft.rights.status === 'owner-permission' && !draft.rights.ownerPermissionConfirmed) {
          out.push('Confirm that you have permission to use this material.')
        }
        if (draft.rights.status === 'creative-commons' && !draft.rights.license?.trim()) {
          out.push('Name the Creative Commons licence (e.g. CC-BY-4.0).')
        }
        return out
      }
      default:
        return []
    }
  }, [step, draft])

  /** Assemble the StoryBook (without persisting new blobs) for validation/preview. */
  const buildCandidate = useCallback(
    (refs?: Map<string, string>): StoryBook => {
      const bookId = draft.id ?? uid()
      const get = (key: string, fallback?: string) => refs?.get(key) ?? fallback ?? `idb:pending-${key}`
      const pages = draft.pages.map((p, i) => ({
        number: i + 1,
        image: p.imageBlob ? get(`page-${p.key}`, p.imageRef) : (p.imageRef ?? get(`page-${p.key}`)),
        alt: p.alt.trim(),
        text: p.text.trim() || undefined,
        narrationText: p.narrationText.trim() || undefined,
        audio: p.audioBlob ? get(`audio-${p.key}`, p.audioRef) : p.audioRef,
        audioDuration: p.audioDuration,
        bookAudioCue:
          draft.useBookAudio && p.cueStart !== undefined
            ? { start: p.cueStart, end: p.cueEnd }
            : undefined,
      }))
      const hasNarration =
        draft.useBookAudio || pages.some((p) => p.audio) || draft.voiceLabel.trim() !== ''
      return {
        id: bookId,
        slug: draft.originalBook?.slug ?? 'pending-slug',
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim() || undefined,
        authors: stringToList(draft.authors),
        illustrators: stringToList(draft.illustrators),
        translators: stringToList(draft.translators),
        description: draft.description.trim(),
        language: 'en',
        ageRange: draft.ageRange,
        readingLevel: draft.readingLevel || undefined,
        estimatedMinutes: draft.estimatedMinutes
          ? Math.max(1, Math.round(Number(draft.estimatedMinutes)))
          : undefined,
        categories: draft.categories,
        tags: stringToList(draft.tags),
        cover: draft.coverBlob
          ? get('cover', draft.coverRef)
          : (draft.coverRef ?? pages[0]?.image ?? get('cover')),
        thumbnail: refs?.get('thumbnail') ?? draft.originalBook?.thumbnail,
        pages,
        narration: hasNarration
          ? {
              bookAudio: draft.useBookAudio
                ? draft.bookAudioBlob
                  ? get('book-audio', draft.bookAudioRef)
                  : draft.bookAudioRef
                : undefined,
              bookAudioDuration: draft.useBookAudio ? draft.bookAudioDuration : undefined,
              voiceLabel: draft.voiceLabel.trim() || undefined,
              synthetic: draft.synthetic || undefined,
              autoAdvance: draft.autoAdvance,
            }
          : undefined,
        rights: {
          ...draft.rights,
          license: draft.rights.license?.trim() || undefined,
          sourceUrl: draft.rights.sourceUrl?.trim() || undefined,
        },
        source: draft.source.trim() || undefined,
        attribution: draft.attribution.trim() || undefined,
        rightsCheckedAt: nowIso(),
        storageLocation: 'local',
        offlineStatus: 'available',
        featured: draft.originalBook?.featured ?? false,
        hidden: draft.hidden,
        createdAt: draft.originalBook?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
    },
    [draft],
  )

  // Validate whenever the preview step is entered.
  useEffect(() => {
    if (step !== 'preview' && step !== 'save') return
    const result = validateStoryBook({
      ...buildCandidate(),
      slug: draft.originalBook?.slug ?? 'preview-slug',
    })
    setIssues(result.issues)
  }, [step, buildCandidate, draft.originalBook])

  const errors = issues.filter((i) => i.severity === 'error')

  const doSave = async () => {
    setSaving(true)
    setSaveError(undefined)
    try {
      const bookId = draft.id ?? uid()
      const refs = new Map<string, string>()

      // Persist new blobs.
      for (const p of draft.pages) {
        if (p.imageBlob) {
          const processed = await normaliseImage(p.imageBlob)
          refs.set(
            `page-${p.key}`,
            await saveAsset({
              bookId,
              kind: 'image',
              blob: processed.blob,
              width: processed.width || undefined,
              height: processed.height || undefined,
            }),
          )
        }
        if (p.audioBlob) {
          refs.set(`audio-${p.key}`, await saveAsset({ bookId, kind: 'audio', blob: p.audioBlob }))
        }
      }
      if (draft.coverBlob) {
        const processed = await normaliseImage(draft.coverBlob)
        refs.set('cover', await saveAsset({ bookId, kind: 'cover', blob: processed.blob }))
      }
      // Thumbnail from the cover (or first page).
      const thumbSource =
        draft.coverBlob ??
        (draft.pages[0]?.imageBlob ? draft.pages[0].imageBlob : undefined)
      if (thumbSource) {
        const thumb = await makeThumbnail(thumbSource)
        refs.set('thumbnail', await saveAsset({ bookId, kind: 'thumbnail', blob: thumb.blob }))
      }
      if (draft.useBookAudio && draft.bookAudioBlob) {
        refs.set(
          'book-audio',
          await saveAsset({ bookId, kind: 'audio', blob: draft.bookAudioBlob }),
        )
      }

      const candidate: StoryBook = {
        ...buildCandidate(refs),
        id: bookId,
        slug:
          draft.originalBook?.slug && draft.id
            ? draft.originalBook.slug
            : await uniqueSlug(draft.title),
      }

      await saveImportedBook(candidate)

      // Clean up stored blobs the edit no longer references.
      if (draft.originalBook) {
        const oldRefs = collectIdbRefs(draft.originalBook)
        const newRefs = collectIdbRefs(candidate)
        for (const ref of oldRefs) {
          if (!newRefs.has(ref)) await db.assets.delete(ref.slice(4))
        }
      }

      void navigate('/admin/books')
    } catch (err) {
      if (err instanceof BookValidationError) {
        setSaveError(err.issues.map((i) => `${i.path}: ${i.message}`).join('\n'))
      } else {
        setSaveError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loadingDraft) return <p role="status">Opening the book for editing…</p>
  if (editId && !loadedRef.current && !loading) {
    return (
      <p role="alert">
        Book not found. <Link to="/admin/books">Back to books</Link>
      </p>
    )
  }

  return (
    <>
      <h1 style={{ marginBottom: 'var(--space-3)' }}>
        {draft.id ? `Edit “${draft.title || 'book'}”` : 'Add a book'}
      </h1>

      <ol className={styles.stepper} aria-label="Wizard steps">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={styles.stepBtn}
              aria-current={s.id === step ? 'step' : undefined}
              disabled={i > stepIndex && stepBlockers.length > 0}
              onClick={() => setStep(s.id)}
            >
              <span className={styles.stepNum} aria-hidden="true">
                {i + 1}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className={styles.stepBody}>
        {step === 'source' && <StepSource draft={draft} update={update} />}
        {step === 'metadata' && <StepMetadata draft={draft} update={update} />}
        {step === 'pages' && <StepPages draft={draft} update={update} />}
        {step === 'text' && <StepText draft={draft} update={update} />}
        {step === 'narration' && <StepNarration draft={draft} update={update} />}
        {step === 'rights' && <StepRights draft={draft} update={update} />}
        {(step === 'preview' || step === 'save') && (
          <StepPreview draft={draft} issues={issues} />
        )}
      </div>

      {stepBlockers.length > 0 ? (
        <ul role="alert" className={styles.blockers}>
          {stepBlockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      {saveError ? (
        <p role="alert" className={styles.blockers} style={{ whiteSpace: 'pre-wrap' }}>
          {saveError}
        </p>
      ) : null}

      <div className={styles.wizardNav}>
        <button
          type="button"
          className="btn"
          onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)]!.id)}
          disabled={stepIndex === 0 || saving}
        >
          ← Back
        </button>
        <Link to="/admin/books" className="btn btn-outline">
          Cancel
        </Link>
        {step === 'save' || step === 'preview' ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => void doSave()}
            disabled={saving || errors.length > 0 || stepBlockers.length > 0}
          >
            {saving
              ? 'Saving…'
              : draft.rights.status === 'needs-review'
                ? 'Save to rights review'
                : draft.id
                  ? 'Save changes'
                  : 'Add to library'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]!.id)}
            disabled={stepBlockers.length > 0 || saving}
          >
            Next →
          </button>
        )}
      </div>
    </>
  )
}
