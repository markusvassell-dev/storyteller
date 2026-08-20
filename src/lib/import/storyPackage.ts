import { zip } from 'fflate'
import { extractZipEntries } from './zip'
import { getAssetBlob, isIdbRef, saveAsset } from '../assets'
import { validateStoryBook, type StoryBook } from '../schema'
import { uid } from '../util'

/**
 * Project-defined story package: a ZIP holding `story.json` plus its assets.
 * Inside the package, asset refs use `pkg:<path>` pointing at ZIP entries.
 * On import each asset is stored locally and the ref rewritten to `idb:`.
 */

export class StoryPackageError extends Error {}

function kindForRef(book: StoryBook, ref: string): 'image' | 'cover' | 'thumbnail' | 'audio' {
  if (book.cover === ref) return 'cover'
  if (book.thumbnail === ref) return 'thumbnail'
  if (book.narration?.bookAudio === ref) return 'audio'
  if (book.pages.some((p) => p.audio === ref)) return 'audio'
  return 'image'
}

function mimeForName(name: string): string {
  const ext = name.toLowerCase().split('.').pop()
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    wav: 'audio/wav',
    json: 'application/json',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

/** Imports a `.storytime.zip` package. Returns the book ready to save. */
export async function importStoryPackage(file: File | Blob): Promise<StoryBook> {
  const entries = await extractZipEntries(file)
  const storyEntry = entries.get('story.json')
  if (!storyEntry) throw new StoryPackageError('Package is missing story.json')

  let raw: unknown
  try {
    raw = JSON.parse(new TextDecoder().decode(storyEntry))
  } catch {
    throw new StoryPackageError('story.json is not valid JSON')
  }

  // Give the imported copy a fresh identity, then resolve pkg: refs.
  const draft = raw as StoryBook
  const bookId = uid()

  const resolveRef = async (ref: string | undefined): Promise<string | undefined> => {
    if (!ref) return undefined
    if (!ref.startsWith('pkg:')) return ref
    const path = ref.slice(4)
    const bytes = entries.get(path)
    if (!bytes) throw new StoryPackageError(`Package is missing asset "${path}"`)
    const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: mimeForName(path) })
    return await saveAsset({ bookId, kind: kindForRef(draft, ref), blob })
  }

  const pages = []
  for (const page of draft.pages ?? []) {
    pages.push({
      ...page,
      image: (await resolveRef(page.image))!,
      audio: await resolveRef(page.audio),
    })
  }

  const candidate = {
    ...draft,
    id: bookId,
    cover: await resolveRef(draft.cover),
    thumbnail: await resolveRef(draft.thumbnail),
    pages,
    narration: draft.narration
      ? { ...draft.narration, bookAudio: await resolveRef(draft.narration.bookAudio) }
      : undefined,
    storageLocation: 'local',
  }

  const result = validateStoryBook(candidate)
  if (!result.ok || !result.book) {
    throw new StoryPackageError(
      `Package failed validation: ${result.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `${i.path}: ${i.message}`)
        .join('; ')}`,
    )
  }
  return result.book
}

function zipAsync(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)))
  })
}

function extForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
  }
  return map[mime] ?? 'bin'
}

/** Exports one book (with all of its assets) as a portable package. */
export async function exportStoryPackage(book: StoryBook): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  let counter = 0

  const packRef = async (ref: string | undefined, label: string): Promise<string | undefined> => {
    if (!ref) return undefined
    const blob = await getAssetBlob(ref)
    if (!blob) throw new StoryPackageError(`Missing asset for ${label}`)
    const name = `assets/${label}-${String(++counter).padStart(3, '0')}.${extForMime(blob.type)}`
    files[name] = new Uint8Array(await blob.arrayBuffer())
    return `pkg:${name}`
  }

  const pages = []
  for (const page of book.pages) {
    pages.push({
      ...page,
      image: (await packRef(page.image, `page-${page.number}`))!,
      audio: await packRef(page.audio, `audio-${page.number}`),
    })
  }
  const packaged = {
    ...book,
    cover: await packRef(book.cover, 'cover'),
    thumbnail: await packRef(book.thumbnail, 'thumb'),
    pages,
    narration: book.narration
      ? { ...book.narration, bookAudio: await packRef(book.narration.bookAudio, 'book-audio') }
      : undefined,
  }
  files['story.json'] = new TextEncoder().encode(JSON.stringify(packaged, null, 2))
  const bytes = await zipAsync(files)
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' })
}

/** True if a ref points at locally stored bytes (used by the exporter UI). */
export function refIsLocal(ref: string | undefined): boolean {
  return Boolean(ref && isIdbRef(ref))
}
