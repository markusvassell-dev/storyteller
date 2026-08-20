import { staticUrl } from './assets'
import type { StoryBook } from './schema'

/**
 * Per-book offline control for the public-domain classics.
 *
 * Those books are cached as they are read rather than precached, so
 * installing the app stays a small download. This lets the owner deliberately
 * keep a book on the device — the useful thing before a flight or a bedtime
 * with no signal.
 *
 * Demo stories and privately imported books are already fully offline, so
 * they are reported as such without any work.
 */

const PAGE_CACHE = 'library-pages'
const BOOK_CACHE = 'library-books'

export type OfflineState = 'always' | 'saved' | 'partial' | 'not-saved' | 'unsupported'

function cacheApiAvailable(): boolean {
  return typeof caches !== 'undefined'
}

/** URLs a book needs in order to be readable with no network. */
function bookUrls(book: StoryBook): string[] {
  const refs = [book.cover, book.thumbnail, ...book.pages.map((p) => p.image), ...book.pages.map((p) => p.audio)]
  return refs
    .filter((r): r is string => Boolean(r) && r!.startsWith('library/'))
    .map((r) => staticUrl(r))
}

/** True when the book lives outside the runtime-cached library tier. */
export function isAlwaysOffline(book: StoryBook): boolean {
  return bookUrls(book).length === 0
}

export async function getOfflineState(book: StoryBook): Promise<OfflineState> {
  if (isAlwaysOffline(book)) return 'always'
  if (!cacheApiAvailable()) return 'unsupported'
  try {
    const cache = await caches.open(PAGE_CACHE)
    const urls = bookUrls(book)
    let present = 0
    for (const url of urls) {
      if (await cache.match(url)) present++
    }
    if (present === 0) return 'not-saved'
    return present === urls.length ? 'saved' : 'partial'
  } catch {
    return 'unsupported'
  }
}

export interface SaveProgress {
  done: number
  total: number
}

/** Downloads every asset a book needs so it can be read offline. */
export async function saveBookOffline(
  book: StoryBook,
  onProgress?: (p: SaveProgress) => void,
): Promise<void> {
  if (!cacheApiAvailable()) throw new Error('This browser cannot store books for offline reading.')
  const urls = bookUrls(book)
  const cache = await caches.open(PAGE_CACHE)

  // Keep the book's data alongside its pages so opening it works offline too.
  const bookCache = await caches.open(BOOK_CACHE)
  await bookCache.add(staticUrl(`library/${book.slug}/story.json`)).catch(() => undefined)

  let done = 0
  for (const url of urls) {
    if (!(await cache.match(url))) {
      try {
        await cache.add(url)
      } catch {
        // A single missing plate should not abort the whole download.
      }
    }
    onProgress?.({ done: ++done, total: urls.length })
  }
}

export async function removeBookOffline(book: StoryBook): Promise<void> {
  if (!cacheApiAvailable()) return
  const cache = await caches.open(PAGE_CACHE)
  for (const url of bookUrls(book)) await cache.delete(url)
}
