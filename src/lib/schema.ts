import { z } from 'zod'

/**
 * Storytime Library story-package schema.
 *
 * This is the single source of truth for what a valid book looks like. The
 * admin importer, the built-in library loader, the backup format and the
 * build-time rights audit all validate against these schemas. A malformed
 * book fails validation loudly rather than silently appearing in the library.
 */

/**
 * Asset references are either built-in static paths or IndexedDB blob ids.
 *  - "stories/…" — the original demo collection (precached with the app)
 *  - "library/…" — fetched public-domain classics (cached on first read)
 *  - "idb:…"     — privately imported books, stored on the device only
 */
export const assetRefSchema = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith('stories/') || v.startsWith('library/') || v.startsWith('idb:'),
    {
      message:
        'Asset ref must start with "stories/", "library/" (built-in) or "idb:" (imported)',
    },
  )
export type AssetRef = z.infer<typeof assetRefSchema>

export const focalPointSchema = z.object({
  /** 0..1 from left edge */
  x: z.number().min(0).max(1),
  /** 0..1 from top edge */
  y: z.number().min(0).max(1),
})

/** A single narration timing cue within whole-book audio. */
export const audioCueSchema = z.object({
  /** Seconds from the start of the whole-book audio file. */
  start: z.number().min(0),
  end: z.number().min(0).optional(),
})

/** Optional word/line-level timing for caption highlighting. */
export const textTimingSchema = z.object({
  text: z.string(),
  start: z.number().min(0),
  end: z.number().min(0).optional(),
})

export const pageSchema = z.object({
  /** 1-based page number; must be unique and sequential within a book. */
  number: z.number().int().min(1),
  /** Optional display label, e.g. "Cover", "3–4". */
  label: z.string().max(40).optional(),
  /**
   * Illustration or rendered page image. Required on picture pages; optional
   * on text pages (a chapter of prose needs no artwork of its own).
   */
  image: assetRefSchema.optional(),
  /** Alternative text describing the illustration. Required whenever there is an image. */
  alt: z.string().min(1, 'Every illustration needs alternative text').optional(),
  /** Printed text shown on/under the page, if any. */
  text: z.string().optional(),
  /** Text spoken by device TTS; falls back to `text` when absent. */
  narrationText: z.string().optional(),
  /** Per-page prerecorded audio. */
  audio: assetRefSchema.optional(),
  audioDuration: z.number().min(0).optional(),
  /** Cue into whole-book audio (bookAudio) for this page. */
  bookAudioCue: audioCueSchema.optional(),
  /** Caption/highlight timing within this page's narration. */
  textTiming: z.array(textTimingSchema).optional(),
  /** Focal point used only when cropping is deliberately enabled. */
  focalPoint: focalPointSchema.optional(),
  layout: z
    .object({
      /**
       * 'picture' — artwork leads, text sits in a panel (picture books).
       * 'text'    — prose leads and fills the page, with an optional
       *             illustration above it (chapter books and story
       *             collections, where a capped text panel would be unreadable).
       */
      kind: z.enum(['picture', 'text']).default('picture'),
      /** 'contain' (default, never crops) or 'cover' (uses focalPoint). */
      fit: z.enum(['contain', 'cover']).default('contain'),
      /** Where the text panel sits relative to the artwork. */
      textPosition: z.enum(['below', 'overlay-bottom', 'none']).default('below'),
    })
    .optional(),
  attribution: z.string().optional(),
})
  .superRefine((page, ctx) => {
    const isTextPage = page.layout?.kind === 'text'
    if (!isTextPage && !page.image) {
      ctx.addIssue({
        code: 'custom',
        path: ['image'],
        message: `Page ${page.number}: picture pages need an image (or layout.kind "text")`,
      })
    }
    if (isTextPage && !page.text?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['text'],
        message: `Page ${page.number}: text pages need text`,
      })
    }
    if (page.image && !page.alt?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['alt'],
        message: `Page ${page.number}: every illustration needs alternative text`,
      })
    }
  })
export type StoryPage = z.infer<typeof pageSchema>

export const narrationSchema = z.object({
  /** Whole-book audio file, used with per-page `bookAudioCue`s. */
  bookAudio: assetRefSchema.optional(),
  bookAudioDuration: z.number().min(0).optional(),
  /** Human-readable description, e.g. "Read by Grandma", "Synthetic voice". */
  voiceLabel: z.string().optional(),
  /** True when the audio is machine-generated (must be disclosed in UI). */
  synthetic: z.boolean().optional(),
  /** Advance to the next page automatically when its narration ends. */
  autoAdvance: z.boolean().default(false),
})

export const RIGHTS_STATUSES = [
  'public-domain',
  'creative-commons',
  'owner-permission',
  'original',
  'needs-review',
] as const

export const rightsSchema = z.object({
  status: z.enum(RIGHTS_STATUSES),
  /** Licence id when applicable, e.g. "CC-BY-4.0", "OFL-1.1". */
  license: z.string().optional(),
  /** Basis for a public-domain claim, e.g. "US: published before 1930". */
  publicDomainBasis: z.string().optional(),
  /** Where the files came from (publisher, personal scan, URL…). */
  sourceOfFiles: z.string().optional(),
  sourceUrl: z.url().optional(),
  sourceOrganization: z.string().optional(),
  /** Required attribution text, when the licence demands one. */
  attributionRequired: z.string().optional(),
  /** Owner's explicit confirmation for privately supplied material. */
  ownerPermissionConfirmed: z.boolean().optional(),
  /** May this material ever be stored on a remote server? */
  remoteStorageAllowed: z.boolean().default(false),
  /** Restricted to personal use (never redistribute). */
  personalUseOnly: z.boolean().default(true),
  modificationAllowed: z.boolean().optional(),
  commercialUseAllowed: z.boolean().optional(),
  regionalRestrictions: z.string().optional(),
  notes: z.string().optional(),
})
export type RightsRecord = z.infer<typeof rightsSchema>

export const CATEGORIES = [
  'robert-munsch',
  'fairy-tales',
  'brothers-grimm',
  'folk-tales',
  'bedtime',
  'short-reads',
  'classics',
  'animals',
  'adventure',
  'funny',
] as const
export type CategoryId = (typeof CATEGORIES)[number] | (string & {})

export const AGE_RANGES = ['0-3', '3-5', '4-8', '6-10', 'all-ages'] as const
export const READING_LEVELS = ['pre-reader', 'early-reader', 'independent'] as const

export const storyBookSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    authors: z.array(z.string().min(1)).min(1, 'At least one author is required'),
    illustrators: z.array(z.string()).default([]),
    translators: z.array(z.string()).default([]),
    description: z.string().default(''),
    /** English-only for the initial version; field retained for the future. */
    language: z.literal('en'),
    ageRange: z.enum(AGE_RANGES).default('all-ages'),
    readingLevel: z.enum(READING_LEVELS).optional(),
    // Full-length classics run to many hours of reading aloud.
    estimatedMinutes: z.number().int().min(1).max(10000).optional(),
    categories: z.array(z.string().min(1)).default([]),
    tags: z.array(z.string()).default([]),
    cover: assetRefSchema,
    thumbnail: assetRefSchema.optional(),
    pages: z.array(pageSchema).min(1, 'A book needs at least one page'),
    narration: narrationSchema.optional(),
    rights: rightsSchema,
    /** Free-text provenance summary shown on the details screen. */
    source: z.string().optional(),
    attribution: z.string().optional(),
    /**
     * Note about period content a grown-up should know before sharing the
     * book — racial caricature, frightening scenes and the like. Separate
     * from `rights`, which is only about who may copy the work.
     */
    contentAdvisory: z.string().optional(),
    /**
     * True when the owner has read the advisory and chosen to show the book
     * anyway. Without it a book carrying an advisory must stay hidden, so new
     * period content cannot reach the library before anyone has looked at it.
     */
    advisoryAcknowledged: z.boolean().optional(),
    rightsCheckedAt: z.iso.datetime({ offset: true }).optional(),
    storageLocation: z.enum(['builtin', 'local']).default('local'),
    offlineStatus: z
      .enum(['available', 'downloading', 'importing', 'processing', 'online-only', 'missing-assets'])
      .default('available'),
    featured: z.boolean().default(false),
    hidden: z.boolean().default(false),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((book, ctx) => {
    // Pages must be sequential 1..n with no gaps or duplicates.
    const numbers = book.pages.map((p) => p.number)
    const expected = Array.from({ length: numbers.length }, (_, i) => i + 1)
    if (!numbers.every((n, i) => n === expected[i])) {
      ctx.addIssue({
        code: 'custom',
        path: ['pages'],
        message: `Page numbers must run 1..${numbers.length} in order (got ${numbers.join(', ')})`,
      })
    }
    // Whole-book audio requires cues; cues require whole-book audio.
    const hasCues = book.pages.some((p) => p.bookAudioCue)
    if (hasCues && !book.narration?.bookAudio) {
      ctx.addIssue({
        code: 'custom',
        path: ['narration'],
        message: 'Pages reference whole-book audio cues but narration.bookAudio is missing',
      })
    }
    // Rights coherence: owner-permission requires explicit confirmation.
    if (book.rights.status === 'owner-permission' && !book.rights.ownerPermissionConfirmed) {
      ctx.addIssue({
        code: 'custom',
        path: ['rights', 'ownerPermissionConfirmed'],
        message:
          'Books supplied under owner permission need the permission confirmation checked',
      })
    }
    if (book.rights.status === 'creative-commons' && !book.rights.license) {
      ctx.addIssue({
        code: 'custom',
        path: ['rights', 'license'],
        message: 'Creative-Commons books must name the licence (e.g. CC-BY-4.0)',
      })
    }
  })

export type StoryBook = z.infer<typeof storyBookSchema>
export type StoryBookInput = z.input<typeof storyBookSchema>

/**
 * Lightweight summary of a book — everything the shelves, search and filters
 * need, without its pages. The library index carries these so opening the app
 * costs one small request instead of downloading every book; the full
 * `StoryBook` is fetched only when a book is actually opened.
 */
export const bookSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  /** Path to the full story.json, relative to the site root. */
  path: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  authors: z.array(z.string()).min(1),
  illustrators: z.array(z.string()).default([]),
  translators: z.array(z.string()).default([]),
  description: z.string().default(''),
  language: z.literal('en'),
  ageRange: z.enum(AGE_RANGES).default('all-ages'),
  readingLevel: z.enum(READING_LEVELS).optional(),
  estimatedMinutes: z.number().int().min(1).max(10000).optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  cover: assetRefSchema,
  thumbnail: assetRefSchema.optional(),
  /** Page count, so filters and cards need not load the pages. */
  pageCount: z.number().int().min(1),
  /** True when the book ships prerecorded narration (per-page or whole-book). */
  hasRecordedNarration: z.boolean().default(false),
  rightsStatus: z.enum(RIGHTS_STATUSES),
  contentAdvisory: z.string().optional(),
  source: z.string().optional(),
  attribution: z.string().optional(),
  featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})
export type BookSummary = z.infer<typeof bookSummarySchema>

/** The manifest listing every book that ships with the app. */
export const builtinIndexSchema = z.object({
  version: z.literal(2),
  books: z.array(bookSummarySchema),
})

/** Derives the index entry for a full book. */
export function summarize(book: StoryBook, path: string): BookSummary {
  return {
    id: book.id,
    slug: book.slug,
    path,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    illustrators: book.illustrators,
    translators: book.translators,
    description: book.description,
    language: book.language,
    ageRange: book.ageRange,
    readingLevel: book.readingLevel,
    estimatedMinutes: book.estimatedMinutes,
    categories: book.categories,
    tags: book.tags,
    cover: book.cover,
    thumbnail: book.thumbnail,
    pageCount: book.pages.length,
    hasRecordedNarration: Boolean(
      book.narration?.bookAudio || book.pages.some((p) => p.audio),
    ),
    rightsStatus: book.rights.status,
    contentAdvisory: book.contentAdvisory,
    source: book.source,
    attribution: book.attribution,
    featured: book.featured,
    hidden: book.hidden,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  }
}

/** Library backup archive manifest (inside the exported ZIP). */
export const backupManifestSchema = z.object({
  format: z.literal('storytime-backup'),
  version: z.literal(1),
  exportedAt: z.iso.datetime({ offset: true }),
  appVersion: z.string(),
  encrypted: z.boolean().default(false),
  books: z.array(z.object({ id: z.string(), slug: z.string(), title: z.string() })),
  /** Per-book user state (progress, favourites) keyed by book id. */
  bookState: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})
export type BackupManifest = z.infer<typeof backupManifestSchema>

/** Result shape shared by importer + integrity checker. */
export interface ValidationIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export function validateStoryBook(data: unknown): {
  ok: boolean
  book?: StoryBook
  issues: ValidationIssue[]
} {
  const parsed = storyBookSchema.safeParse(data)
  if (parsed.success) {
    const issues: ValidationIssue[] = []
    const book = parsed.data
    // Non-fatal quality warnings.
    if (!book.description) {
      issues.push({ path: 'description', message: 'Description is empty', severity: 'warning' })
    }
    if (book.rights.status === 'needs-review') {
      issues.push({
        path: 'rights.status',
        message: 'Rights are marked needs-review; the book stays quarantined until resolved',
        severity: 'warning',
      })
    }
    // A picture page with no words is normal in an illustrated book, so this
    // is only worth flagging when a book has no readable text at all — that
    // is the case where read-aloud has nothing to say.
    const hasAnyText = book.pages.some((p) => p.text?.trim() || p.narrationText?.trim())
    if (!hasAnyText) {
      issues.push({
        path: 'pages',
        message: 'No page has text — device read-aloud will have nothing to say',
        severity: 'warning',
      })
    }
    return { ok: true, book, issues }
  }
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      severity: 'error' as const,
    })),
  }
}
