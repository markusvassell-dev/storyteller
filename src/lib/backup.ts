import { zip } from 'fflate'
import { db, type BookStateRow, type BuiltinOverrideRow } from './db'
import { getAssetBlob, saveAsset } from './assets'
import { backupManifestSchema, validateStoryBook, type StoryBook } from './schema'
import { saveImportedBook } from './bookAdmin'
import { exportSettings, importSettings } from './settings'
import { extractZipEntries } from './import/zip'
import { nowIso, uid } from './util'

/**
 * Whole-library backup & restore. The backup is a ZIP:
 *
 *   manifest.json                    – format marker, book list, state, settings
 *   books/<id>/story.json            – imported books, asset refs as pkg: paths
 *   books/<id>/assets/…              – that book's images & audio
 *
 * Optionally the entire ZIP is encrypted with AES-GCM (password-derived key).
 * This is the supported way to move the private library between iPhone/iPad.
 */

const APP_VERSION = '1.0.0'
const MAGIC = new TextEncoder().encode('STBKE1') // encrypted-container marker

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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, bytes as BufferSource),
  )
  const out = new Uint8Array(MAGIC.length + 16 + 12 + cipher.length)
  out.set(MAGIC, 0)
  out.set(salt, MAGIC.length)
  out.set(iv, MAGIC.length + 16)
  out.set(cipher, MAGIC.length + 28)
  return out
}

export class BackupPasswordError extends Error {}

async function decryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = bytes.slice(MAGIC.length, MAGIC.length + 16)
  const iv = bytes.slice(MAGIC.length + 16, MAGIC.length + 28)
  const cipher = bytes.slice(MAGIC.length + 28)
  const key = await deriveKey(password, salt)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipher as BufferSource,
    )
    return new Uint8Array(plain)
  } catch {
    throw new BackupPasswordError('Wrong password (or the backup is damaged).')
  }
}

export function isEncryptedBackup(bytes: Uint8Array): boolean {
  return MAGIC.every((b, i) => bytes[i] === b)
}

export interface ExportProgress {
  step: string
  done: number
  total: number
}

export async function exportLibrary(
  password?: string,
  onProgress?: (p: ExportProgress) => void,
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  const rows = await db.books.toArray()
  const states = await db.bookState.toArray()
  const overrides = await db.builtinOverrides.toArray()
  const kv = await db.kv.toArray()

  let done = 0
  for (const row of rows) {
    onProgress?.({ step: `Packing “${row.title}”`, done, total: rows.length })
    const book = row.book
    const dir = `books/${row.id}`
    let counter = 0
    const packRef = async (ref: string | undefined, label: string) => {
      if (!ref) return undefined
      const blob = await getAssetBlob(ref)
      if (!blob) throw new Error(`“${row.title}”: missing asset (${label}) — run a library check`)
      const name = `${dir}/assets/${label}-${String(++counter).padStart(3, '0')}.${extForMime(blob.type)}`
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
    files[`${dir}/story.json`] = new TextEncoder().encode(JSON.stringify(packaged))
    done++
  }

  const manifest = {
    format: 'storytime-backup' as const,
    version: 1 as const,
    exportedAt: nowIso(),
    appVersion: APP_VERSION,
    encrypted: Boolean(password),
    books: rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title })),
    bookState: Object.fromEntries(states.map((s) => [s.bookId, s])),
    settings: {
      ...exportSettings(),
      __builtinOverrides: overrides,
      __kv: kv,
    },
  }
  files['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2))

  onProgress?.({ step: 'Compressing backup', done: rows.length, total: rows.length })
  let bytes = await zipAsync(files)
  if (password) {
    onProgress?.({ step: 'Encrypting backup', done: rows.length, total: rows.length })
    bytes = await encryptBytes(bytes, password)
  }
  return new Blob([bytes.slice().buffer as ArrayBuffer], {
    type: password ? 'application/octet-stream' : 'application/zip',
  })
}

export interface RestoreSummary {
  imported: number
  replaced: number
  stateRestored: boolean
  errors: string[]
}

export async function importLibrary(
  file: File | Blob,
  password?: string,
  onProgress?: (p: ExportProgress) => void,
): Promise<RestoreSummary> {
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer())
  if (isEncryptedBackup(bytes)) {
    if (!password) throw new BackupPasswordError('This backup is encrypted — enter its password.')
    onProgress?.({ step: 'Decrypting backup', done: 0, total: 1 })
    bytes = await decryptBytes(bytes, password)
  }

  const entries = await extractZipEntries(new Blob([bytes.slice().buffer as ArrayBuffer]))
  const manifestBytes = entries.get('manifest.json')
  if (!manifestBytes) throw new Error('Not a Storytime backup (manifest.json missing).')
  const manifest = backupManifestSchema.parse(
    JSON.parse(new TextDecoder().decode(manifestBytes)),
  )

  const summary: RestoreSummary = { imported: 0, replaced: 0, stateRestored: false, errors: [] }

  let done = 0
  for (const info of manifest.books) {
    onProgress?.({ step: `Restoring “${info.title}”`, done, total: manifest.books.length })
    try {
      const storyBytes = entries.get(`books/${info.id}/story.json`)
      if (!storyBytes) throw new Error('story.json missing from backup')
      const draft = JSON.parse(new TextDecoder().decode(storyBytes)) as StoryBook
      const newId = draft.id ?? uid()

      const resolveRef = async (
        ref: string | undefined,
        kind: 'image' | 'cover' | 'thumbnail' | 'audio',
      ) => {
        if (!ref) return undefined
        if (!ref.startsWith('pkg:')) return ref
        const path = ref.slice(4)
        const data = entries.get(path)
        if (!data) throw new Error(`asset missing: ${path}`)
        const ext = path.split('.').pop() ?? ''
        const mime =
          {
            jpg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            mp3: 'audio/mpeg',
            m4a: 'audio/mp4',
            aac: 'audio/aac',
            ogg: 'audio/ogg',
            wav: 'audio/wav',
          }[ext] ?? 'application/octet-stream'
        const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: mime })
        return await saveAsset({ bookId: newId, kind, blob })
      }

      const pages = []
      for (const page of draft.pages) {
        pages.push({
          ...page,
          image: (await resolveRef(page.image, 'image'))!,
          audio: await resolveRef(page.audio, 'audio'),
        })
      }
      const candidate = {
        ...draft,
        id: newId,
        cover: await resolveRef(draft.cover, 'cover'),
        thumbnail: await resolveRef(draft.thumbnail, 'thumbnail'),
        pages,
        narration: draft.narration
          ? { ...draft.narration, bookAudio: await resolveRef(draft.narration.bookAudio, 'audio') }
          : undefined,
      }
      const result = validateStoryBook(candidate)
      if (!result.ok || !result.book) {
        throw new Error(
          result.issues
            .filter((i) => i.severity === 'error')
            .map((i) => `${i.path}: ${i.message}`)
            .join('; '),
        )
      }
      const existed = await db.books.get(newId)
      await saveImportedBook(result.book)
      if (existed) summary.replaced++
      else summary.imported++
    } catch (err) {
      summary.errors.push(`“${info.title}”: ${err instanceof Error ? err.message : String(err)}`)
    }
    done++
  }

  // Restore per-book state, built-in overrides, custom categories & settings.
  if (manifest.bookState) {
    for (const [bookId, state] of Object.entries(manifest.bookState)) {
      const s = state as Partial<BookStateRow>
      if (typeof s.currentPage === 'number' && typeof s.totalPages === 'number') {
        await db.bookState.put({
          bookId,
          currentPage: s.currentPage,
          totalPages: s.totalPages,
          completed: s.completed ? 1 : 0,
          favourite: s.favourite ? 1 : 0,
          lastOpenedAt: s.lastOpenedAt,
          favouritedAt: s.favouritedAt,
          completedAt: s.completedAt,
        })
      }
    }
    summary.stateRestored = true
  }
  if (manifest.settings) {
    const { __builtinOverrides, __kv, ...rest } = manifest.settings as Record<string, unknown>
    if (Array.isArray(__builtinOverrides)) {
      for (const o of __builtinOverrides as BuiltinOverrideRow[]) {
        if (o && typeof o.bookId === 'string') await db.builtinOverrides.put(o)
      }
    }
    if (Array.isArray(__kv)) {
      for (const row of __kv as { key: string; value: unknown }[]) {
        if (row && typeof row.key === 'string') await db.kv.put(row)
      }
    }
    importSettings(rest)
  }

  return summary
}
