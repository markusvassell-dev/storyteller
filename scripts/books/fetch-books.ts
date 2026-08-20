/**
 * Fetches the curated public-domain library and emits it as reader-ready
 * books under public/library/.
 *
 * Everything is validated against the app's own story schema before it is
 * written, and every book carries a complete rights record, so the
 * build-blocking rights audit (`npm run audit:rights`) covers this content
 * exactly like hand-authored books.
 *
 * Usage:
 *   npm run books:fetch                  # fetch the whole catalog
 *   npm run books:fetch -- --only alice-in-wonderland
 *   npm run books:fetch -- --limit 3 --dry-run
 *   npm run books:fetch -- --index-only  # just rebuild stories/index.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG, type CatalogEntry } from './catalog'
import { fetchGitenbergBook, gitenbergRepoSlug, type FetchedBook } from './sources/gitenberg'
import { parseGutenbergHtml, type Block } from './parse'
import { composePages, estimateMinutes } from './compose'
import { classifyImage, toThumbnail, toWebp } from './images'
import { generateCoverSvg } from './cover'
import { buildIndex, ensureBookDir, writeAsset, writeStory } from './emit'

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}
const has = (name: string) => args.includes(`--${name}`)

const CACHE_DIR = join(process.cwd(), '.cache', 'books')
const RIGHTS_CHECKED_AT = new Date().toISOString()

/* ---------------------------------------------------------------- */
/* Download cache — reruns are cheap and kind to the mirror           */
/* ---------------------------------------------------------------- */

function cachePath(repo: string, file: string): string {
  return join(CACHE_DIR, repo.replace(/[^A-Za-z0-9_-]/g, '_'), file)
}

async function loadBook(entry: CatalogEntry): Promise<FetchedBook | undefined> {
  const repo = entry.repo ?? gitenbergRepoSlug(entry.title, entry.pgId)
  const htmlCache = cachePath(repo, 'book.htm')
  const manifestCache = cachePath(repo, 'images.json')

  if (existsSync(htmlCache) && existsSync(manifestCache)) {
    const html = readFileSync(htmlCache, 'utf8')
    const names = JSON.parse(readFileSync(manifestCache, 'utf8')) as string[]
    const images = new Map<string, Buffer>()
    for (const name of names) {
      const file = cachePath(repo, `img/${name.replace(/[^A-Za-z0-9._-]/g, '_')}`)
      if (existsSync(file)) images.set(name, readFileSync(file))
    }
    console.log(`   ↳ using cached download (${images.size} images)`)
    return { repo, html, images }
  }

  const fetched = await fetchGitenbergBook(repo, entry.pgId, (done, total) => {
    if (done % 25 === 0 || done === total) {
      process.stdout.write(`\r   ↳ downloading images ${done}/${total}   `)
    }
  })
  if (!fetched) return undefined
  if (fetched.images.size > 0) process.stdout.write('\n')

  mkdirSync(cachePath(repo, 'img'), { recursive: true })
  writeFileSync(htmlCache, fetched.html)
  writeFileSync(manifestCache, JSON.stringify([...fetched.images.keys()]))
  for (const [name, bytes] of fetched.images) {
    writeFileSync(cachePath(repo, `img/${name.replace(/[^A-Za-z0-9._-]/g, '_')}`), bytes)
  }
  return fetched
}

/* ---------------------------------------------------------------- */
/* Credit detection — prefer what the edition says about itself      */
/* ---------------------------------------------------------------- */

/**
 * Reads an "Illustrated by …" credit off the edition's own title page.
 *
 * Names must survive initials — "John D. Batten" and "W. H. Drake" are the
 * normal shape here — so this matches name-shaped tokens rather than stopping
 * at the first full stop.
 */
function detectIllustrators(html: string): string[] {
  const head = html.slice(0, 20_000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const match = /illustrated by\s+(.{3,90})/i.exec(head)
  if (!match) return []

  const names: string[] = []
  for (const part of match[1]!.split(/\s+and\s+|\s*&\s*|,/i)) {
    // Up to three leading given names/initials, then a surname.
    const name = /^\s*((?:[A-Z][A-Za-z'’-]*\.?\s+){0,3}[A-Z][A-Za-z'’-]{1,24})/.exec(part)
    if (!name) break
    const cleaned = trimCredit(name[1]!.trim().replace(/\s+/g, ' '))
    if (cleaned && cleaned.length >= 3 && cleaned.length <= 48) names.push(cleaned)
    if (names.length >= 3) break
  }
  return names
}

/** Words that follow a credit on a title page but are not part of the name. */
const CREDIT_STOPWORD =
  /^(this|that|the|a|an|and|with|by|from|copyright|new|york|london|boston|philadelphia|chicago|edinburgh|publisher|publishers|company|press|sons|brothers|bros|co|inc|ltd|limited|edition|illustrations?|illustrated|author|volume|book|MCM[IVXLC]*|M?DCCC[IVXLC]*|\d{4})$/i

/**
 * Title pages run the credit straight into the title or imprint, so trailing
 * words that are not part of a person's name are trimmed — a name is at most
 * three tokens, and a shouted word after a normally-cased name belongs to the
 * title rather than the artist.
 */
function trimCredit(raw: string): string | undefined {
  let tokens = raw.split(' ').slice(0, 3)
  const mixedCase = tokens.some((t) => /[a-z]/.test(t))
  while (tokens.length > 2) {
    const last = tokens[tokens.length - 1]!
    const isShouted = mixedCase && /^[A-Z][A-Z'’-]{1,}$/.test(last)
    if (CREDIT_STOPWORD.test(last) || isShouted) tokens = tokens.slice(0, -1)
    else break
  }
  // A trailing stop-word can also appear on a two-token credit.
  if (tokens.length === 2 && CREDIT_STOPWORD.test(tokens[1]!)) tokens = tokens.slice(0, 1)
  if (tokens.length < 2) return undefined
  // Some title pages set the credit in capitals; the app shows names, not shouting.
  if (!tokens.some((t) => /[a-z]/.test(t))) {
    tokens = tokens.map((t) =>
      t.length <= 2 ? t : t[0]! + t.slice(1).toLowerCase(),
    )
  }
  return tokens.join(' ')
}

/* ---------------------------------------------------------------- */
/* Per-book pipeline                                                  */
/* ---------------------------------------------------------------- */

interface BuildResult {
  slug: string
  pages: number
  illustrations: number
  bytes: number
}

async function buildBook(entry: CatalogEntry, dryRun: boolean): Promise<BuildResult | undefined> {
  console.log(`\n📖 ${entry.title} (PG ${entry.pgId})`)
  const fetched = await loadBook(entry)
  if (!fetched) {
    console.log('   ✗ not available on the mirror — skipped')
    return undefined
  }

  const blocks: Block[] = parseGutenbergHtml(fetched.html)
  const paragraphs = blocks.filter((b) => b.type === 'paragraph').length
  const imageBlocks = blocks.filter((b) => b.type === 'image').length
  // Picture books carry their words inside the artwork, so a low paragraph
  // count is only a problem when there are few illustrations too.
  if (paragraphs < 5 && imageBlocks < 8) {
    console.log(
      `   ✗ only ${paragraphs} paragraphs and ${imageBlocks} illustrations parsed — skipped as unusable`,
    )
    return undefined
  }

  const illustrators =
    detectIllustrators(fetched.html).length > 0
      ? detectIllustrators(fetched.html)
      : (entry.illustrators ?? [])

  if (dryRun) {
    const imageBlocks = blocks.filter((b) => b.type === 'image').length
    console.log(
      `   ✓ would build: ${paragraphs} paragraphs, ${imageBlocks} illustrations, credits: ${
        illustrators.join(', ') || '(none detected)'
      }`,
    )
    return undefined
  }

  ensureBookDir(entry.slug)

  // --- encode illustrations -------------------------------------------------
  const imageRefs = new Map<string, string>()
  const ornaments = new Set<string>()
  let index = 0
  let bytes = 0
  let firstArtwork: Buffer | undefined
  for (const block of blocks) {
    if (block.type !== 'image') continue
    const source = fetched.images.get(block.src)
    if (!source) continue
    const kind = await classifyImage(source)
    // Rules, drop caps and spacers are not illustrations worth keeping.
    if (kind === 'skip') continue
    if (kind === 'ornament') ornaments.add(block.src)
    const encoded = await toWebp(source)
    if (!encoded) continue
    const name = `pages/${String(++index).padStart(3, '0')}.webp`
    imageRefs.set(block.src, writeAsset(entry.slug, name, encoded.data))
    bytes += encoded.data.length
    // The cover should be a proper plate, never a chapter header.
    if (!firstArtwork && kind === 'plate') firstArtwork = source
  }

  // --- pages ----------------------------------------------------------------
  const pages = composePages(blocks, {
    title: entry.title,
    illustrators,
    imageRefs,
    ornaments,
  })
  // Quality gates: a book that parsed into almost nothing, or a picture book
  // whose pictures are missing, is worse than no book at all.
  if (pages.length < 4) {
    console.log(`   ✗ produced only ${pages.length} page(s) — skipped as a broken parse`)
    return undefined
  }
  const plateCount = imageRefs.size - ornaments.size
  if (entry.categories.includes('picture-books') && plateCount === 0) {
    console.log('   ✗ picture book with no usable illustrations in this edition — skipped')
    return undefined
  }

  // --- cover ----------------------------------------------------------------
  let cover: string
  let thumbnail: string | undefined
  if (firstArtwork) {
    const coverImage = await toWebp(firstArtwork, 1200, 86)
    const thumb = await toThumbnail(firstArtwork)
    cover = writeAsset(entry.slug, 'cover.webp', coverImage!.data)
    bytes += coverImage!.data.length
    if (thumb) {
      thumbnail = writeAsset(entry.slug, 'thumbnail.webp', thumb.data)
      bytes += thumb.data.length
    }
  } else {
    const svg = generateCoverSvg({
      title: entry.title,
      authors: entry.authors,
      slug: entry.slug,
      footnote: illustrators.length > 0 ? `Illustrated by ${illustrators[0]}` : undefined,
    })
    cover = writeAsset(entry.slug, 'cover.svg', svg)
    bytes += Buffer.byteLength(svg)
  }

  // --- rights record --------------------------------------------------------
  const sourceUrl = `https://www.gutenberg.org/ebooks/${entry.pgId}`
  const credits = [
    `Text of the ${entry.editionYear} edition`,
    illustrators.length > 0 ? `illustrations by ${illustrators.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join('; ')

  const book = {
    id: `pd-${entry.slug}`,
    slug: entry.slug,
    title: entry.title,
    authors: entry.authors,
    illustrators:
      illustrators.length > 0
        ? illustrators
        : plateCount > 0
          // The edition is illustrated but names no artist.
          ? ['Uncredited in the source edition']
          : ['Cover created for Storytime Library (source edition has no illustrations)'],
    translators: entry.translators ?? [],
    description: entry.description,
    language: 'en' as const,
    ageRange: entry.ageRange,
    readingLevel: entry.readingLevel,
    estimatedMinutes: estimateMinutes(pages),
    categories: entry.categories,
    tags: entry.tags ?? [],
    cover,
    thumbnail,
    pages,
    rights: {
      status: 'public-domain' as const,
      publicDomainBasis: entry.publicDomainBasis,
      sourceOfFiles: `Project Gutenberg ebook #${entry.pgId}, retrieved from the GITenberg mirror on GitHub`,
      sourceUrl,
      sourceOrganization: 'Project Gutenberg',
      remoteStorageAllowed: true,
      personalUseOnly: false,
      modificationAllowed: true,
      commercialUseAllowed: true,
      notes: entry.contentNote,
    },
    source: `${credits}. Public domain; retrieved from Project Gutenberg ebook #${entry.pgId}.`,
    attribution: `${entry.authors.join(', ')}${
      entry.translators?.length ? `, translated by ${entry.translators.join(', ')}` : ''
    }${illustrators.length > 0 ? `, illustrated by ${illustrators.join(', ')}` : ''}.`,
    rightsCheckedAt: RIGHTS_CHECKED_AT,
    storageLocation: 'builtin' as const,
    offlineStatus: 'available' as const,
    contentAdvisory: entry.contentAdvisory,
    featured: entry.featured ?? false,
    // Period content the owner should vet stays out of the library until they
    // choose to show it; the book itself is bundled unedited.
    hidden: entry.hiddenByDefault ?? false,
    createdAt: RIGHTS_CHECKED_AT,
    updatedAt: RIGHTS_CHECKED_AT,
  }

  const written = writeStory(entry.slug, book)
  console.log(
    `   ✓ ${written.pages.length} pages · ${imageRefs.size} illustrations · ${(bytes / 1024 / 1024).toFixed(1)} MB${
      entry.hiddenByDefault ? ' · HIDDEN (content advisory)' : ''
    }`,
  )
  return { slug: entry.slug, pages: written.pages.length, illustrations: imageRefs.size, bytes }
}

/* ---------------------------------------------------------------- */
/* Main                                                               */
/* ---------------------------------------------------------------- */

if (has('index-only')) {
  const books = buildIndex()
  console.log(`Rebuilt library index: ${books.length} books`)
  process.exit(0)
}

const only = flag('only')
const limit = flag('limit') ? Number(flag('limit')) : undefined
const dryRun = has('dry-run')

let selection = CATALOG
if (only) selection = selection.filter((c) => c.slug === only)
if (limit) selection = selection.slice(0, limit)

console.log(
  `Fetching ${selection.length} book(s) from the Project Gutenberg mirror${dryRun ? ' (dry run)' : ''}…`,
)

const results: BuildResult[] = []
const failures: string[] = []
for (const entry of selection) {
  try {
    const result = await buildBook(entry, dryRun)
    if (result) results.push(result)
    else if (!dryRun) failures.push(entry.slug)
  } catch (err) {
    console.log(`   ✗ ${err instanceof Error ? err.message : String(err)}`)
    failures.push(entry.slug)
  }
}

if (!dryRun) {
  const books = buildIndex()
  const totalMb = results.reduce((sum, r) => sum + r.bytes, 0) / 1024 / 1024
  const pages = results.reduce((sum, r) => sum + r.pages, 0)
  const illustrations = results.reduce((sum, r) => sum + r.illustrations, 0)
  console.log(
    `\n✅ ${results.length} book(s) built · ${pages} pages · ${illustrations} illustrations · ${totalMb.toFixed(1)} MB`,
  )
  console.log(`   Library index now lists ${books.length} books.`)
  if (failures.length > 0) {
    console.log(`   ⚠️  skipped: ${failures.join(', ')}`)
  }
}
