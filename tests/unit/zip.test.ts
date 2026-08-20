import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { extractImagesFromZip, extractZipEntries } from '@/lib/import/zip'

function makeZip(names: string[]): Blob {
  const files: Record<string, Uint8Array> = {}
  for (const name of names) files[name] = new Uint8Array([1, 2, 3, 4])
  const bytes = zipSync(files)
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' })
}

describe('ZIP/CBZ image extraction', () => {
  it('extracts images in natural filename order', async () => {
    const zip = makeZip(['page10.png', 'page2.jpg', 'page1.png', 'cover.webp'])
    const images = await extractImagesFromZip(zip)
    expect(images.map((i) => i.name)).toEqual([
      'cover.webp',
      'page1.png',
      'page2.jpg',
      'page10.png',
    ])
  })

  it('skips junk metadata entries and non-images', async () => {
    const zip = makeZip([
      '__MACOSX/._page1.png',
      '.DS_Store',
      'notes.txt',
      'page1.png',
      'Thumbs.db',
    ])
    const images = await extractImagesFromZip(zip)
    expect(images.map((i) => i.name)).toEqual(['page1.png'])
  })

  it('assigns sensible mime types', async () => {
    const zip = makeZip(['a.jpg', 'b.png', 'c.webp'])
    const images = await extractImagesFromZip(zip)
    expect(images.map((i) => i.blob.type)).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('extractZipEntries exposes all non-junk entries', async () => {
    const zip = makeZip(['story.json', 'assets/x.png', '__MACOSX/junk'])
    const entries = await extractZipEntries(zip)
    expect([...entries.keys()].sort()).toEqual(['assets/x.png', 'story.json'])
  })
})
