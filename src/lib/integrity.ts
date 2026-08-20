import { db } from './db'
import { staticUrl, verifyBookAssets } from './assets'
import { validateStoryBook, type StoryBook } from './schema'
import type { LibraryBook } from './library'

/** Library integrity check, runnable from the admin screen. */

export interface IntegrityFinding {
  bookTitle: string
  bookId: string
  severity: 'error' | 'warning'
  message: string
}

function collectRefs(book: StoryBook): string[] {
  const refs = [book.cover, book.thumbnail, book.narration?.bookAudio]
  for (const p of book.pages) refs.push(p.image, p.audio)
  return refs.filter((r): r is string => Boolean(r))
}

async function staticExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(staticUrl(path), { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

export async function runIntegrityCheck(
  books: LibraryBook[],
  invalidBuiltins: { path: string; issues: string[] }[],
): Promise<IntegrityFinding[]> {
  const findings: IntegrityFinding[] = []

  for (const inv of invalidBuiltins) {
    findings.push({
      bookTitle: inv.path,
      bookId: inv.path,
      severity: 'error',
      message: `Built-in book failed validation: ${inv.issues.join('; ')}`,
    })
  }

  for (const entry of books) {
    const { book } = entry
    const result = validateStoryBook(book)
    if (!result.ok) {
      for (const issue of result.issues) {
        findings.push({
          bookTitle: book.title,
          bookId: book.id,
          severity: 'error',
          message: `${issue.path}: ${issue.message}`,
        })
      }
      continue
    }
    for (const issue of result.issues) {
      findings.push({
        bookTitle: book.title,
        bookId: book.id,
        severity: issue.severity,
        message: `${issue.path}: ${issue.message}`,
      })
    }

    const refs = collectRefs(book)
    const missingLocal = await verifyBookAssets(refs)
    for (const ref of missingLocal) {
      findings.push({
        bookTitle: book.title,
        bookId: book.id,
        severity: 'error',
        message: `Asset missing from this device: ${ref}`,
      })
    }
    // Spot-check the first static asset so a broken deploy is noticed.
    const firstStatic = refs.find((r) => !r.startsWith('idb:'))
    if (firstStatic && !(await staticExists(firstStatic))) {
      findings.push({
        bookTitle: book.title,
        bookId: book.id,
        severity: entry.origin === 'builtin' ? 'error' : 'warning',
        message: `Bundled asset unreachable: ${firstStatic}`,
      })
    }

    if (entry.quarantined) {
      findings.push({
        bookTitle: book.title,
        bookId: book.id,
        severity: 'warning',
        message: 'Rights are marked needs-review — the book is quarantined from the library',
      })
    }
  }

  // Orphaned assets (book deleted but blobs left behind).
  const bookIds = new Set(books.map((b) => b.book.id))
  const assetRows = await db.assets.toArray()
  const orphans = assetRows.filter((a) => !bookIds.has(a.bookId))
  if (orphans.length > 0) {
    findings.push({
      bookTitle: '(storage)',
      bookId: '__orphans__',
      severity: 'warning',
      message: `${orphans.length} stored file(s) belong to no book — remove them from Storage`,
    })
  }

  return findings
}
