/**
 * Client-side PDF import. Each page is rendered to a raster image so a
 * scanned picture book stays a picture book. The source PDF never leaves
 * the device and is not kept after rendering.
 *
 * pdf.js (Apache-2.0) is loaded lazily so the reader bundle never pays for it.
 */

export interface RenderedPdfPage {
  pageNumber: number
  blob: Blob
  width: number
  height: number
}

const RENDER_TARGET_EDGE = 1600

export async function renderPdfToImages(
  file: File | Blob,
  onProgress?: (done: number, total: number) => void,
): Promise<RenderedPdfPage[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise
  const pages: RenderedPdfPage[] = []

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(3, RENDER_TARGET_EDGE / Math.max(base.width, base.height))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    let blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    )
    if (!blob || blob.type !== 'image/webp') {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85),
      )
    }
    if (!blob) throw new Error(`Could not encode page ${n}`)
    pages.push({ pageNumber: n, blob, width: canvas.width, height: canvas.height })
    page.cleanup()
    onProgress?.(n, doc.numPages)
  }
  await doc.cleanup()
  return pages
}
