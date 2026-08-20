import { describe, expect, it } from 'vitest'
import { parseGutenbergHtml } from '../../scripts/books/parse'
import { composePages, deriveAlt, estimateMinutes } from '../../scripts/books/compose'
import { generateCoverSvg } from '../../scripts/books/cover'

/**
 * Fixture-driven tests for the public-domain book pipeline. No network: these
 * encode the source-shape lessons learned from real Gutenberg editions.
 */

const BOILERPLATE_HEAD = `<html><body>
<pre>The Project Gutenberg EBook of Something, by Someone
This eBook is for the use of anyone anywhere at no cost.
*** START OF THIS PROJECT GUTENBERG EBOOK SOMETHING ***</pre>`
const BOILERPLATE_TAIL = `<pre>*** END OF THIS PROJECT GUTENBERG EBOOK SOMETHING ***
This file should be named 12345.txt. Project Gutenberg is a registered trademark.</pre>
</body></html>`

describe('parseGutenbergHtml', () => {
  it('strips Project Gutenberg boilerplate and licence text', () => {
    const html = `${BOILERPLATE_HEAD}<p>Once upon a time there was a real story here.</p>${BOILERPLATE_TAIL}`
    const blocks = parseGutenbergHtml(html)
    const text = blocks.map((b) => (b.type === 'paragraph' ? b.text : '')).join(' ')
    expect(text).toContain('Once upon a time')
    expect(text).not.toMatch(/Project Gutenberg/i)
    expect(text).not.toMatch(/registered trademark/i)
  })

  it('reads story text out of table layouts (older picture-book editions)', () => {
    const html = `${BOILERPLATE_HEAD}
      <table><tr>
        <td><img src="images/p1.jpg" alt="A rabbit family at home" /></td>
        <td><p class="story">They lived in a sand-bank under a fir tree.</p></td>
      </tr></table>${BOILERPLATE_TAIL}`
    const blocks = parseGutenbergHtml(html)
    expect(blocks.some((b) => b.type === 'image' && b.src === 'images/p1.jpg')).toBe(true)
    expect(
      blocks.some((b) => b.type === 'paragraph' && b.text.includes('sand-bank')),
    ).toBe(true)
  })

  it('keeps illustrations that sit inside a paragraph', () => {
    const html = `${BOILERPLATE_HEAD}
      <p>Some words about the picture.<img src="images/inline.png" alt="A cat in a hat" /></p>
      ${BOILERPLATE_TAIL}`
    const blocks = parseGutenbergHtml(html)
    expect(blocks.filter((b) => b.type === 'image')).toHaveLength(1)
    expect(blocks.filter((b) => b.type === 'paragraph')).toHaveLength(1)
  })

  it('drops contents lists, imprint lines and duplicate plates', () => {
    const html = `${BOILERPLATE_HEAD}
      <h2>Contents</h2><p>Chapter One .... 1</p><p>Chapter Two .... 9</p>
      <h2>Chapter One</h2><p>The real story begins in earnest right here.</p>
      <h3>First published 1902</h3>
      <img src="images/a.jpg" alt="A plate" /><img src="images/a.jpg" alt="A plate" />
      ${BOILERPLATE_TAIL}`
    const blocks = parseGutenbergHtml(html)
    expect(blocks.filter((b) => b.type === 'image')).toHaveLength(1)
    expect(blocks.some((b) => b.type === 'heading' && b.text === 'Chapter One')).toBe(true)
    expect(blocks.some((b) => b.type === 'heading' && /First published/i.test(b.text))).toBe(false)
    expect(blocks.some((b) => b.type === 'paragraph' && b.text.includes('Chapter Two ....'))).toBe(
      false,
    )
  })
})

describe('composePages', () => {
  const imageRefs = new Map([['images/a.jpg', 'library/test/pages/001.webp']])

  it('gives each illustration its own picture page', () => {
    const pages = composePages(
      [
        { type: 'paragraph', text: 'Before the plate.' },
        { type: 'image', src: 'images/a.jpg', alt: 'A wolf at the door' },
        { type: 'paragraph', text: 'After the plate.' },
      ],
      { title: 'Test', illustrators: [], imageRefs },
    )
    expect(pages).toHaveLength(3)
    expect(pages[1]!.layout?.kind).toBe('picture')
    expect(pages[1]!.image).toBe('library/test/pages/001.webp')
    expect(pages[1]!.alt).toBe('A wolf at the door')
    expect(pages[0]!.layout?.kind).toBe('text')
  })

  it('paginates prose at paragraph boundaries within the budget', () => {
    const para = (n: number) => ({ type: 'paragraph' as const, text: `Paragraph ${n}. `.repeat(20) })
    const pages = composePages([para(1), para(2), para(3), para(4)], {
      title: 'Test',
      illustrators: [],
      imageRefs,
      targetCharsPerPage: 400,
    })
    expect(pages.length).toBeGreaterThan(1)
    for (const page of pages) {
      expect(page.layout?.kind).toBe('text')
      expect(page.text!.length).toBeLessThan(1200)
    }
  })

  it('splits a single over-long paragraph at sentence boundaries', () => {
    const long = 'This is a sentence that goes on. '.repeat(80)
    const pages = composePages([{ type: 'paragraph', text: long }], {
      title: 'Test',
      illustrators: [],
      imageRefs,
      targetCharsPerPage: 400,
    })
    expect(pages.length).toBeGreaterThan(2)
    // Sentences stay intact rather than being cut mid-word.
    for (const page of pages) expect(page.text!.trim()).toMatch(/\.$/)
  })

  it('numbers pages sequentially from one', () => {
    const pages = composePages(
      [
        { type: 'paragraph', text: 'One.' },
        { type: 'image', src: 'images/a.jpg', alt: 'Something worth seeing' },
        { type: 'paragraph', text: 'Two.' },
      ],
      { title: 'Test', illustrators: [], imageRefs },
    )
    expect(pages.map((p) => p.number)).toEqual([1, 2, 3])
  })

  it('truncates long chapter headings to a valid page label', () => {
    const heading = 'A Chapter With An Extremely Long Victorian Title That Rambles On'
    const pages = composePages(
      [
        { type: 'heading', level: 2, text: heading },
        { type: 'paragraph', text: 'Body text.' },
      ],
      { title: 'Test', illustrators: [], imageRefs },
    )
    expect(pages[0]!.label!.length).toBeLessThanOrEqual(40)
  })

  it('skips illustrations whose asset failed to encode', () => {
    const pages = composePages([{ type: 'image', src: 'images/missing.jpg', alt: 'Gone' }], {
      title: 'Test',
      illustrators: [],
      imageRefs,
    })
    expect(pages).toHaveLength(0)
  })
})

describe('deriveAlt', () => {
  const base = { type: 'image' as const, src: 'images/a.jpg' }

  it('prefers the edition’s own alt text', () => {
    expect(deriveAlt({ ...base, alt: 'Mrs. Rabbit gives Peter camomile tea' }, 'T', [])).toBe(
      'Mrs. Rabbit gives Peter camomile tea',
    )
  })

  it('falls back to the caption when alt is generic', () => {
    expect(deriveAlt({ ...base, alt: 'Illustration', caption: 'The wolf at the door' }, 'T', [])).toBe(
      'The wolf at the door',
    )
  })

  it('states what the image is rather than inventing a description', () => {
    const alt = deriveAlt(base, 'The Jungle Book', ['W. H. Drake'])
    expect(alt).toBe('Illustration from The Jungle Book by W. H. Drake')
    expect(alt.length).toBeGreaterThanOrEqual(8)
  })
})

describe('estimateMinutes', () => {
  it('scales with word count and never returns zero', () => {
    expect(estimateMinutes([{ number: 1, image: 'x', alt: 'y' }])).toBe(1)
    const long = [{ number: 1, text: 'word '.repeat(1600), layout: { kind: 'text' as const } }]
    expect(estimateMinutes(long)).toBeGreaterThan(5)
  })
})

describe('generateCoverSvg', () => {
  it('produces valid, escaped SVG with the title and author', () => {
    const svg = generateCoverSvg({
      title: 'Alice & the "Looking-Glass"',
      authors: ['Lewis Carroll'],
      slug: 'alice',
    })
    expect(svg).toContain('<svg')
    expect(svg).toContain('Lewis Carroll')
    expect(svg).toContain('&amp;')
    expect(svg).not.toContain('&"')
  })

  it('is deterministic for a given slug', () => {
    const opts = { title: 'A Book', authors: ['Someone'], slug: 'a-book' }
    expect(generateCoverSvg(opts)).toBe(generateCoverSvg(opts))
  })
})
