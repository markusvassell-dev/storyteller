import { expect, test } from '@playwright/test'

test.describe('library home', () => {
  test('shows shelves with the demo collection', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Recently Added' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fairy Tales' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /The Three Little Pigs/ }).first(),
    ).toBeVisible()
  })

  test('typo-tolerant search finds books', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: /search books/i }).fill('tortois')
    await expect(
      page.getByRole('link', { name: /The Tortoise and the Hare/ }).first(),
    ).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /book.* found/ })).toBeVisible()
  })

  test('search shows a friendly empty state', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: /search books/i }).fill('zzzznothing')
    await expect(page.getByText('Nothing on this shelf yet')).toBeVisible()
  })

  test('narration filter narrows to recorded books', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /filters/i }).click()
    await page.getByLabel('Narration').selectOption('prerecorded')
    await expect(
      page.getByRole('link', { name: /The Tortoise and the Hare/ }).first(),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Goldilocks/ })).toHaveCount(0)
  })

  test('book details shows metadata, rights and actions', async ({ page }) => {
    await page.goto('/book/tortoise-and-hare')
    await expect(
      page.getByRole('heading', { name: 'The Tortoise and the Hare' }),
    ).toBeVisible()
    await expect(page.getByText('Recorded narration')).toBeVisible()
    await expect(page.getByRole('button', { name: /read this book/i })).toBeVisible()
    await page.getByText(/source & rights/i).click()
    await expect(page.getByText(/original to this project/i)).toBeVisible()
  })

  test('favourite persists across reloads', async ({ page }) => {
    await page.goto('/book/goldilocks')
    await page.getByRole('button', { name: /add favourite/i }).click()
    await expect(page.getByRole('button', { name: /^favourite/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.reload()
    await expect(page.getByRole('button', { name: /^favourite/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Favourites' })).toBeVisible()
  })
})
