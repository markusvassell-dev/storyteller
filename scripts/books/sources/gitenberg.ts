/**
 * Source adapter for GITenberg — Project Gutenberg's mirror on GitHub.
 *
 * This is the adapter that works in the current environment: the egress
 * policy blocks gutenberg.org and archive.org, but raw.githubusercontent.com
 * is reachable for any public repository (see docs/research.md).
 *
 * The underlying works are public domain. Project Gutenberg's own boilerplate
 * and licence text are stripped during parsing (see ../parse.ts) so nothing
 * carries their trademark or licence wrapper; the canonical PG ebook page is
 * still recorded as the source in every book's rights record.
 */

const RAW = 'https://raw.githubusercontent.com/GITenberg'

/** Requests are retried gently; the mirror occasionally rate-limits. */
const RETRIES = 3
const RETRY_DELAY_MS = 800

export function gitenbergRepoSlug(title: string, pgId: number): string {
  const slug = title
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug}_${pgId}`
}

export function rawUrl(repo: string, path: string): string {
  return `${RAW}/${repo}/master/${path}`
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      return await fn()
    } catch {
      if (attempt === RETRIES - 1) return fallback
      await sleep(RETRY_DELAY_MS * (attempt + 1))
    }
  }
  return fallback
}

export async function headOk(url: string): Promise<boolean> {
  return withRetry(async () => {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  }, false)
}

export async function fetchText(url: string): Promise<string | undefined> {
  return withRetry(async () => {
    const res = await fetch(url)
    if (!res.ok) return undefined
    return await res.text()
  }, undefined)
}

export async function fetchBinary(url: string): Promise<Buffer | undefined> {
  return withRetry(async () => {
    const res = await fetch(url)
    if (!res.ok) return undefined
    return Buffer.from(await res.arrayBuffer())
  }, undefined)
}

export interface FetchedBook {
  repo: string
  html: string
  /** Image path (relative, e.g. "images/peter04.jpg") → bytes. */
  images: Map<string, Buffer>
}

/** Downloads the illustrated HTML edition and every image it references. */
export async function fetchGitenbergBook(
  repo: string,
  pgId: number,
  onProgress?: (done: number, total: number) => void,
): Promise<FetchedBook | undefined> {
  const html = await fetchText(rawUrl(repo, `${pgId}-h/${pgId}-h.htm`))
  if (!html) return undefined

  const refs = [...new Set([...html.matchAll(/src="(images\/[^"]+)"/g)].map((m) => m[1]!))]
  const images = new Map<string, Buffer>()
  let done = 0
  for (const ref of refs) {
    const bytes = await fetchBinary(rawUrl(repo, `${pgId}-h/${ref}`))
    if (bytes) images.set(ref, bytes)
    onProgress?.(++done, refs.length)
  }
  return { repo, html, images }
}
