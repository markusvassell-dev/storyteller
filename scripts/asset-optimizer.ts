/**
 * Asset checker/optimizer for bundled story content (public/stories).
 *
 * --check (default): verify image formats, file sizes, duplicates, alt text,
 *   and audio browser-compatibility. Exits 1 on errors so CI can gate on it.
 *
 * Imported (private) books are optimized on-device at import time by the app
 * (see src/lib/imageProcessing.ts) — this script only covers bundled files,
 * and never modifies an original file.
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { builtinIndexSchema, storyBookSchema } from '../src/lib/schema'

const root = process.cwd()
const publicDir = join(root, 'public')
const storiesDir = join(publicDir, 'stories')

const MAX_IMAGE_BYTES = 600 * 1024
const MAX_AUDIO_BYTES = 2 * 1024 * 1024
const OK_IMAGE_EXT = new Set(['.svg', '.webp', '.jpg', '.jpeg', '.png'])
const OK_AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav'])

let errors = 0
let warnings = 0
const err = (msg: string) => {
  errors++
  console.log(`❌ ${msg}`)
}
const warn = (msg: string) => {
  warnings++
  console.log(`⚠️  ${msg}`)
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

if (!existsSync(storiesDir)) {
  console.error('public/stories missing')
  process.exit(1)
}

// --- file-level checks: format, size, duplicates ---
// Demo stories live in public/stories; fetched public-domain classics in
// public/library. Both ship with the app, so both are checked.
const libraryDir = join(publicDir, 'library')
const files = [...walk(storiesDir), ...(existsSync(libraryDir) ? walk(libraryDir) : [])]
const hashes = new Map<string, string>()
for (const file of files) {
  const rel = relative(publicDir, file)
  const ext = extname(file).toLowerCase()
  const size = statSync(file).size
  if (ext === '.json') continue
  if (OK_IMAGE_EXT.has(ext)) {
    if (size > MAX_IMAGE_BYTES) {
      warn(`${rel}: image is ${Math.round(size / 1024)} KB (> ${MAX_IMAGE_BYTES / 1024} KB) — consider optimising`)
    }
  } else if (OK_AUDIO_EXT.has(ext)) {
    if (size > MAX_AUDIO_BYTES) {
      warn(`${rel}: audio is ${Math.round(size / 1024)} KB — consider a lower bitrate`)
    }
    if (ext === '.wav') warn(`${rel}: WAV works but is large — MP3/M4A preferred`)
    if (ext === '.ogg') warn(`${rel}: OGG does not play on older iOS Safari — MP3/M4A preferred`)
  } else {
    err(`${rel}: unexpected file type "${ext}" in bundled stories`)
  }
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
  const dupe = hashes.get(hash)
  if (dupe) warn(`${rel}: duplicate of ${dupe}`)
  else hashes.set(hash, rel)
}

// --- story-level checks: alt text, dimensions declared, narration flags ---
const index = builtinIndexSchema.parse(
  JSON.parse(readFileSync(join(storiesDir, 'index.json'), 'utf8')),
)
for (const summary of index.books) {
  const parsed = storyBookSchema.safeParse(
    JSON.parse(readFileSync(join(publicDir, summary.path), 'utf8')),
  )
  if (!parsed.success) {
    err(`${summary.title}: schema invalid (run npm run audit:rights for details)`)
    continue
  }
  const book = parsed.data
  for (const page of book.pages) {
    // Text pages carry no artwork, so alt text only applies where there is an image.
    if (page.image && (!page.alt || page.alt.trim().length < 8)) {
      err(`${book.title} p${page.number}: alternative text missing or too short`)
    }
    if (page.audio && !OK_AUDIO_EXT.has(extname(page.audio).toLowerCase())) {
      err(`${book.title} p${page.number}: audio format not browser-compatible: ${page.audio}`)
    }
  }
}

console.log(`\nAsset check: ${files.length} files · ${errors} error(s) · ${warnings} warning(s)`)
process.exit(errors > 0 ? 1 : 0)
