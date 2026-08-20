import Dexie, { type EntityTable } from 'dexie'
import type { StoryBook } from './schema'

/**
 * Local-first storage. Everything the owner imports lives here, on-device,
 * and is never uploaded anywhere. Built-in demo books are static files and
 * are NOT stored in these tables — only their user state (progress etc.) is.
 */

/** A privately imported book. `book` holds the full validated StoryBook. */
export interface BookRow {
  id: string
  slug: string
  title: string
  hidden: 0 | 1
  /** Manual shelf ordering (lower first). */
  sortOrder: number
  quarantined: 0 | 1
  book: StoryBook
  createdAt: string
  updatedAt: string
}

/** Binary asset (page image, thumbnail, cover, audio) for imported books. */
export interface AssetRow {
  id: string // referenced from books as `idb:<id>`
  bookId: string
  kind: 'image' | 'thumbnail' | 'cover' | 'audio'
  mime: string
  size: number
  width?: number
  height?: number
  blob: Blob
}

/** Per-book user state: reading progress, favourites, history. */
export interface BookStateRow {
  bookId: string
  currentPage: number
  totalPages: number
  completed: 0 | 1
  favourite: 0 | 1
  lastOpenedAt?: string
  favouritedAt?: string
  completedAt?: string
}

/** Overrides applied to built-in books (hide, reorder) without copying them. */
export interface BuiltinOverrideRow {
  bookId: string
  hidden?: 0 | 1
  sortOrder?: number
}

/** Small key-value store (custom categories, shelf order, flags). */
export interface KvRow {
  key: string
  value: unknown
}

export class StorytimeDB extends Dexie {
  books!: EntityTable<BookRow, 'id'>
  assets!: EntityTable<AssetRow, 'id'>
  bookState!: EntityTable<BookStateRow, 'bookId'>
  builtinOverrides!: EntityTable<BuiltinOverrideRow, 'bookId'>
  kv!: EntityTable<KvRow, 'key'>

  constructor() {
    super('storytime-library')
    this.version(1).stores({
      books: 'id, slug, hidden, sortOrder, quarantined, updatedAt',
      assets: 'id, bookId, kind',
      bookState: 'bookId, favourite, completed, lastOpenedAt',
      builtinOverrides: 'bookId',
      kv: 'key',
    })
  }
}

export const db = new StorytimeDB()

/** Ask the browser to protect our data from automatic eviction. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // Not supported — the backup/export flow is the real safety net.
  }
  return false
}

export interface StorageEstimateInfo {
  usage: number
  quota: number
  nearlyFull: boolean
}

export async function getStorageEstimate(): Promise<StorageEstimateInfo | undefined> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est) return undefined
    const usage = est.usage ?? 0
    const quota = est.quota ?? 0
    return { usage, quota, nearlyFull: quota > 0 && usage / quota > 0.85 }
  } catch {
    return undefined
  }
}
