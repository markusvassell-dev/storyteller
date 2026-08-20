/**
 * Turns a Project Gutenberg HTML edition into an ordered list of content
 * blocks (headings, paragraphs, illustrations).
 *
 * Two things matter here beyond plain extraction:
 *  - Project Gutenberg's own header, footer and licence text are removed, so
 *    nothing carries their boilerplate or trademark into the app. The
 *    underlying works are public domain; the canonical PG ebook page is still
 *    recorded as each book's source.
 *  - Editorial furniture that makes no sense in a picture-book reader
 *    (contents tables, transcriber's notes, page-number anchors) is dropped.
 */

import { JSDOM } from 'jsdom'

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; src: string; alt?: string; caption?: string }

const BOILERPLATE_START = /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG/i
const BOILERPLATE_END = /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i

/** Headings that introduce front/back matter rather than story content. */
const SKIP_HEADING = /^(contents|table of contents|list of illustrations|illustrations|transcriber'?s note|index|advertisement|footnotes)/i

const SKIP_TEXT =
  /(project gutenberg|gutenberg\.org|public domain|copyright|transcriber'?s note|produced by|etext|ebook)/i

/** Imprint lines from the title page — not chapter headings. */
const TITLE_PAGE_LINE =
  /^(by|first published|printed|published|illustrated by|new york|london|frederick warne|macmillan|author of)\b/i

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/**
 * Slices the document to the story itself, dropping everything before the
 * PG start marker and after the end marker.
 */
function storyRoot(dom: JSDOM): Element {
  const body = dom.window.document.body
  const html = body.innerHTML

  const startMatch = BOILERPLATE_START.exec(html)
  const endMatch = BOILERPLATE_END.exec(html)
  if (startMatch || endMatch) {
    const from = startMatch ? startMatch.index + startMatch[0].length : 0
    const to = endMatch ? endMatch.index : html.length
    if (to > from) {
      const sliced = dom.window.document.createElement('div')
      sliced.innerHTML = html.slice(from, to)
      return sliced
    }
  }
  return body
}

export interface ParseOptions {
  /** Drop paragraphs shorter than this (page numbers, stray markers). */
  minParagraphChars?: number
}

export function parseGutenbergHtml(html: string, options: ParseOptions = {}): Block[] {
  const minParagraphChars = options.minParagraphChars ?? 2
  const dom = new JSDOM(html)
  const root = storyRoot(dom)

  // Remove elements that are never story content. Tables are deliberately
  // kept: older Gutenberg editions lay picture books out as tables, with the
  // illustration in one cell and the story text in the next.
  for (const selector of [
    'style',
    'script',
    'head',
    '.pgheader',
    '#pg-header',
    '#pg-footer',
    '.toc',
    '#toc',
    '.transcribers-note',
    '.tnote',
    'pre',
  ]) {
    for (const el of root.querySelectorAll(selector)) el.remove()
  }

  const blocks: Block[] = []
  let skippingSection = false
  // Elements already consumed, so nested markup is not emitted twice.
  const consumed = new Set<Element>()

  const isConsumed = (el: Element): boolean => {
    for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
      if (consumed.has(node)) return true
    }
    return false
  }

  // Walking in document order keeps illustrations interleaved with the prose
  // exactly as the edition had them, whatever markup holds them.
  for (const el of Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,img'))) {
    const tag = el.tagName.toLowerCase()
    // Illustrations are collected wherever they sit — many editions wrap them
    // in the same paragraph as the prose, so an already-consumed ancestor
    // must not hide the artwork.
    if (tag !== 'img' && isConsumed(el)) continue

    if (tag === 'img') {
      const src = el.getAttribute('src') ?? ''
      if (!src.startsWith('images/')) continue
      const alt = cleanText(el.getAttribute('alt') ?? '')
      const title = cleanText(el.getAttribute('title') ?? '')
      blocks.push({
        type: 'image',
        src,
        alt: alt || title || undefined,
        caption: title && title !== alt ? title : undefined,
      })
      continue
    }

    if (/^h[1-6]$/.test(tag)) {
      const text = cleanText(el.textContent ?? '')
      consumed.add(el)
      if (!text) continue
      // A front-matter heading suppresses everything until the next heading.
      skippingSection = SKIP_HEADING.test(text)
      if (skippingSection) continue
      // Title-page and imprint lines are not chapter headings.
      if (SKIP_TEXT.test(text) || TITLE_PAGE_LINE.test(text)) continue
      blocks.push({ type: 'heading', level: Number(tag[1]), text })
      continue
    }

    // p / blockquote
    consumed.add(el)
    if (skippingSection) continue
    const text = cleanText(el.textContent ?? '')
    if (text.length < minParagraphChars) continue
    if (text.length < 120 && SKIP_TEXT.test(text)) continue
    blocks.push({ type: 'paragraph', text })
  }

  return dedupeImages(blocks)
}

/** The same plate is often referenced twice (thumbnail + full size). */
function dedupeImages(blocks: Block[]): Block[] {
  const seen = new Set<string>()
  return blocks.filter((b) => {
    if (b.type !== 'image') return true
    if (seen.has(b.src)) return false
    seen.add(b.src)
    return true
  })
}
