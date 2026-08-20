/**
 * Turns parsed content blocks into reader pages.
 *
 * Illustrations become picture pages so original plates get the whole screen,
 * the way they filled a page in the printed book. Prose becomes text pages,
 * paginated at paragraph boundaries so a page never starts mid-sentence.
 */

import type { Block } from './parse'

/** Roughly one comfortable phone screen of story text. */
const TARGET_CHARS = 900

/** Page labels are chapter titles; the schema keeps them short. */
const MAX_LABEL = 40
function toLabel(text: string | undefined): string | undefined {
  if (!text) return undefined
  const clean = text.trim()
  if (clean.length <= MAX_LABEL) return clean
  return `${clean.slice(0, MAX_LABEL - 1).trimEnd()}…`
}
const MAX_PARAGRAPH_CHARS = TARGET_CHARS * 1.6

export interface ComposedPage {
  number: number
  label?: string
  image?: string
  alt?: string
  text?: string
  layout?: { kind: 'picture' | 'text'; fit?: 'contain' | 'cover'; textPosition?: 'below' | 'overlay-bottom' | 'none' }
}

export interface ComposeOptions {
  title: string
  illustrators: string[]
  /** Source image path (e.g. "images/plate01.jpg") → emitted asset ref. */
  imageRefs: Map<string, string>
  /**
   * Source paths of chapter headers and tailpieces. These sit above the text
   * they decorate instead of taking a page of their own, which is how they
   * appeared in the printed book.
   */
  ornaments?: Set<string>
  targetCharsPerPage?: number
}

const GENERIC_ALT = /^(illustration|image|picture|plate|figure|photo|cover|frontispiece|decoration)\.?$/i

/**
 * Alternative text is taken from the edition itself — the illustration's own
 * alt attribute, then its caption. When the source offers neither, we state
 * what the image is rather than inventing a description of artwork we cannot
 * see; docs/accessibility.md records this limitation.
 */
export function deriveAlt(
  block: Extract<Block, { type: 'image' }>,
  title: string,
  illustrators: string[],
): string {
  const alt = block.alt?.trim()
  if (alt && alt.length >= 8 && !GENERIC_ALT.test(alt)) return alt
  const caption = block.caption?.trim()
  if (caption && caption.length >= 8) return caption
  const by = illustrators.length > 0 ? ` by ${illustrators.join(', ')}` : ''
  return `Illustration from ${title}${by}`
}

/** Hard-splits on word boundaries — the last resort for unpunctuated runs. */
function splitOnWords(text: string, budget: number): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let current = ''
  for (const word of words) {
    if (current && current.length + word.length + 1 > budget) {
      chunks.push(current)
      current = ''
    }
    current = current ? `${current} ${word}` : word
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * Splits an over-long paragraph at sentence boundaries, falling back to word
 * boundaries. Long verse and unpunctuated passages exist in these editions,
 * so this always makes progress rather than returning the input unchanged.
 */
export function splitParagraph(text: string, budget: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > budget) {
      chunks.push(current.trim())
      current = ''
    }
    // A single sentence longer than the budget still has to be broken up.
    if (sentence.length > budget) {
      if (current.trim()) chunks.push(current.trim())
      current = ''
      chunks.push(...splitOnWords(sentence.trim(), budget))
      continue
    }
    current += sentence
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter((c) => c.length > 0)
}

export function composePages(blocks: Block[], options: ComposeOptions): ComposedPage[] {
  const budget = options.targetCharsPerPage ?? TARGET_CHARS
  const pages: ComposedPage[] = []
  let buffer: string[] = []
  let bufferChars = 0
  /** Label applied to the next page emitted (chapter or tale title). */
  let pendingLabel: string | undefined

  /** A header/tailpiece waiting to be placed above the next text page. */
  let pendingOrnament: { ref: string; alt: string } | undefined

  const flushText = () => {
    if (buffer.length === 0) return
    pages.push({
      number: 0, // assigned at the end
      label: toLabel(pendingLabel),
      image: pendingOrnament?.ref,
      alt: pendingOrnament?.alt,
      text: buffer.join('\n\n'),
      layout: { kind: 'text' },
    })
    pendingLabel = undefined
    pendingOrnament = undefined
    buffer = []
    bufferChars = 0
  }

  const pushParagraph = (text: string) => {
    if (text.length > MAX_PARAGRAPH_CHARS) {
      // splitParagraph always returns pieces smaller than the input, so this
      // adds each piece directly rather than recursing.
      for (const chunk of splitParagraph(text, budget)) addChunk(chunk)
      return
    }
    addChunk(text)
  }

  const addChunk = (text: string) => {
    if (bufferChars > 0 && bufferChars + text.length > budget) flushText()
    buffer.push(text)
    bufferChars += text.length + 2
    if (bufferChars >= budget) flushText()
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      flushText()
      // Headings label the page that follows rather than occupying one alone.
      pendingLabel = block.text
      continue
    }
    if (block.type === 'paragraph') {
      pushParagraph(block.text)
      continue
    }
    const ref = options.imageRefs.get(block.src)
    if (!ref) continue
    const alt = deriveAlt(block, options.title, options.illustrators)

    // Headers and tailpieces decorate the text that follows.
    if (options.ornaments?.has(block.src)) {
      flushText()
      pendingOrnament = { ref, alt }
      continue
    }

    // A full plate gets a page of its own.
    flushText()
    pages.push({
      number: 0,
      label: toLabel(block.caption ?? pendingLabel),
      image: ref,
      alt,
      layout: { kind: 'picture', fit: 'contain', textPosition: 'none' },
    })
    pendingLabel = undefined
  }
  flushText()
  // An ornament with no text after it (a closing tailpiece) still belongs in
  // the book, on its own page.
  if (pendingOrnament) {
    pages.push({
      number: 0,
      image: pendingOrnament.ref,
      alt: pendingOrnament.alt,
      layout: { kind: 'picture', fit: 'contain', textPosition: 'none' },
    })
  }

  return pages.map((page, i) => ({ ...page, number: i + 1 }))
}

/** Rough reading-time estimate at a read-aloud pace. */
export function estimateMinutes(pages: ComposedPage[]): number {
  const words = pages.reduce((sum, p) => sum + (p.text?.split(/\s+/).length ?? 0), 0)
  const pictureTime = pages.filter((p) => p.image).length * 0.1
  return Math.max(1, Math.round(words / 160 + pictureTime))
}
