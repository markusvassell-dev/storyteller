import { expect, test } from '@playwright/test'
import { onlyOnProjects } from './helpers'

test.describe('offline support', () => {
  onlyOnProjects(['iphone-portrait', 'ipad-landscape'])

  test('the app shell and demo books work with no network', async ({ page, context }) => {
    test.slow()
    await page.goto('/')
    // Wait for the service worker to activate and finish precaching.
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.waitForFunction(async () => {
      const keys = await caches.keys()
      if (keys.length === 0) return false
      const cache = await caches.open(keys.find((k) => k.includes('precache')) ?? keys[0]!)
      return (await cache.keys()).length > 20
    }, undefined, { timeout: 30_000 })

    await context.setOffline(true)

    // Full reload is served by the service worker.
    await page.reload()
    await expect(
      page.getByRole('link', { name: 'Storytime Library', exact: true }),
    ).toBeVisible()
    await expect(page.getByText(/reading offline/i)).toBeVisible()

    // A demo book still opens and reads page by page.
    await page.getByRole('link', { name: /The Three Little Pigs/ }).first().click()
    await page.getByRole('button', { name: /read this book/i }).click()
    await expect(page.getByText('1 / 8')).toBeVisible()
    await expect(page.getByRole('img', { name: /Three smiling pigs/i })).toBeVisible()

    await context.setOffline(false)
  })
})
