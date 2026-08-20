import { describe, expect, it } from 'vitest'
import { clamp, formatBytes, naturalCompare, naturalSort, slugify } from '@/lib/util'

describe('naturalCompare / naturalSort', () => {
  it('sorts numbered filenames like a human', () => {
    const names = ['page10.png', 'page2.png', 'page1.png', 'page20.png', 'page3.png']
    expect(naturalSort(names, (n) => n)).toEqual([
      'page1.png',
      'page2.png',
      'page3.png',
      'page10.png',
      'page20.png',
    ])
  })

  it('is case-insensitive and stable across mixed names', () => {
    expect(naturalCompare('Cover.png', 'cover.png')).toBe(0)
    expect(naturalCompare('a2', 'A10')).toBeLessThan(0)
  })
})

describe('slugify', () => {
  it('kebab-cases titles', () => {
    expect(slugify('The Three Little Pigs!')).toBe('the-three-little-pigs')
  })
  it('strips accents and symbols', () => {
    expect(slugify('Émile’s Café — Book #2')).toBe('emile-s-cafe-book-2')
  })
  it('handles empty-ish input', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('formatBytes', () => {
  it('formats using sensible units', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
  it('rejects nonsense', () => {
    expect(formatBytes(-1)).toBe('—')
  })
})

describe('clamp', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-2, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })
})
