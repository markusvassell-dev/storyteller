/**
 * Generates a bookplate-style cover for titles whose source edition has no
 * usable cover art (most text-only classics). Original artwork made from
 * simple shapes and type — no external assets, nothing copied.
 *
 * The palette is chosen deterministically from the slug so a book always
 * looks the same, while the shelf as a whole stays varied.
 */

const PALETTES: { cloth: string; deep: string; ink: string; foil: string }[] = [
  { cloth: '#7b3b3b', deep: '#5e2b2b', ink: '#fdf3e3', foil: '#e8c07a' },
  { cloth: '#2f4858', deep: '#22353f', ink: '#f2f6f8', foil: '#d9b26a' },
  { cloth: '#3d5a45', deep: '#2c4233', ink: '#f3f7ee', foil: '#dcc07d' },
  { cloth: '#4a3b62', deep: '#372c49', ink: '#f6f1fb', foil: '#e0c07f' },
  { cloth: '#8a5a2b', deep: '#6a441f', ink: '#fdf4e6', foil: '#f0d49b' },
  { cloth: '#334a63', deep: '#26374a', ink: '#f1f5fa', foil: '#d8bb79' },
  { cloth: '#6b2f45', deep: '#502233', ink: '#fdf1f4', foil: '#e5bd80' },
  { cloth: '#3f5250', deep: '#2e3d3c', ink: '#f0f6f5', foil: '#d7bd7d' },
]

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Wraps a title into lines that fit the plate, longest-word aware. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

export interface CoverOptions {
  title: string
  authors: string[]
  slug: string
  /** Shown small at the foot of the plate, e.g. "Illustrated by Walter Crane". */
  footnote?: string
}

const W = 900
const H = 1200

export function generateCoverSvg({ title, authors, slug, footnote }: CoverOptions): string {
  const p = PALETTES[hash(slug) % PALETTES.length]!
  const titleLines = wrap(title.toUpperCase(), title.length > 28 ? 16 : 13)
  const titleSize = titleLines.length > 3 ? 78 : titleLines.length > 2 ? 92 : 104
  const titleTop = H / 2 - ((titleLines.length - 1) * titleSize * 1.12) / 2 - 40

  const author = authors.join(' · ')
  const authorLines = wrap(author, 30).slice(0, 2)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.cloth}"/>
      <stop offset="1" stop-color="${p.deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#cloth)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- spine shading -->
  <rect x="0" y="0" width="46" height="${H}" fill="#000" opacity="0.16"/>
  <rect x="46" y="0" width="6" height="${H}" fill="${p.foil}" opacity="0.35"/>

  <!-- foil frame -->
  <rect x="96" y="80" width="${W - 176}" height="${H - 160}" fill="none"
        stroke="${p.foil}" stroke-width="4" opacity="0.85"/>
  <rect x="112" y="96" width="${W - 208}" height="${H - 192}" fill="none"
        stroke="${p.foil}" stroke-width="1.5" opacity="0.6"/>

  <!-- corner flourishes -->
  ${[
    [96, 80, 1, 1],
    [W - 80, 80, -1, 1],
    [96, H - 80, 1, -1],
    [W - 80, H - 80, -1, -1],
  ]
    .map(
      ([x, y, sx, sy]) =>
        `<path d="M${x} ${y! + 46 * sy!} L${x} ${y} L${x! + 46 * sx!} ${y}" fill="none" stroke="${p.foil}" stroke-width="6" opacity="0.9"/>`,
    )
    .join('\n  ')}

  <!-- title -->
  ${titleLines
    .map(
      (line, i) =>
        `<text x="${W / 2}" y="${titleTop + i * titleSize * 1.12}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700"
        letter-spacing="2" fill="${p.ink}">${escapeXml(line)}</text>`,
    )
    .join('\n  ')}

  <!-- rule -->
  <path d="M${W / 2 - 150} ${titleTop + titleLines.length * titleSize * 1.12 + 6} H${W / 2 + 150}"
        stroke="${p.foil}" stroke-width="3" opacity="0.9"/>
  <circle cx="${W / 2}" cy="${titleTop + titleLines.length * titleSize * 1.12 + 6}" r="9" fill="${p.foil}" opacity="0.9"/>

  <!-- author -->
  ${authorLines
    .map(
      (line, i) =>
        `<text x="${W / 2}" y="${titleTop + titleLines.length * titleSize * 1.12 + 86 + i * 46}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="40" font-style="italic"
        fill="${p.ink}" opacity="0.92">${escapeXml(line)}</text>`,
    )
    .join('\n  ')}

  ${
    footnote
      ? `<text x="${W / 2}" y="${H - 132}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="26"
        fill="${p.ink}" opacity="0.72">${escapeXml(footnote)}</text>`
      : ''
  }

  <text x="${W / 2}" y="${H - 150}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="30"
        fill="${p.foil}" opacity="0.95">✦</text>
</svg>
`
}
