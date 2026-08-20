/**
 * Writes fetched books to disk and rebuilds the library index.
 *
 * Bundled content lives in two places on purpose:
 *   public/stories/  — the small original demo collection, fully precached
 *                      so the installed app is readable offline immediately
 *   public/library/  — the fetched public-domain classics, runtime-cached
 *                      so installing the app does not download everything
 *
 * `buildIndex` rebuilds `public/stories/index.json` from whatever is on disk,
 * so it is always consistent with the actual files.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  builtinIndexSchema,
  storyBookSchema,
  summarize,
  type BookSummary,
  type StoryBook,
} from '../../src/lib/schema'

const publicDir = join(process.cwd(), 'public')
export const STORIES_DIR = join(publicDir, 'stories')
export const LIBRARY_DIR = join(publicDir, 'library')

export function bookDir(slug: string): string {
  return join(LIBRARY_DIR, slug)
}

export function ensureBookDir(slug: string): string {
  const dir = bookDir(slug)
  mkdirSync(join(dir, 'pages'), { recursive: true })
  return dir
}

export function writeAsset(slug: string, relative: string, data: Buffer | string): string {
  const dir = bookDir(slug)
  const target = join(dir, relative)
  mkdirSync(join(target, '..'), { recursive: true })
  writeFileSync(target, data)
  return `library/${slug}/${relative}`
}

/** Validates then writes a book, returning the validated result. */
export function writeStory(slug: string, book: unknown): StoryBook {
  const parsed = storyBookSchema.safeParse(book)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`${slug} failed validation → ${detail}`)
  }
  writeFileSync(join(bookDir(slug), 'story.json'), JSON.stringify(parsed.data))
  return parsed.data
}

function readStoriesFrom(dir: string, prefix: string): { summary: BookSummary; slug: string }[] {
  if (!existsSync(dir)) return []
  const out: { summary: BookSummary; slug: string }[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(dir, entry.name, 'story.json')
    if (!existsSync(file)) continue
    const parsed = storyBookSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
    if (!parsed.success) {
      throw new Error(
        `${prefix}/${entry.name}/story.json is invalid: ${parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      )
    }
    out.push({
      summary: summarize(parsed.data, `${prefix}/${entry.name}/story.json`),
      slug: entry.name,
    })
  }
  return out
}

/** Rebuilds the index from every story.json currently on disk. */
export function buildIndex(): BookSummary[] {
  const demos = readStoriesFrom(STORIES_DIR, 'stories')
  const classics = readStoriesFrom(LIBRARY_DIR, 'library')
  const books = [...demos, ...classics]
    .map((b) => b.summary)
    .sort((a, b) => a.title.localeCompare(b.title))

  const ids = new Set<string>()
  const slugs = new Set<string>()
  for (const book of books) {
    if (ids.has(book.id)) throw new Error(`Duplicate book id: ${book.id}`)
    if (slugs.has(book.slug)) throw new Error(`Duplicate slug: ${book.slug}`)
    ids.add(book.id)
    slugs.add(book.slug)
  }

  const index = builtinIndexSchema.parse({ version: 2, books })
  writeFileSync(join(STORIES_DIR, 'index.json'), JSON.stringify(index, null, 2))
  return books
}
