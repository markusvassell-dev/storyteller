import { unzip, type Unzipped } from 'fflate'
import { naturalCompare } from '../util'

/** ZIP / CBZ extraction for ordered page images. */

export interface ExtractedImage {
  name: string
  blob: Blob
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i
const MACOS_JUNK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/

function mimeFor(name: string): string {
  const ext = name.toLowerCase().split('.').pop()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'avif':
      return 'image/avif'
    default:
      return 'application/octet-stream'
  }
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, out) => (err ? reject(err) : resolve(out)))
  })
}

/**
 * Extracts image entries from a ZIP or CBZ in natural filename order
 * ("page2" before "page10"). Junk metadata entries are skipped.
 */
export async function extractImagesFromZip(file: File | Blob): Promise<ExtractedImage[]> {
  const data = new Uint8Array(await file.arrayBuffer())
  const entries = await unzipAsync(data)
  const names = Object.keys(entries)
    .filter((n) => IMAGE_EXT.test(n) && !MACOS_JUNK.test(n) && entries[n]!.length > 0)
    .sort(naturalCompare)
  return names.map((name) => ({
    name,
    blob: new Blob([entries[name]!.slice().buffer as ArrayBuffer], { type: mimeFor(name) }),
  }))
}

/** Reads a single named entry (used by story-package import). */
export async function extractZipEntries(file: File | Blob): Promise<Map<string, Uint8Array>> {
  const data = new Uint8Array(await file.arrayBuffer())
  const entries = await unzipAsync(data)
  const map = new Map<string, Uint8Array>()
  for (const [name, bytes] of Object.entries(entries)) {
    if (!MACOS_JUNK.test(name) && bytes.length > 0) map.set(name, bytes)
  }
  return map
}
