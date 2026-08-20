import { test } from '@playwright/test'
import sharp from 'sharp'

/** Restrict a spec to the named Playwright projects. */
export function onlyOnProjects(names: string[]) {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(
      !names.includes(testInfo.project.name),
      `runs only on: ${names.join(', ')}`,
    )
  })
}

/** A tiny distinct SVG page image for import tests. */
export function svgPage(label: string, color: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">` +
      `<rect width="300" height="400" fill="${color}"/>` +
      `<text x="20" y="200" font-size="48" fill="#fff">${label}</text></svg>`,
  )
}

/**
 * A page as a phone camera would deliver it: a pale page floating on a
 * desk-coloured border, which is exactly what the scan-cleanup tools trim away.
 */
export function photoPage(label: string, margin = 40): Promise<Buffer> {
  const width = 300
  const height = 400
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="#604a3a"/>` +
    `<rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${height - margin * 2}" fill="#fdfbf6"/>` +
    `<text x="${margin + 16}" y="${height / 2}" font-size="40" fill="#181620">${label}</text></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * A real (if dull) WAV recording, so the browser reports a duration and can
 * seek — enough to drive the read-along timing dialog.
 */
export function wavClip(seconds = 4, sampleRate = 8000): Buffer {
  const count = Math.round(seconds * sampleRate)
  const data = Buffer.alloc(count)
  for (let i = 0; i < count; i++) {
    data[i] = 128 + Math.round(20 * Math.sin((2 * Math.PI * 220 * i) / sampleRate))
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM header length
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate, 28) // bytes per second (8-bit mono)
  header.writeUInt16LE(1, 32) // block align
  header.writeUInt16LE(8, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}
