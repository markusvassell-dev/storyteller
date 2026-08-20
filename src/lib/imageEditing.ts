/**
 * Scan cleanup for imported picture books.
 *
 * A page photographed with a phone arrives tilted, surrounded by desk, and
 * often dim. These helpers trim the background away, straighten the page and
 * re-encode it — the difference between a shoebox of snapshots and something
 * that reads like a book.
 *
 * The measuring half is a pure function over raw pixels so it can be tested
 * without a browser; only `applyPageEdit` touches the DOM.
 */

export interface Rect {
  /** All values are 0..1, relative to the source image. */
  x: number
  y: number
  width: number
  height: number
}

export interface PageEdit {
  /** Clockwise rotation in degrees. */
  rotate: number
  /** Crop in normalised coordinates, applied after rotation. */
  crop?: Rect
}

export const NO_EDIT: PageEdit = { rotate: 0 }

export function isEdited(edit: PageEdit | undefined): boolean {
  if (!edit) return false
  if (edit.rotate !== 0) return true
  const c = edit.crop
  return Boolean(c && (c.x > 0.001 || c.y > 0.001 || c.width < 0.999 || c.height < 0.999))
}

/* ------------------------------------------------------------------ */
/* Auto-trim — pure, testable                                          */
/* ------------------------------------------------------------------ */

export interface TrimOptions {
  /** How far a pixel may differ from the border colour and still count as background (0-255). */
  tolerance?: number
  /** Fraction of a row/column that must be background for the line to be trimmed. */
  lineThreshold?: number
  /** Keep this much of the detected content margin, as a fraction of the image. */
  padding?: number
}

function medianChannel(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * Samples the border to learn the background colour, then walks inward from
 * each edge while the line is still mostly background.
 *
 * `pixels` is RGBA, as `CanvasRenderingContext2D.getImageData` returns.
 * Returns normalised bounds; falls back to the full image when the page fills
 * the frame or the background is not uniform enough to be sure.
 */
export function autoTrimBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: TrimOptions = {},
): Rect {
  const tolerance = options.tolerance ?? 34
  const lineThreshold = options.lineThreshold ?? 0.9
  const padding = options.padding ?? 0.004
  const full: Rect = { x: 0, y: 0, width: 1, height: 1 }
  if (width < 8 || height < 8) return full

  const at = (x: number, y: number) => (y * width + x) * 4

  // Background colour = median of a ring of border samples, which survives a
  // stray shadow or highlight better than a single corner pixel.
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  const sample = (x: number, y: number) => {
    const i = at(x, y)
    rs.push(pixels[i] ?? 0)
    gs.push(pixels[i + 1] ?? 0)
    bs.push(pixels[i + 2] ?? 0)
  }
  const steps = 24
  for (let s = 0; s < steps; s++) {
    const fx = Math.min(width - 1, Math.round((s / (steps - 1)) * (width - 1)))
    const fy = Math.min(height - 1, Math.round((s / (steps - 1)) * (height - 1)))
    sample(fx, 0)
    sample(fx, height - 1)
    sample(0, fy)
    sample(width - 1, fy)
  }
  const bg = [medianChannel(rs), medianChannel(gs), medianChannel(bs)] as const

  const isBackground = (x: number, y: number): boolean => {
    const i = at(x, y)
    return (
      Math.abs((pixels[i] ?? 0) - bg[0]) <= tolerance &&
      Math.abs((pixels[i + 1] ?? 0) - bg[1]) <= tolerance &&
      Math.abs((pixels[i + 2] ?? 0) - bg[2]) <= tolerance
    )
  }

  const rowIsBackground = (y: number): boolean => {
    let hits = 0
    for (let x = 0; x < width; x++) if (isBackground(x, y)) hits++
    return hits / width >= lineThreshold
  }
  const colIsBackground = (x: number): boolean => {
    let hits = 0
    for (let y = 0; y < height; y++) if (isBackground(x, y)) hits++
    return hits / height >= lineThreshold
  }

  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1
  while (top < bottom && rowIsBackground(top)) top++
  while (bottom > top && rowIsBackground(bottom)) bottom--
  while (left < right && colIsBackground(left)) left++
  while (right > left && colIsBackground(right)) right--

  const cropW = right - left + 1
  const cropH = bottom - top + 1
  // Nothing found, or the trim is so aggressive it must be wrong.
  if (cropW < width * 0.2 || cropH < height * 0.2) return full
  // Border was not background at all — leave the page alone.
  if (cropW === width && cropH === height) return full

  const pad = padding
  const x = Math.max(0, left / width - pad)
  const y = Math.max(0, top / height - pad)
  return {
    x,
    y,
    width: Math.min(1 - x, cropW / width + pad * 2),
    height: Math.min(1 - y, cropH / height + pad * 2),
  }
}

/* ------------------------------------------------------------------ */
/* Applying edits — browser only                                       */
/* ------------------------------------------------------------------ */

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in globalThis) {
    try {
      return await createImageBitmap(blob)
    } catch {
      // fall through for formats the bitmap decoder refuses (some SVGs)
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function sizeOf(src: ImageBitmap | HTMLImageElement) {
  return 'naturalWidth' in src
    ? { width: src.naturalWidth || src.width, height: src.naturalHeight || src.height }
    : { width: src.width, height: src.height }
}

/** Reads the pixels of an image, downscaled, for measurement. */
export async function samplePixels(
  blob: Blob,
  maxEdge = 240,
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number } | undefined> {
  try {
    const src = await loadBitmap(blob)
    const { width, height } = sizeOf(src)
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return undefined
    ctx.drawImage(src, 0, 0, w, h)
    if ('close' in src) src.close()
    return { pixels: ctx.getImageData(0, 0, w, h).data, width: w, height: h }
  } catch {
    return undefined
  }
}

/** Suggests a crop that removes the background around a photographed page. */
export async function suggestTrim(blob: Blob): Promise<Rect | undefined> {
  const sampled = await samplePixels(blob)
  if (!sampled) return undefined
  const bounds = autoTrimBounds(sampled.pixels, sampled.width, sampled.height)
  return isFullFrame(bounds) ? undefined : bounds
}

export function isFullFrame(rect: Rect): boolean {
  return rect.x <= 0.001 && rect.y <= 0.001 && rect.width >= 0.999 && rect.height >= 0.999
}

/**
 * Renders a page with its edit applied. Rotation happens first (about the
 * centre, expanding the canvas so nothing is clipped), then the crop.
 */
export async function applyPageEdit(blob: Blob, edit: PageEdit): Promise<Blob> {
  if (!isEdited(edit)) return blob
  const src = await loadBitmap(blob)
  const { width, height } = sizeOf(src)

  const radians = (edit.rotate * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const rotatedW = Math.round(width * cos + height * sin)
  const rotatedH = Math.round(width * sin + height * cos)

  const stage = document.createElement('canvas')
  stage.width = rotatedW
  stage.height = rotatedH
  const stageCtx = stage.getContext('2d')
  if (!stageCtx) return blob
  // Fill first so a rotation's corners are page-coloured rather than
  // transparent, which would show as black on the reader's dark chrome.
  stageCtx.fillStyle = '#ffffff'
  stageCtx.fillRect(0, 0, rotatedW, rotatedH)
  stageCtx.translate(rotatedW / 2, rotatedH / 2)
  stageCtx.rotate(radians)
  stageCtx.drawImage(src, -width / 2, -height / 2)
  if ('close' in src) src.close()

  const crop = edit.crop ?? { x: 0, y: 0, width: 1, height: 1 }
  const cx = Math.round(crop.x * rotatedW)
  const cy = Math.round(crop.y * rotatedH)
  const cw = Math.max(1, Math.round(crop.width * rotatedW))
  const ch = Math.max(1, Math.round(crop.height * rotatedH))

  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const outCtx = out.getContext('2d')
  if (!outCtx) return blob
  outCtx.drawImage(stage, cx, cy, cw, ch, 0, 0, cw, ch)

  const encoded = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, 'image/webp', 0.9),
  )
  return encoded ?? blob
}
