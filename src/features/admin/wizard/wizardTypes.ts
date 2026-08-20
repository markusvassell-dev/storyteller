import type { RightsRecord, StoryBook } from '@/lib/schema'
import type { PageEdit } from '@/lib/imageEditing'
import { getAssetBlob } from '@/lib/assets'
import { uid } from '@/lib/util'

/** Working state for the add/edit-book wizard. */

export interface DraftPage {
  key: string
  /** Newly imported image bytes (takes precedence over imageRef). */
  imageBlob?: Blob
  /** Existing stored ref (editing an already-saved book). */
  imageRef?: string
  /** Preview URL for whichever image source is active. */
  previewUrl?: string
  sourceName?: string
  hash?: string
  /**
   * The untouched imported bytes. Kept so straighten/trim edits always
   * re-render from the photograph rather than compounding, and so "reset"
   * can always get the original back.
   */
  originalBlob?: Blob
  /** Current straighten/trim settings, for redisplay in the editor. */
  edit?: PageEdit
  alt: string
  text: string
  narrationText: string
  audioBlob?: Blob
  audioRef?: string
  audioName?: string
  audioDuration?: number
  cueStart?: number
  cueEnd?: number
}

export interface DraftRights extends RightsRecord {
  status: RightsRecord['status']
}

export interface Draft {
  /** Present when editing an existing book (keeps identity + progress). */
  id?: string
  originalBook?: StoryBook
  title: string
  subtitle: string
  authors: string
  illustrators: string
  translators: string
  description: string
  ageRange: StoryBook['ageRange']
  readingLevel: '' | NonNullable<StoryBook['readingLevel']>
  estimatedMinutes: string
  categories: string[]
  tags: string
  coverBlob?: Blob
  coverRef?: string
  coverPreviewUrl?: string
  pages: DraftPage[]
  useBookAudio: boolean
  bookAudioBlob?: Blob
  bookAudioRef?: string
  bookAudioName?: string
  bookAudioDuration?: number
  voiceLabel: string
  synthetic: boolean
  autoAdvance: boolean
  rights: DraftRights
  source: string
  attribution: string
  hidden: boolean
}

export function emptyDraft(): Draft {
  return {
    title: '',
    subtitle: '',
    authors: '',
    illustrators: '',
    translators: '',
    description: '',
    ageRange: 'all-ages',
    readingLevel: '',
    estimatedMinutes: '',
    categories: [],
    tags: '',
    pages: [],
    useBookAudio: false,
    voiceLabel: '',
    synthetic: false,
    autoAdvance: false,
    rights: {
      status: 'owner-permission',
      remoteStorageAllowed: false,
      personalUseOnly: true,
      ownerPermissionConfirmed: false,
    },
    source: '',
    attribution: '',
    hidden: false,
  }
}

export function newDraftPage(partial: Partial<DraftPage> = {}): DraftPage {
  return {
    key: uid(),
    alt: '',
    text: '',
    narrationText: '',
    ...partial,
  }
}

function listToString(list: string[] | undefined): string {
  return (list ?? []).join(', ')
}

export function stringToList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Builds an editable draft from an existing book (blobs stay in storage). */
export async function draftFromBook(book: StoryBook): Promise<Draft> {
  const pages: DraftPage[] = book.pages.map((p) =>
    newDraftPage({
      imageRef: p.image,
      alt: p.alt,
      text: p.text ?? '',
      narrationText: p.narrationText ?? '',
      audioRef: p.audio,
      audioDuration: p.audioDuration,
      cueStart: p.bookAudioCue?.start,
      cueEnd: p.bookAudioCue?.end,
    }),
  )
  return {
    ...emptyDraft(),
    id: book.id,
    originalBook: book,
    title: book.title,
    subtitle: book.subtitle ?? '',
    authors: listToString(book.authors),
    illustrators: listToString(book.illustrators),
    translators: listToString(book.translators),
    description: book.description,
    ageRange: book.ageRange,
    readingLevel: book.readingLevel ?? '',
    estimatedMinutes: book.estimatedMinutes ? String(book.estimatedMinutes) : '',
    categories: [...book.categories],
    tags: listToString(book.tags),
    coverRef: book.cover,
    pages,
    useBookAudio: Boolean(book.narration?.bookAudio),
    bookAudioRef: book.narration?.bookAudio,
    bookAudioDuration: book.narration?.bookAudioDuration,
    voiceLabel: book.narration?.voiceLabel ?? '',
    synthetic: book.narration?.synthetic ?? false,
    autoAdvance: book.narration?.autoAdvance ?? false,
    rights: { ...book.rights },
    source: book.source ?? '',
    attribution: book.attribution ?? '',
    hidden: book.hidden,
  }
}

/** Collects every idb: ref used by a book (for cleanup after edits). */
export function collectIdbRefs(book: StoryBook): Set<string> {
  const refs = new Set<string>()
  const add = (r?: string) => {
    if (r?.startsWith('idb:')) refs.add(r)
  }
  add(book.cover)
  add(book.thumbnail)
  add(book.narration?.bookAudio)
  for (const p of book.pages) {
    add(p.image)
    add(p.audio)
  }
  return refs
}

/** Resolve a draft page's current image bytes regardless of source. */
export async function draftPageBlob(page: DraftPage): Promise<Blob | undefined> {
  if (page.imageBlob) return page.imageBlob
  if (page.imageRef) return await getAssetBlob(page.imageRef)
  return undefined
}
