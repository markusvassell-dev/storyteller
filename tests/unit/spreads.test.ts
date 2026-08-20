import { describe, expect, it } from 'vitest'
import { computeSpreads } from '@/features/reader/spreads'

describe('computeSpreads', () => {
  it('single-page mode: one page per spread', () => {
    expect(computeSpreads(3, false)).toEqual([[0], [1], [2]])
  })

  it('two-up mode: cover alone, then pairs', () => {
    expect(computeSpreads(6, true)).toEqual([[0], [1, 2], [3, 4], [5]])
    expect(computeSpreads(7, true)).toEqual([[0], [1, 2], [3, 4], [5, 6]])
  })

  it('handles tiny books', () => {
    expect(computeSpreads(1, true)).toEqual([[0]])
    expect(computeSpreads(0, true)).toEqual([])
    expect(computeSpreads(2, true)).toEqual([[0], [1]])
  })

  it('covers every page exactly once', () => {
    for (const count of [1, 2, 5, 8, 13]) {
      const flat = computeSpreads(count, true).flat()
      expect(flat).toEqual(Array.from({ length: count }, (_, i) => i))
    }
  })
})
