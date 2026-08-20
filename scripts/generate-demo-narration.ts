/**
 * Generates the synthetic demonstration narration for "The Tortoise and the
 * Hare" using espeak-ng (offline TTS) + lame (MP3 encode). The audio is
 * machine-generated and disclosed as such in the book's metadata.
 *
 * Requires: espeak-ng, lame (apt-get install espeak-ng lame)
 * Run: npx tsx scripts/generate-demo-narration.ts
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const slug = 'tortoise-and-hare'
const storyPath = join(process.cwd(), 'public/stories', slug, 'story.json')
const audioDir = join(process.cwd(), 'public/stories', slug, 'audio')
mkdirSync(audioDir, { recursive: true })

interface Story {
  pages: { number: number; text?: string; narrationText?: string; audio?: string }[]
}
const story = JSON.parse(readFileSync(storyPath, 'utf8')) as Story

for (const page of story.pages) {
  const text = page.narrationText ?? page.text
  if (!text || !page.audio) continue
  const wav = join(tmpdir(), `narr-${page.number}.wav`)
  const mp3 = join(audioDir, `${String(page.number).padStart(2, '0')}.mp3`)
  execFileSync('espeak-ng', ['-v', 'en-us+f3', '-s', '150', '-p', '55', '-w', wav, text])
  execFileSync('lame', ['--quiet', '-V', '5', '-m', 'm', wav, mp3])
  rmSync(wav)
  const kb = Math.round(statSync(mp3).size / 1024)
  console.log(`✓ page ${page.number} → ${mp3} (${kb} KB)`)
}
console.log('Demo narration generated (synthetic, disclosed in metadata).')
