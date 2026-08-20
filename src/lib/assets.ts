import { db, type AssetRow } from './db'
import { uid } from './util'
import type { AssetRef } from './schema'

/**
 * Resolves asset references to displayable URLs.
 *  - "stories/…"  → static file shipped with the app (respects BASE_URL)
 *  - "idb:<id>"   → Blob stored locally in IndexedDB, served via object URL
 *
 * Object URLs are cached per asset id and revoked when explicitly released
 * (the reader releases pages it has moved far away from).
 */

const objectUrls = new Map<string, string>()

export function isIdbRef(ref: AssetRef): boolean {
  return ref.startsWith('idb:')
}

export function idbId(ref: AssetRef): string {
  return ref.slice(4)
}

export function staticUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export async function resolveAssetUrl(ref: AssetRef): Promise<string | undefined> {
  if (!isIdbRef(ref)) return staticUrl(ref)
  const id = idbId(ref)
  const cached = objectUrls.get(id)
  if (cached) return cached
  const row = await db.assets.get(id)
  if (!row) return undefined
  const url = URL.createObjectURL(row.blob)
  objectUrls.set(id, url)
  return url
}

export function releaseAssetUrl(ref: AssetRef): void {
  if (!isIdbRef(ref)) return
  const id = idbId(ref)
  const url = objectUrls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrls.delete(id)
  }
}

export interface SaveAssetOptions {
  bookId: string
  kind: AssetRow['kind']
  blob: Blob
  width?: number
  height?: number
}

/** Stores a blob and returns the `idb:` reference to embed in the book. */
export async function saveAsset(opts: SaveAssetOptions): Promise<AssetRef> {
  const id = uid()
  await db.assets.add({
    id,
    bookId: opts.bookId,
    kind: opts.kind,
    mime: opts.blob.type || 'application/octet-stream',
    size: opts.blob.size,
    width: opts.width,
    height: opts.height,
    blob: opts.blob,
  })
  return `idb:${id}`
}

export async function getAssetBlob(ref: AssetRef): Promise<Blob | undefined> {
  if (isIdbRef(ref)) {
    const row = await db.assets.get(idbId(ref))
    return row?.blob
  }
  const res = await fetch(staticUrl(ref))
  if (!res.ok) return undefined
  return await res.blob()
}

export async function deleteBookAssets(bookId: string): Promise<void> {
  const rows = await db.assets.where('bookId').equals(bookId).toArray()
  for (const row of rows) {
    const url = objectUrls.get(row.id)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrls.delete(row.id)
    }
  }
  await db.assets.where('bookId').equals(bookId).delete()
}

/** True when every idb: asset a book references actually exists locally. */
export async function verifyBookAssets(refs: AssetRef[]): Promise<AssetRef[]> {
  const missing: AssetRef[] = []
  for (const ref of refs) {
    if (!isIdbRef(ref)) continue
    const row = await db.assets.get(idbId(ref))
    if (!row) missing.push(ref)
  }
  return missing
}
