/**
 * Broken-reference checker. Confirms every asset referenced by bundled
 * stories exists, every doc file cross-link resolves, and the built output
 * (when dist/ exists) contains the PWA essentials.
 *
 * Run: npm run audit:links
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { builtinIndexSchema, storyBookSchema } from '../src/lib/schema'

const root = process.cwd()
let errors = 0
const err = (m: string) => (errors++, console.log(`❌ ${m}`))
const ok = (m: string) => console.log(`✓ ${m}`)

// --- story asset refs ---
const publicDir = join(root, 'public')
const index = builtinIndexSchema.parse(
  JSON.parse(readFileSync(join(publicDir, 'stories/index.json'), 'utf8')),
)
let refCount = 0
for (const summary of index.books) {
  if (!existsSync(join(publicDir, summary.path))) {
    err(`index.json → missing ${summary.path}`)
    continue
  }
  refCount++
  if (!existsSync(join(publicDir, summary.cover))) {
    err(`${summary.title}: index cover missing (${summary.cover})`)
  }
  const parsed = storyBookSchema.safeParse(JSON.parse(readFileSync(join(publicDir, summary.path), 'utf8')))
  if (!parsed.success) continue
  const book = parsed.data
  const refs = [
    book.cover,
    book.thumbnail,
    book.narration?.bookAudio,
    ...book.pages.flatMap((p) => [p.image, p.audio]),
  ].filter((x): x is string => Boolean(x))
  for (const ref of refs) {
    refCount++
    if (!ref.startsWith('idb:') && !existsSync(join(publicDir, ref))) {
      err(`${book.title}: broken asset ref ${ref}`)
    }
  }
}
ok(`${refCount} story asset references checked`)

// --- docs cross-links (relative .md links) ---
const docsDir = join(root, 'docs')
if (existsSync(docsDir)) {
  const mdFiles = readdirSync(docsDir).filter((f) => f.endsWith('.md'))
  mdFiles.push('../README.md')
  let docLinks = 0
  for (const f of mdFiles) {
    const file = join(docsDir, f)
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)/g)) {
      const target = join(docsDir, f.startsWith('..') ? '..' : '.', match[1]!)
      docLinks++
      if (!existsSync(target)) err(`${f}: broken link → ${match[1]}`)
    }
  }
  ok(`${docLinks} doc links checked`)
}

// --- built output (only when dist exists) ---
const dist = join(root, 'dist')
if (existsSync(dist)) {
  for (const required of ['index.html', 'sw.js', 'manifest.webmanifest', 'icons/pwa-512.png']) {
    if (!existsSync(join(dist, required))) err(`dist missing ${required}`)
  }
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8')) as {
    icons?: { src: string }[]
    start_url?: string
    display?: string
    name?: string
  }
  if (!manifest.name || manifest.display !== 'standalone' || !manifest.start_url) {
    err('manifest.webmanifest missing name/display=standalone/start_url')
  }
  for (const icon of manifest.icons ?? []) {
    if (!existsSync(join(dist, icon.src))) err(`manifest icon missing: ${icon.src}`)
  }
  const sw = readFileSync(join(dist, 'sw.js'), 'utf8')
  if (!sw.includes('index.html')) err('service worker does not precache index.html')
  ok('dist PWA essentials checked')
} else {
  ok('dist/ not present — skipped build checks (run npm run build first)')
}

console.log(`\nLink check: ${errors} error(s)`)
process.exit(errors > 0 ? 1 : 0)
