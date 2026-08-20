import { expect, test } from '@playwright/test'
import { onlyOnProjects } from './helpers'

test.describe('reader on a phone', () => {
  onlyOnProjects(['iphone-portrait', 'iphone-landscape'])

  test('turns pages with visible buttons and saves progress', async ({ page }) => {
    await page.goto('/read/three-little-pigs')
    await expect(page.getByText('1 / 8')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText('2 / 8')).toBeVisible()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText('3 / 8')).toBeVisible()
    await page.waitForTimeout(300)

    // Details page offers to resume from the saved page.
    await page.goto('/book/three-little-pigs')
    await expect(page.getByRole('button', { name: /resume page 3/i })).toBeVisible()

    // Reader itself resumes.
    await page.goto('/read/three-little-pigs')
    await expect(page.getByText('3 / 8')).toBeVisible()

    // Continue Reading shelf appears at home.
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Continue Reading' })).toBeVisible()
  })

  test('debounces rapid taps so one tap turns one page', async ({ page }) => {
    await page.goto('/read/goldilocks')
    await expect(page.getByText('1 / 8')).toBeVisible()
    // Fire three taps inside the debounce window (synchronously, so test
    // latency can't spread them out) — only one page turn may result.
    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>('button[aria-label="Next page"]')
      btn?.click()
      btn?.click()
      btn?.click()
    })
    await expect(page.getByText('2 / 8')).toBeVisible()
  })

  test('start-over query resets to page one', async ({ page }) => {
    await page.goto('/read/star-coins')
    await page.getByRole('button', { name: 'Next page' }).click()
    await page.waitForTimeout(350)
    await page.goto('/read/star-coins?page=1')
    await expect(page.getByText('1 / 6')).toBeVisible()
  })

  test('shows page text and artwork with alt text', async ({ page }) => {
    await page.goto('/read/three-little-pigs')
    await expect(page.getByText(/three little pigs waved goodbye/i)).toBeVisible()
    await expect(
      page.getByRole('img', { name: /Three smiling pigs/i }),
    ).toBeVisible()
  })

  test('display menu adjusts text size and reduced motion', async ({ page }) => {
    await page.goto('/read/three-little-pigs')
    await page.getByRole('button', { name: 'Display options' }).click()
    await page.getByRole('button', { name: 'AAA' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'huge')
    await page.getByLabel('Reduce motion').check()
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
  })
})

test.describe('reader keyboard support', () => {
  onlyOnProjects(['desktop-admin'])

  test('arrow keys, Home/End and Escape work', async ({ page }) => {
    await page.goto('/read/billy-goats-gruff')
    await expect(page.getByText(/1(–2)? \/ 7/)).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/2(–3)? \/ 7/)).toBeVisible()
    await page.waitForTimeout(350)
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByText(/1(–2)? \/ 7/)).toBeVisible()
    await page.waitForTimeout(350)
    await page.keyboard.press('End')
    await expect(page.getByText(/7 \/ 7/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/book\/billy-goats-gruff/)
  })
})

test.describe('two-page spread on tablets', () => {
  onlyOnProjects(['ipad-landscape'])

  test('landscape iPad pairs pages like a real book', async ({ page }) => {
    await page.goto('/read/goldilocks')
    // Cover page stands alone…
    await expect(page.getByText('1 / 8')).toBeVisible()
    await page.getByRole('button', { name: 'Next page' }).click()
    // …then pages come in spreads.
    await expect(page.getByText('2–3 / 8')).toBeVisible()
  })

  test('layout setting can force single-page view', async ({ page }) => {
    await page.goto('/read/goldilocks')
    await page.getByRole('button', { name: 'Display options' }).click()
    await page.getByLabel('Page layout').selectOption('single')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByText('2 / 8')).toBeVisible()
  })
})

test.describe('distraction-free mode', () => {
  onlyOnProjects(['iphone-portrait'])

  test('controls hide and a visible restore button remains', async ({ page }) => {
    await page.goto('/read/star-coins')
    await page.getByRole('button', { name: 'Hide reading controls' }).click()
    await expect(page.getByRole('button', { name: 'Next page' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Show reading controls' }).last()).toBeVisible()
    await page.getByRole('button', { name: 'Show reading controls' }).last().click()
    await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible()
  })
})
