import { test } from '@playwright/test'

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
