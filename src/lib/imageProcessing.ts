/** Client-side image normalisation for imported pages and covers. */

export interface ProcessedImage {
  blob: Blob
  width: number
  height: number
}

const PAGE_MAX_EDGE = 1600
const THUMB_MAX_EDGE = 360

async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob)
    } catch {
      // fall through to <img> decode (e.g. SVG in some browsers)
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

function sizeOf(src: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if ('naturalWidth' in src) {
    return { width: src.naturalWidth || src.width, height: src.naturalHeight || src.height }
  }
  return { width: src.width, height: src.height }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Scales an image down to `maxEdge` and re-encodes it (WebP where the browser
 * can encode it, JPEG otherwise). SVG inputs are stored untouched — they're
 * already small and scale perfectly.
 */
export async function normaliseImage(
  blob: Blob,
  maxEdge = PAGE_MAX_EDGE,
  quality = 0.85,
): Promise<ProcessedImage> {
  if (blob.type === 'image/svg+xml') {
    return { blob, width: 0, height: 0 }
  }
  const src = await decode(blob)
  const { width, height } = sizeOf(src)
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  // Already small and an efficient format → keep the original bytes.
  if (scale === 1 && (blob.type === 'image/webp' || blob.type === 'image/jpeg')) {
    return { blob, width, height }
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { blob, width, height }
  ctx.drawImage(src, 0, 0, w, h)
  if ('close' in src) src.close()

  let out = await canvasToBlob(canvas, 'image/webp', quality)
  if (!out || out.type !== 'image/webp') {
    out = await canvasToBlob(canvas, 'image/jpeg', 0.85)
  }
  return out ? { blob: out, width: w, height: h } : { blob, width, height }
}

export async function makeThumbnail(blob: Blob): Promise<ProcessedImage> {
  return normaliseImage(blob, THUMB_MAX_EDGE, 0.75)
}

/** SHA-256 of a blob — used to flag duplicate files during import. */
export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
