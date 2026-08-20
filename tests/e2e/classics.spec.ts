import { expect, test } from '@playwright/test'
import { onlyOnProjects } from './helpers'

/**
 * The bundled public-domain classics: original illustrations, full texts, and
 * the content-advisory rules that keep unvetted period material out of the
 * child-facing library.
 */

test.describe('public-domain classics', () => {
  onlyOnProjects(['iphone-portrait'])

  test('illustrated classics appear on the shelves with their own artwork', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Picture Books' })).toBeVisible()
    await page.getByRole('searchbox', { name: /search books/i }).fill('grimm')
    const grimm = page.getByRole('link', { name: /Household Stories by the Brothers Grimm/ }).first()
    await expect(grimm).toBeVisible()
    // The cover is the edition's own artwork, not a generated placeholder.
    await expect(grimm.locator('img')).toHaveAttribute('src', /library\/.*\.webp/)
  })

  test('book details credit the original illustrator and public-domain source', async ({ page }) => {
    await page.goto('/book/household-stories-grimm')
    await expect(page.getByText('Walter Crane').first()).toBeVisible()
    await expect(page.getByText('Lucy Crane').first()).toBeVisible()
    await page.getByText(/source & rights/i).click()
    await expect(page.getByText(/public domain/i).first()).toBeVisible()
    await expect(page.getByText(/Project Gutenberg/i).first()).toBeVisible()
  })

  test('reads an illustrated plate and a page of prose', async ({ page }) => {
    await page.goto('/read/household-stories-grimm')
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible()
    // A full plate fills the page.
    await expect(page.getByRole('img').first()).toBeVisible()

    // Step forward until a prose page appears — the opening plates run for a
    // few pages, exactly as in the printed edition.
    const article = page.locator('article').first()
    for (let i = 0; i < 20 && !(await article.isVisible()); i++) {
      await page.getByRole('button', { name: 'Next page' }).click()
      await page.waitForTimeout(340)
    }
    await expect(article).toBeVisible()
    expect((await article.innerText()).length).toBeGreaterThan(200)
  })

  test('a chapter book paginates into hundreds of readable pages', async ({ page }) => {
    await page.goto('/book/alice-in-wonderland')
    await expect(page.getByText(/\d+ pages/)).toBeVisible()
    await page.getByRole('button', { name: /read this book/i }).click()
    await expect(page.getByText(/1 \/ \d{2,}/)).toBeVisible()
  })

  test('books with a content advisory stay out of the library', async ({ page }) => {
    await page.goto('/')
    const search = page.getByRole('searchbox', { name: /search books/i })

    await search.fill('tom sawyer')
    await page.waitForTimeout(300)
    await expect(page.locator('a[href*="the-adventures-of-tom-sawyer"]')).toHaveCount(0)

    await search.fill('peter pan')
    await page.waitForTimeout(300)
    await expect(page.locator('a[href$="/book/peter-pan"]')).toHaveCount(0)
    // The gentler companion volume is not hidden and should still be findable.
    await expect(
      page.locator('a[href*="peter-pan-in-kensington-gardens"]').first(),
    ).toBeVisible()
  })

  test('an advisory book still opens directly, with the warning shown', async ({ page }) => {
    // Hidden books remain reachable by link so the owner can review them.
    await page.goto('/book/the-adventures-of-tom-sawyer')
    await expect(page.getByRole('heading', { name: /Tom Sawyer/ })).toBeVisible()
    await expect(page.getByText(/A note for grown-ups/i)).toBeVisible()
    await expect(page.getByText(/racial slurs/i)).toBeVisible()
  })

  test('a classic can be saved for offline reading', async ({ page }) => {
    await page.goto('/book/tale-of-peter-rabbit')
    const save = page.getByRole('button', { name: /save for offline/i })
    await expect(save).toBeVisible()
    await save.click()
    await expect(page.getByText(/saved for offline/i)).toBeVisible({ timeout: 60_000 })
  })
})
