/**
 * Internet Archive source adapter — true scanned page images via IIIF.
 *
 * DORMANT in the environment this was built in: archive.org and
 * iiif.archive.org are blocked by the organisation's egress policy.
 *
 * This is the adapter that produces books which look exactly like the printed
 * originals, because each reader page is a photograph of the real page rather
 * than reflowed text. Enable by allowing `archive.org` and `iiif.archive.org`
 * in the Claude egress settings.
 *
 * Only items whose metadata reports a public-domain rights statement are
 * accepted; anything else throws rather than being silently bundled.
 */

const METADATA = 'https://archive.org/metadata'
const IIIF = 'https://iiif.archive.org/iiif'

export class SourceUnavailableError extends Error {}
export class RightsUnclearError extends Error {}

interface ArchiveMetadata {
  metadata?: {
    identifier?: string
    title?: string
    creator?: string | string[]
    date?: string
    publisher?: string
    licenseurl?: string
    rights?: string
    'possible-copyright-status'?: string
  }
  files?: { name: string; format: string; size?: string }[]
}

const PUBLIC_DOMAIN = /public\s*domain|no known copyright|not in copyright|cc0/i

export async function fetchArchiveMetadata(identifier: string): Promise<ArchiveMetadata> {
  let res: Response
  try {
    res = await fetch(`${METADATA}/${identifier}`)
  } catch {
    throw new SourceUnavailableError(
      'archive.org is not reachable from this environment (egress policy). ' +
        'Allow archive.org and iiif.archive.org in the Claude egress settings to use scanned page images.',
    )
  }
  if (!res.ok) throw new Error(`archive.org metadata ${identifier} → HTTP ${res.status}`)
  return (await res.json()) as ArchiveMetadata
}

/** Refuses anything not clearly marked public domain. */
export function assertPublicDomain(meta: ArchiveMetadata, identifier: string): string {
  const m = meta.metadata ?? {}
  const statement = [m.rights, m['possible-copyright-status'], m.licenseurl]
    .filter(Boolean)
    .join(' ')
  if (!PUBLIC_DOMAIN.test(statement)) {
    throw new RightsUnclearError(
      `archive.org item "${identifier}" does not carry a clear public-domain statement (found: ${
        statement || 'nothing'
      }). Not bundling it.`,
    )
  }
  return statement
}

export interface ScannedPage {
  index: number
  data: Buffer
}

/**
 * Downloads scanned page images through the IIIF image API at a size suited
 * to a tablet screen.
 */
export async function fetchScannedPages(
  identifier: string,
  pageCount: number,
  maxEdge = 1600,
  onProgress?: (done: number, total: number) => void,
): Promise<ScannedPage[]> {
  const pages: ScannedPage[] = []
  for (let i = 0; i < pageCount; i++) {
    const url = `${IIIF}/${identifier}$${i}/full/!${maxEdge},${maxEdge}/0/default.jpg`
    const res = await fetch(url)
    if (!res.ok) continue
    pages.push({ index: i, data: Buffer.from(await res.arrayBuffer()) })
    onProgress?.(i + 1, pageCount)
    await new Promise((r) => setTimeout(r, 200))
  }
  return pages
}
