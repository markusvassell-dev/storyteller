import { describe, expect, it } from 'vitest'
import { autoTrimBounds, isEdited, isFullFrame, NO_EDIT, type Rect } from '@/lib/imageEditing'

/** Builds an RGBA buffer: a solid background with an optional content block. */
function canvas(
  width: number,
  height: number,
  background: [number, number, number],
  content?: { x: number; y: number; w: number; h: number; color: [number, number, number] },
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside =
        content !== undefined &&
        x >= content.x &&
        x < content.x + content.w &&
        y >= content.y &&
        y < content.y + content.h
      const [r, g, b] = inside ? content.color : background
      const i = (y * width + x) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = 255
    }
  }
  return pixels
}

const WHITE: [number, number, number] = [255, 255, 255]
const DESK: [number, number, number] = [96, 74, 58]
const INK: [number, number, number] = [24, 22, 30]

/** A sliver of the original is kept around the detected content by default. */
const PAD = 0.004

describe('autoTrimBounds', () => {
  it('finds a page sitting on a contrasting background', () => {
    // A 60×70 page photographed on a desk, offset from the frame's corner.
    const pixels = canvas(100, 100, DESK, { x: 20, y: 15, w: 60, h: 70, color: WHITE })
    const rect = autoTrimBounds(pixels, 100, 100)
    expect(rect.x).toBeCloseTo(0.2 - PAD, 4)
    expect(rect.y).toBeCloseTo(0.15 - PAD, 4)
    expect(rect.width).toBeCloseTo(0.6 + PAD * 2, 4)
    expect(rect.height).toBeCloseTo(0.7 + PAD * 2, 4)
    expect(isFullFrame(rect)).toBe(false)
  })

  it('trims only the axis that needs it', () => {
    // Letterboxed: bars above and below, page bleeding to both side edges.
    const pixels = canvas(100, 100, DESK, { x: 0, y: 20, w: 100, h: 60, color: WHITE })
    const rect = autoTrimBounds(pixels, 100, 100)
    expect(rect.x).toBe(0)
    expect(rect.width).toBe(1)
    expect(rect.y).toBeCloseTo(0.2 - PAD, 4)
    expect(rect.height).toBeCloseTo(0.6 + PAD * 2, 4)
  })

  it('never lets padding push the crop outside the frame', () => {
    const pixels = canvas(100, 100, DESK, { x: 0, y: 20, w: 100, h: 60, color: WHITE })
    const rect = autoTrimBounds(pixels, 100, 100)
    expect(rect.x + rect.width).toBeLessThanOrEqual(1)
    expect(rect.y + rect.height).toBeLessThanOrEqual(1)
  })

  it('leaves a page that already fills the frame alone', () => {
    const rect = autoTrimBounds(canvas(100, 100, WHITE), 100, 100)
    expect(isFullFrame(rect)).toBe(true)
  })

  it('refuses a trim that would throw most of the picture away', () => {
    // A stamp-sized mark on a big empty field is far likelier to be a smudge
    // than the page, so the safe answer is to change nothing.
    const pixels = canvas(100, 100, WHITE, { x: 44, y: 44, w: 15, h: 15, color: INK })
    expect(isFullFrame(autoTrimBounds(pixels, 100, 100))).toBe(true)
  })

  it('is not fooled by a single odd border pixel', () => {
    const pixels = canvas(100, 100, DESK, { x: 20, y: 15, w: 60, h: 70, color: WHITE })
    // A highlight in the corner: the median of the border ring ignores it.
    pixels[0] = 255
    pixels[1] = 250
    pixels[2] = 240
    const rect = autoTrimBounds(pixels, 100, 100)
    expect(rect.x).toBeCloseTo(0.2 - PAD, 4)
    expect(rect.height).toBeCloseTo(0.7 + PAD * 2, 4)
  })

  it('respects a tighter tolerance', () => {
    // A page barely lighter than the desk is found generously, missed strictly.
    const nearly: [number, number, number] = [120, 100, 84]
    const pixels = canvas(100, 100, DESK, { x: 20, y: 15, w: 60, h: 70, color: nearly })
    expect(isFullFrame(autoTrimBounds(pixels, 100, 100, { tolerance: 4 }))).toBe(false)
    expect(isFullFrame(autoTrimBounds(pixels, 100, 100, { tolerance: 60 }))).toBe(true)
  })

  it('keeps no padding when asked for none', () => {
    const pixels = canvas(100, 100, DESK, { x: 20, y: 15, w: 60, h: 70, color: WHITE })
    const rect = autoTrimBounds(pixels, 100, 100, { padding: 0 })
    expect(rect).toEqual({ x: 0.2, y: 0.15, width: 0.6, height: 0.7 })
  })

  it('declines to measure an image too small to judge', () => {
    expect(isFullFrame(autoTrimBounds(canvas(4, 4, DESK), 4, 4))).toBe(true)
  })
})

describe('isFullFrame', () => {
  it('accepts the whole frame and rounding noise around it', () => {
    expect(isFullFrame({ x: 0, y: 0, width: 1, height: 1 })).toBe(true)
    expect(isFullFrame({ x: 0.0005, y: 0, width: 0.9995, height: 1 })).toBe(true)
  })

  it('rejects a real crop', () => {
    expect(isFullFrame({ x: 0.05, y: 0, width: 0.95, height: 1 })).toBe(false)
    expect(isFullFrame({ x: 0, y: 0, width: 1, height: 0.8 })).toBe(false)
  })
})

describe('isEdited', () => {
  const full: Rect = { x: 0, y: 0, width: 1, height: 1 }

  it('is false for no edit at all', () => {
    expect(isEdited(undefined)).toBe(false)
    expect(isEdited(NO_EDIT)).toBe(false)
    expect(isEdited({ rotate: 0, crop: full })).toBe(false)
  })

  it('is true once the page is rotated or cropped', () => {
    expect(isEdited({ rotate: 90 })).toBe(true)
    expect(isEdited({ rotate: -1.5 })).toBe(true)
    expect(isEdited({ rotate: 0, crop: { x: 0.1, y: 0, width: 0.9, height: 1 } })).toBe(true)
    expect(isEdited({ rotate: 0, crop: { x: 0, y: 0, width: 1, height: 0.7 } })).toBe(true)
  })
})
