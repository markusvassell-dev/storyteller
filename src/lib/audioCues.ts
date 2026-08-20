/**
 * Helpers for mapping one whole-book recording onto a book's pages.
 *
 * The natural way to do this is to listen and tap as each page ends, so these
 * functions are written around a growing list of tap times rather than a form
 * full of numbers.
 */

export interface Cue {
  start: number
  end?: number
}

/** Formats seconds as m:ss for the marking UI. */
export function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '–:––'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Turns tap times into per-page cues.
 *
 * `marks[i]` is when page `i + 1` *ends*, so page 1 runs from 0 to marks[0],
 * page 2 from marks[0] to marks[1], and so on. Pages not yet reached get no
 * cue. The final page ends at the recording's end when known.
 */
export function cuesFromMarks(marks: number[], pageCount: number, duration?: number): (Cue | undefined)[] {
  const sorted = [...marks].sort((a, b) => a - b)
  const cues: (Cue | undefined)[] = []
  for (let i = 0; i < pageCount; i++) {
    const start = i === 0 ? 0 : sorted[i - 1]
    if (start === undefined) {
      cues.push(undefined)
      continue
    }
    const end = sorted[i] ?? (i === pageCount - 1 ? duration : undefined)
    cues.push({ start, end: end !== undefined && end > start ? end : undefined })
  }
  return cues
}

/** Reverses `cuesFromMarks` so existing timings can be re-edited by tapping. */
export function marksFromCues(cues: (Cue | undefined)[]): number[] {
  const marks: number[] = []
  for (let i = 1; i < cues.length; i++) {
    const start = cues[i]?.start
    if (start !== undefined) marks.push(start)
  }
  const last = cues[cues.length - 1]
  if (last?.end !== undefined) marks.push(last.end)
  return marks
}

/** Spreads pages evenly across a recording — a starting point to refine. */
export function evenlySpacedCues(pageCount: number, duration: number): Cue[] {
  const step = duration / Math.max(1, pageCount)
  return Array.from({ length: pageCount }, (_, i) => ({
    start: Number((i * step).toFixed(2)),
    end: Number(((i + 1) * step).toFixed(2)),
  }))
}

export interface CueProblem {
  pageNumber: number
  message: string
}

/** Checks a set of cues for the mistakes that make playback misbehave. */
export function validateCues(cues: (Cue | undefined)[], duration?: number): CueProblem[] {
  const problems: CueProblem[] = []
  let previousStart = -1
  cues.forEach((cue, i) => {
    const pageNumber = i + 1
    if (!cue) return
    if (cue.start < 0) {
      problems.push({ pageNumber, message: 'starts before the recording begins' })
    }
    if (cue.start <= previousStart) {
      problems.push({ pageNumber, message: 'starts before the previous page' })
    }
    if (cue.end !== undefined && cue.end <= cue.start) {
      problems.push({ pageNumber, message: 'ends before it starts' })
    }
    if (duration !== undefined && cue.start > duration) {
      problems.push({ pageNumber, message: 'starts after the recording ends' })
    }
    previousStart = cue.start
  })
  return problems
}
