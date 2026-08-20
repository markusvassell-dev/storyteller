/**
 * Rights auditor for BUNDLED content (public/stories). Runs before every
 * production build and fails the build on critical issues, so no book with
 * unresolved or private-only rights can ever ship with the deployed app.
 *
 * Run: npx tsx scripts/rights-audit.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { builtinIndexSchema, storyBookSchema } from '../src/lib/schema'

const root = process.cwd()
const publicDir = join(root, 'public')

interface Finding {
  book: string
  severity: 'error' | 'warning'
  message: string
}
const findings: Finding[] = []
const err = (book: string, message: string) => findings.push({ book, severity: 'error', message })
const warn = (book: string, message: string) => findings.push({ book, severity: 'warning', message })

const indexPath = join(publicDir, 'stories/index.json')
if (!existsSync(indexPath)) {
  console.error('❌ public/stories/index.json missing')
  process.exit(1)
}

const index = builtinIndexSchema.safeParse(JSON.parse(readFileSync(indexPath, 'utf8')))
if (!index.success) {
  console.error('❌ stories/index.json invalid:', index.error.message)
  process.exit(1)
}

for (const rel of index.data.books) {
  const file = join(publicDir, rel)
  const label = rel
  if (!existsSync(file)) {
    err(label, 'story.json listed in index but missing on disk')
    continue
  }
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    err(label, `invalid JSON: ${e}`)
    continue
  }
  const parsed = storyBookSchema.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      err(label, `schema: ${issue.path.join('.')}: ${issue.message}`)
    }
    continue
  }
  const book = parsed.data
  const r = book.rights

  // --- critical rights rules for anything that ships publicly ---
  if (r.status === 'needs-review') {
    err(book.title, 'rights status is needs-review — quarantined content must not be bundled')
  }
  if (r.status === 'owner-permission') {
    err(book.title, 'owner-permission (private) material must never be bundled into the deployed app')
  }
  if (r.personalUseOnly) {
    err(book.title, 'material marked personal-use-only is being prepared for remote hosting')
  }
  if (!r.remoteStorageAllowed) {
    err(book.title, 'bundled content must have remoteStorageAllowed=true (it will be served from the host)')
  }
  if (r.status === 'creative-commons') {
    if (!r.license) err(book.title, 'Creative-Commons content must name its licence')
    if (!r.attributionRequired && !book.attribution) {
      err(book.title, 'CC-licensed content needs attribution recorded')
    }
    if (!r.sourceUrl) warn(book.title, 'CC content should record its source URL')
  }
  if (r.status === 'public-domain') {
    if (!r.publicDomainBasis) err(book.title, 'public-domain claim needs a recorded basis')
    if (!r.sourceUrl && !r.sourceOfFiles) {
      warn(book.title, 'public-domain content should record where the files came from')
    }
  }
  if (!book.source) warn(book.title, 'no human-readable source summary')
  if (!book.attribution) warn(book.title, 'no attribution text')
  if (book.illustrators.length === 0) {
    err(book.title, 'bundled artwork has no recorded illustrator/provenance')
  }
  if (!book.rightsCheckedAt) warn(book.title, 'rightsCheckedAt not recorded')

  // --- every referenced asset must exist on disk with documented provenance ---
  const refs = [
    book.cover,
    book.thumbnail,
    book.narration?.bookAudio,
    ...book.pages.flatMap((p) => [p.image, p.audio]),
  ].filter((x): x is string => Boolean(x))
  for (const ref of refs) {
    if (ref.startsWith('idb:')) {
      err(book.title, `bundled book references device-local asset ${ref}`)
    } else if (!existsSync(join(publicDir, ref))) {
      err(book.title, `asset missing on disk: ${ref}`)
    }
  }
  if (book.narration?.synthetic === undefined && (book.narration?.bookAudio || book.pages.some((p) => p.audio))) {
    warn(book.title, 'narration audio present but synthetic/human origin not declared')
  }
}

const errors = findings.filter((f) => f.severity === 'error')
const warnings = findings.filter((f) => f.severity === 'warning')

for (const f of findings) {
  console.log(`${f.severity === 'error' ? '❌' : '⚠️ '} [${f.book}] ${f.message}`)
}
console.log(
  `\nRights audit: ${index.data.books.length} bundled books · ${errors.length} error(s) · ${warnings.length} warning(s)`,
)
if (errors.length > 0) {
  console.error('Rights audit FAILED — fix the errors above before building.')
  process.exit(1)
}
console.log('Rights audit passed ✅')
