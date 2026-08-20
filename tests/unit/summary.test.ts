import { describe, expect, it } from 'vitest'
import {
  builtinIndexSchema,
  summarize,
  validateStoryBook,
  type StoryBookInput,
} from '@/lib/schema'

function book(overrides: Partial<StoryBookInput> = {}) {
  const result = validateStoryBook({
    id: 'b1',
    slug: 'b1',
    title: 'A Book',
    authors: ['Someone'],
    description: 'Desc',
    language: 'en',
    cover: 'library/b1/cover.webp',
    pages: [
      { number: 1, image: 'library/b1/pages/001.webp', alt: 'A picture of something' },
      { number: 2, text: 'Some prose.', layout: { kind: 'text' } },
    ],
    rights: { status: 'public-domain', publicDomainBasis: 'Published 1890' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } satisfies StoryBookInput)
  if (!result.ok || !result.book) {
    throw new Error(`fixture invalid: ${result.issues.map((i) => i.message).join('; ')}`)
  }
  return result.book
}

describe('text pages', () => {
  it('allows a page with prose and no image', () => {
    expect(book().pages[1]!.image).toBeUndefined()
  })

  it('rejects a text page with no text', () => {
    const result = validateStoryBook({
      ...book(),
      pages: [{ number: 1, layout: { kind: 'text' } }],
    })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => /text pages need text/i.test(i.message))).toBe(true)
  })

  it('rejects a picture page with no image', () => {
    const result = validateStoryBook({
      ...book(),
      pages: [{ number: 1, text: 'words but no picture' }],
    })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => /picture pages need an image/i.test(i.message))).toBe(true)
  })

  it('still requires alt text whenever there is an image', () => {
    const result = validateStoryBook({
      ...book(),
      pages: [{ number: 1, image: 'library/b1/pages/001.webp' }],
    })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => /alternative text/i.test(i.message))).toBe(true)
  })
})

describe('asset refs', () => {
  it('accepts the three known tiers', () => {
    for (const cover of ['stories/x/c.svg', 'library/x/c.webp', 'idb:abc']) {
      expect(validateStoryBook({ ...book(), cover }).ok).toBe(true)
    }
  })

  it('rejects remote URLs', () => {
    expect(validateStoryBook({ ...book(), cover: 'https://example.com/x.png' }).ok).toBe(false)
  })
})

describe('summarize', () => {
  it('carries what the shelves need without the pages', () => {
    const summary = summarize(book(), 'library/b1/story.json')
    expect(summary.pageCount).toBe(2)
    expect(summary.hasRecordedNarration).toBe(false)
    expect(summary.rightsStatus).toBe('public-domain')
    expect(summary.path).toBe('library/b1/story.json')
    expect('pages' in summary).toBe(false)
  })

  it('flags recorded narration from per-page audio', () => {
    const withAudio = book({
      pages: [
        {
          number: 1,
          image: 'library/b1/pages/001.webp',
          alt: 'A picture of something',
          audio: 'library/b1/audio/01.mp3',
        },
      ],
    })
    expect(summarize(withAudio, 'p').hasRecordedNarration).toBe(true)
  })

  it('produces index entries that validate as a v2 index', () => {
    const index = { version: 2, books: [summarize(book(), 'library/b1/story.json')] }
    expect(builtinIndexSchema.safeParse(index).success).toBe(true)
  })

  it('rejects a v1 index', () => {
    const legacy = { version: 1, books: ['stories/a/story.json'] }
    expect(builtinIndexSchema.safeParse(legacy).success).toBe(false)
  })
})
