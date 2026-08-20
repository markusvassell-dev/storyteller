import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { onlyOnProjects } from './helpers'

async function expectNoSeriousViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    serious,
    `${context}: ${serious.map((v) => `${v.id} (${v.nodes.length} nodes)`).join(', ')}`,
  ).toEqual([])
}

test.describe('accessibility scans (axe, WCAG 2.2 AA rules)', () => {
  onlyOnProjects(['iphone-portrait', 'desktop-admin'])

  test('library home', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Recently Added' }).waitFor()
    await expectNoSeriousViolations(page, 'home')
  })

  test('book details', async ({ page }) => {
    await page.goto('/book/tortoise-and-hare')
    await page.getByRole('heading', { name: /tortoise/i }).waitFor()
    await expectNoSeriousViolations(page, 'details')
  })

  test('reader', async ({ page }) => {
    await page.goto('/read/three-little-pigs')
    await page.getByText('1 / 8').waitFor()
    await expectNoSeriousViolations(page, 'reader')
  })

  test('settings', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('heading', { name: 'Settings' }).waitFor()
    await expectNoSeriousViolations(page, 'settings')
  })

  test('install guide', async ({ page }) => {
    await page.goto('/settings/install')
    await page.getByRole('heading', { name: /install on iphone/i }).waitFor()
    await expectNoSeriousViolations(page, 'install guide')
  })
})
