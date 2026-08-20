/**
 * Image normalisation for fetched books. Original scans and plates arrive as
 * JPEG/PNG/GIF at print resolution; the reader wants efficient, screen-sized
 * WebP so a large library stays small enough to ship and quick on a phone.
 */

import sharp from 'sharp'

const PAGE_MAX_EDGE = 1600
const THUMB_MAX_EDGE = 400
const QUALITY = 82

export interface EncodedImage {
  data: Buffer
  width: number
  height: number
}

export async function toWebp(
  input: Buffer,
  maxEdge = PAGE_MAX_EDGE,
  quality = QUALITY,
): Promise<EncodedImage | undefined> {
  try {
    const pipeline = sharp(input, { animated: false }).rotate()
    const meta = await pipeline.metadata()
    const needsResize = Math.max(meta.width ?? 0, meta.height ?? 0) > maxEdge
    const resized = needsResize
      ? pipeline.resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      : pipeline
    const { data, info } = await resized
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true })
    return { data, width: info.width, height: info.height }
  } catch {
    // A handful of period scans are malformed; skipping one plate is better
    // than failing the whole book.
    return undefined
  }
}

export async function toThumbnail(input: Buffer): Promise<EncodedImage | undefined> {
  return toWebp(input, THUMB_MAX_EDGE, 74)
}

/**
 * How an illustration should be presented.
 *
 *  - `plate`     a full illustration; it earns a page of its own, the way it
 *                filled a page in the printed book
 *  - `ornament`  a chapter header or tailpiece — wide and short. These belong
 *                above the text they decorate, not on a page alone
 *  - `skip`      rules, drop caps, spacers: not artwork at all
 */
export type ImageKind = 'plate' | 'ornament' | 'skip'

export async function classifyImage(input: Buffer): Promise<ImageKind> {
  try {
    const meta = await sharp(input).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    // Deliberately permissive about small drawings: many period books
    // (Lear's limericks, Tenniel's vignettes) use modest images that are
    // very much the point of the page.
    if (w < 80 || h < 60 || w * h < 8_000) return 'skip'
    if (h < 240 || w / h > 2.6) return 'ornament'
    return 'plate'
  } catch {
    return 'skip'
  }
}
