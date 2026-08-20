import { describe, expect, it } from 'vitest'
import { validateStoryBook, type StoryBookInput } from '@/lib/schema'

function baseBook(overrides: Partial<StoryBookInput> = {}): StoryBookInput {
  return {
    id: 'test-book',
    slug: 'test-book',
    title: 'Test Book',
    authors: ['A. Author'],
    description: 'A test book.',
    language: 'en',
    cover: 'stories/test/cover.svg',
    pages: [
      { number: 1, image: 'stories/test/pages/01.svg', alt: 'A page' },
      { number: 2, image: 'stories/test/pages/02.svg', alt: 'Another page' },
    ],
    rights: { status: 'original' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('storyBookSchema', () => {
  it('accepts a well-formed book', () => {
    const result = validateStoryBook(baseBook())
    expect(result.ok).toBe(true)
    expect(result.book?.slug).toBe('test-book')
  })

  it('rejects non-English books for the initial version', () => {
    const result = validateStoryBook(baseBook({ language: 'fr' as never }))
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.path.includes('language'))).toBe(true)
  })

  it('rejects page numbers with gaps or duplicates', () => {
    const gappy = baseBook({
      pages: [
        { number: 1, image: 'stories/t/01.svg', alt: 'a' },
        { number: 3, image: 'stories/t/03.svg', alt: 'b' },
      ],
    })
    expect(validateStoryBook(gappy).ok).toBe(false)

    const duped = baseBook({
      pages: [
        { number: 1, image: 'stories/t/01.svg', alt: 'a' },
        { number: 1, image: 'stories/t/01b.svg', alt: 'b' },
      ],
    })
    expect(validateStoryBook(duped).ok).toBe(false)
  })

  it('rejects pages without alt text', () => {
    const result = validateStoryBook(
      baseBook({ pages: [{ number: 1, image: 'stories/t/01.svg', alt: '' }] }),
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a book with zero pages', () => {
    expect(validateStoryBook(baseBook({ pages: [] })).ok).toBe(false)
  })

  it('rejects malformed asset refs', () => {
    const result = validateStoryBook(baseBook({ cover: 'https://example.com/evil.png' }))
    expect(result.ok).toBe(false)
  })

  it('requires owner-permission books to carry the confirmation', () => {
    const unconfirmed = baseBook({ rights: { status: 'owner-permission' } })
    expect(validateStoryBook(unconfirmed).ok).toBe(false)

    const confirmed = baseBook({
      rights: { status: 'owner-permission', ownerPermissionConfirmed: true },
    })
    expect(validateStoryBook(confirmed).ok).toBe(true)
  })

  it('requires CC books to name their licence', () => {
    expect(validateStoryBook(baseBook({ rights: { status: 'creative-commons' } })).ok).toBe(false)
    expect(
      validateStoryBook(
        baseBook({ rights: { status: 'creative-commons', license: 'CC-BY-4.0' } }),
      ).ok,
    ).toBe(true)
  })

  it('rejects whole-book audio cues without the book audio file', () => {
    const result = validateStoryBook(
      baseBook({
        pages: [
          { number: 1, image: 'stories/t/01.svg', alt: 'a', bookAudioCue: { start: 0 } },
        ],
      }),
    )
    expect(result.ok).toBe(false)
  })

  it('flags needs-review books with a quarantine warning but still parses them', () => {
    const result = validateStoryBook(baseBook({ rights: { status: 'needs-review' } }))
    expect(result.ok).toBe(true)
    expect(result.issues.some((i) => i.message.includes('quarantined'))).toBe(true)
  })
})
