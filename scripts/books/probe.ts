/**
 * Discovery probe for public-domain books available through Project
 * Gutenberg's GitHub mirror (GITenberg).
 *
 * Why a probe: the GitHub API is session-scoped here, so repositories cannot
 * be listed — but `raw.githubusercontent.com` serves any public repo by exact
 * path. GITenberg repo names are the PG title slugified, suffixed with the PG
 * ebook id, so a candidate title + id can be turned into a URL and tested.
 *
 * For each candidate this reports whether the repo exists and how many
 * illustrations the HTML edition references, which is what decides whether a
 * title is worth bundling as a picture book.
 *
 * Run: npx tsx scripts/books/probe.ts [--json out.json]
 */

import { writeFileSync } from 'node:fs'
import { CANDIDATES, type Candidate } from './candidates'
import { gitenbergRepoSlug, rawUrl, fetchText, headOk } from './sources/gitenberg'

export interface ProbeResult extends Candidate {
  repo?: string
  found: boolean
  imageCount: number
  htmlBytes: number
  note?: string
}

async function probeOne(candidate: Candidate): Promise<ProbeResult> {
  const variants = candidate.repo
    ? [candidate.repo]
    : [gitenbergRepoSlug(candidate.title, candidate.pgId)]

  for (const repo of variants) {
    if (!(await headOk(rawUrl(repo, 'metadata.yaml')))) continue

    // The illustrated HTML lives at <id>-h/<id>-h.htm in the mirror.
    const html = await fetchText(rawUrl(repo, `${candidate.pgId}-h/${candidate.pgId}-h.htm`))
    if (!html) {
      return { ...candidate, repo, found: true, imageCount: 0, htmlBytes: 0, note: 'no HTML edition' }
    }
    const imageCount = (html.match(/src="images\//g) ?? []).length
    return { ...candidate, repo, found: true, imageCount, htmlBytes: html.length }
  }
  return { ...candidate, found: false, imageCount: 0, htmlBytes: 0, note: 'repo not found' }
}

/** Small concurrency pool — polite to the mirror, still reasonably quick. */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++
        results[index] = await fn(items[index]!)
      }
    }),
  )
  return results
}

const results = await mapPool(CANDIDATES, 4, probeOne)

results.sort((a, b) => b.imageCount - a.imageCount)
for (const r of results) {
  const status = !r.found ? 'MISSING' : r.imageCount > 0 ? `${r.imageCount} imgs` : 'text only'
  console.log(
    `${r.imageCount > 0 ? '🖼 ' : r.found ? '📄' : '❌'} ${String(r.pgId).padStart(6)}  ${status.padEnd(10)}  ${r.title}`,
  )
}

const illustrated = results.filter((r) => r.imageCount > 0)
const textOnly = results.filter((r) => r.found && r.imageCount === 0)
console.log(
  `\n${results.length} candidates · ${illustrated.length} illustrated · ${textOnly.length} text-only · ${
    results.length - illustrated.length - textOnly.length
  } missing`,
)

const jsonFlag = process.argv.indexOf('--json')
if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(process.argv[jsonFlag + 1]!, JSON.stringify(results, null, 2))
  console.log(`Wrote ${process.argv[jsonFlag + 1]}`)
}
