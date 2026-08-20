/**
 * Direct Project Gutenberg source adapter.
 *
 * DORMANT in the environment this was built in: the organisation's egress
 * policy blocks gutenberg.org, so `sources/gitenberg.ts` (the GitHub mirror)
 * is used instead. The mirror is a 2015 snapshot, so a number of titles are
 * text-only there even though gutenberg.org carries a properly illustrated
 * edition — those books gain their artwork the moment this adapter can run.
 *
 * To enable: allow `www.gutenberg.org` in the Claude egress settings, then
 * `npm run books:fetch -- --source gutenberg`.
 */

const BASE = 'https://www.gutenberg.org'

export interface GutenbergBook {
  html: string
  images: Map<string, Buffer>
}

export class SourceUnavailableError extends Error {}

async function assertReachable(): Promise<void> {
  try {
    const res = await fetch(`${BASE}/`, { method: 'HEAD' })
    if (!res.ok) throw new Error(String(res.status))
  } catch {
    throw new SourceUnavailableError(
      'gutenberg.org is not reachable from this environment (egress policy). ' +
        'Allow www.gutenberg.org in the Claude egress settings, or use the default GitHub-mirror source.',
    )
  }
}

/**
 * Fetches the illustrated HTML edition and its images. Project Gutenberg asks
 * that automated clients go easy: requests are serialised with a short delay
 * rather than run in parallel.
 */
export async function fetchGutenbergBook(
  pgId: number,
  onProgress?: (done: number, total: number) => void,
): Promise<GutenbergBook | undefined> {
  await assertReachable()

  const candidates = [
    `${BASE}/cache/epub/${pgId}/pg${pgId}-images.html`,
    `${BASE}/files/${pgId}/${pgId}-h/${pgId}-h.htm`,
    `${BASE}/cache/epub/${pgId}/pg${pgId}.html`,
  ]

  let html: string | undefined
  let baseUrl = ''
  for (const url of candidates) {
    const res = await fetch(url)
    if (res.ok) {
      html = await res.text()
      baseUrl = url.slice(0, url.lastIndexOf('/') + 1)
      break
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  if (!html) return undefined

  const refs = [...new Set([...html.matchAll(/src="(images\/[^"]+)"/g)].map((m) => m[1]!))]
  const images = new Map<string, Buffer>()
  let done = 0
  for (const ref of refs) {
    const res = await fetch(baseUrl + ref)
    if (res.ok) images.set(ref, Buffer.from(await res.arrayBuffer()))
    onProgress?.(++done, refs.length)
    await new Promise((r) => setTimeout(r, 250))
  }
  return { html, images }
}
