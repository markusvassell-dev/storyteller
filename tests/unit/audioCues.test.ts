import { describe, expect, it } from 'vitest'
import {
  cuesFromMarks,
  evenlySpacedCues,
  formatTime,
  marksFromCues,
  validateCues,
  type Cue,
} from '@/lib/audioCues'

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(9)).toBe('0:09')
    expect(formatTime(65.7)).toBe('1:05')
    expect(formatTime(3600)).toBe('60:00')
  })

  it('shows a placeholder for values it cannot format', () => {
    expect(formatTime(undefined)).toBe('–:––')
    expect(formatTime(-1)).toBe('–:––')
    expect(formatTime(Number.NaN)).toBe('–:––')
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('–:––')
  })
})

describe('cuesFromMarks', () => {
  it('treats each mark as the end of a page and the start of the next', () => {
    expect(cuesFromMarks([10, 20, 30], 4, 45)).toEqual([
      { start: 0, end: 10 },
      { start: 10, end: 20 },
      { start: 20, end: 30 },
      { start: 30, end: 45 },
    ])
  })

  it('runs the last page to the end of the recording only when the duration is known', () => {
    expect(cuesFromMarks([12], 2)).toEqual([
      { start: 0, end: 12 },
      { start: 12, end: undefined },
    ])
  })

  it('leaves pages that have not been reached yet without a cue', () => {
    const cues = cuesFromMarks([10, 20], 4, 60)
    expect(cues[0]).toEqual({ start: 0, end: 10 })
    expect(cues[2]).toEqual({ start: 20, end: undefined })
    expect(cues[3]).toBeUndefined()
  })

  it('sorts marks tapped out of order', () => {
    expect(cuesFromMarks([30, 10, 20], 4, 45)).toEqual(cuesFromMarks([10, 20, 30], 4, 45))
  })

  it('never emits an end at or before its start', () => {
    // Two taps in the same instant would otherwise make a zero-length page.
    const cues = cuesFromMarks([10, 10], 3, 40)
    expect(cues[1]).toEqual({ start: 10, end: undefined })
  })

  it('handles a single-page book', () => {
    expect(cuesFromMarks([], 1, 30)).toEqual([{ start: 0, end: 30 }])
    expect(cuesFromMarks([], 1)).toEqual([{ start: 0, end: undefined }])
  })

  it('produces nothing for a book with no pages', () => {
    expect(cuesFromMarks([5], 0, 10)).toEqual([])
  })
})

describe('marksFromCues', () => {
  it('round-trips through cuesFromMarks', () => {
    const marks = [10, 20, 30]
    const cues = cuesFromMarks(marks, 4, 45)
    // The trailing mark is the recording's end, which cuesFromMarks re-reads.
    expect(marksFromCues(cues)).toEqual([10, 20, 30, 45])
    expect(cuesFromMarks(marksFromCues(cues), 4, 45)).toEqual(cues)
  })

  it('omits the trailing mark when the last page has no end', () => {
    const cues: (Cue | undefined)[] = [{ start: 0, end: 8 }, { start: 8 }]
    expect(marksFromCues(cues)).toEqual([8])
  })

  it('ignores pages with no cue yet', () => {
    expect(marksFromCues([{ start: 0, end: 9 }, { start: 9 }, undefined])).toEqual([9])
  })

  it('returns nothing for an untimed book', () => {
    expect(marksFromCues([undefined, undefined])).toEqual([])
  })
})

describe('evenlySpacedCues', () => {
  it('divides the recording equally and covers it end to end', () => {
    expect(evenlySpacedCues(4, 60)).toEqual([
      { start: 0, end: 15 },
      { start: 15, end: 30 },
      { start: 30, end: 45 },
      { start: 45, end: 60 },
    ])
  })

  it('leaves no gaps between consecutive pages', () => {
    const cues = evenlySpacedCues(7, 100)
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]!.start).toBe(cues[i - 1]!.end)
    }
    expect(cues.at(-1)!.end).toBeCloseTo(100, 1)
  })

  it('is accepted by validateCues', () => {
    expect(validateCues(evenlySpacedCues(9, 123.4), 123.4)).toEqual([])
  })

  it('survives a zero-page book', () => {
    expect(evenlySpacedCues(0, 60)).toEqual([])
  })
})

describe('validateCues', () => {
  it('accepts a well-ordered set', () => {
    expect(validateCues(cuesFromMarks([10, 20, 30], 4, 45), 45)).toEqual([])
  })

  it('accepts a partly-marked book', () => {
    expect(validateCues([{ start: 0, end: 10 }, { start: 10 }, undefined], 60)).toEqual([])
  })

  it('flags a page that starts before the previous one', () => {
    const problems = validateCues([{ start: 0 }, { start: 30 }, { start: 12 }])
    expect(problems).toEqual([{ pageNumber: 3, message: 'starts before the previous page' }])
  })

  it('flags a page that ends before it starts', () => {
    const problems = validateCues([{ start: 10, end: 4 }])
    expect(problems).toEqual([{ pageNumber: 1, message: 'ends before it starts' }])
  })

  it('flags negative starts and starts past the end of the recording', () => {
    const problems = validateCues([{ start: -3 }, { start: 500 }], 120)
    expect(problems).toContainEqual({ pageNumber: 1, message: 'starts before the recording begins' })
    expect(problems).toContainEqual({ pageNumber: 2, message: 'starts after the recording ends' })
  })

  it('does not compare against pages that have no cue', () => {
    // A gap in the middle must not read as "out of order".
    expect(validateCues([{ start: 0 }, undefined, { start: 20 }])).toEqual([])
  })

  it('reports the page number a grown-up would recognise (1-based)', () => {
    const problems = validateCues([{ start: 0 }, { start: 0 }])
    expect(problems[0]!.pageNumber).toBe(2)
  })
})
