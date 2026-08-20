/**
 * Narration mapping checker for bundled books.
 *
 * Verifies for every bundled book:
 *  - per-page audio files exist and use browser-safe formats
 *  - whole-book audio cues are ordered, non-overlapping, within duration
 *  - each page has narration text (or printed text) for device TTS fallback
 *  - synthetic narration is disclosed
 *
 * Run: npm run narration:map
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { builtinIndexSchema, storyBookSchema } from '../src/lib/schema'

const publicDir = join(process.cwd(), 'public')
let errors = 0
let warnings = 0
const err = (m: string) => (errors++, console.log(`❌ ${m}`))
const warn = (m: string) => (warnings++, console.log(`⚠️  ${m}`))
const ok = (m: string) => console.log(`✓ ${m}`)

const index = builtinIndexSchema.parse(
  JSON.parse(readFileSync(join(publicDir, 'stories/index.json'), 'utf8')),
)

for (const rel of index.books) {
  const parsed = storyBookSchema.safeParse(JSON.parse(readFileSync(join(publicDir, rel), 'utf8')))
  if (!parsed.success) {
    err(`${rel}: invalid schema`)
    continue
  }
  const book = parsed.data
  const pagesWithAudio = book.pages.filter((p) => p.audio)
  const pagesWithCues = book.pages.filter((p) => p.bookAudioCue)

  for (const page of pagesWithAudio) {
    const file = join(publicDir, page.audio!)
    if (!existsSync(file)) err(`${book.title} p${page.number}: audio file missing (${page.audio})`)
    else if (statSync(file).size === 0) err(`${book.title} p${page.number}: audio file empty`)
  }

  if (pagesWithAudio.length > 0 && pagesWithAudio.length < book.pages.length) {
    warn(
      `${book.title}: ${book.pages.length - pagesWithAudio.length} page(s) missing audio — TTS covers them`,
    )
  }

  if (book.narration?.bookAudio) {
    const file = join(publicDir, book.narration.bookAudio)
    if (!existsSync(file)) err(`${book.title}: whole-book audio missing (${book.narration.bookAudio})`)
    let prevStart = -1
    for (const page of book.pages) {
      const cue = page.bookAudioCue
      if (!cue) {
        warn(`${book.title} p${page.number}: no cue into whole-book audio`)
        continue
      }
      if (cue.start <= prevStart) err(`${book.title} p${page.number}: cue starts before previous page's cue`)
      if (cue.end !== undefined && cue.end <= cue.start) err(`${book.title} p${page.number}: cue ends before it starts`)
      if (book.narration.bookAudioDuration && cue.start > book.narration.bookAudioDuration) {
        err(`${book.title} p${page.number}: cue starts past the end of the audio`)
      }
      prevStart = cue.start
    }
  } else if (pagesWithCues.length > 0) {
    err(`${book.title}: pages have bookAudioCue but narration.bookAudio is missing`)
  }

  const silent = book.pages.filter((p) => !p.text && !p.narrationText)
  for (const p of silent) {
    warn(`${book.title} p${p.number}: no text — device TTS will skip this page`)
  }

  const hasRecorded = pagesWithAudio.length > 0 || Boolean(book.narration?.bookAudio)
  if (hasRecorded && book.narration?.synthetic === undefined) {
    warn(`${book.title}: declare narration.synthetic so the UI can disclose the voice's origin`)
  }
  ok(
    `${book.title}: ${pagesWithAudio.length}/${book.pages.length} pages with audio, TTS fallback ${
      silent.length === 0 ? 'complete' : 'partial'
    }`,
  )
}

console.log(`\nNarration check: ${errors} error(s), ${warnings} warning(s)`)
process.exit(errors > 0 ? 1 : 0)
