/** Group page indexes into spreads: cover alone, then pairs (2-3, 4-5…). */
export function computeSpreads(pageCount: number, twoUp: boolean): number[][] {
  if (!twoUp) return Array.from({ length: pageCount }, (_, i) => [i])
  const spreads: number[][] = []
  if (pageCount > 0) spreads.push([0])
  for (let i = 1; i < pageCount; i += 2) {
    spreads.push(i + 1 < pageCount ? [i, i + 1] : [i])
  }
  return spreads
}
