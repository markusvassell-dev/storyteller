import { expect, test } from '@playwright/test'
import { onlyOnProjects } from './helpers'

test.describe('narration controls', () => {
  onlyOnProjects(['iphone-portrait', 'ipad-portrait'])

  test('narration menu offers sources, speed, volume, mute and disclosure', async ({
    page,
  }) => {
    await page.goto('/read/tortoise-and-hare')
    await page.getByRole('button', { name: 'Narration options' }).click()

    const dialog = page.getByRole('dialog', { name: 'Narration options' })
    await expect(dialog.getByLabel('Speed')).toBeVisible()
    await expect(dialog.getByLabel('Volume')).toBeVisible()
    await expect(dialog.getByLabel('Mute')).toBeVisible()
    await expect(dialog.getByLabel('Turn pages automatically')).toBeVisible()
    // The voice's origin is always disclosed in the note under the controls.
    await expect(
      dialog.locator('p').filter({ hasText: /demonstration narration|generated on this device/i }),
    ).toBeVisible()

    await dialog.getByLabel('Speed').selectOption('1.2')
    await dialog.getByLabel('Mute').check()
    await dialog.getByRole('button', { name: 'Done' }).click()
  })

  test('play button toggles narration state for recorded audio', async ({ page }) => {
    await page.goto('/read/tortoise-and-hare')
    const play = page.getByRole('button', { name: 'Play narration' })
    await expect(play).toBeVisible()
    await play.click()
    // Chromium autoplay is allowed via launch flag; state flips to playing.
    await expect(page.getByRole('button', { name: 'Pause narration' })).toBeVisible()
    await page.getByRole('button', { name: 'Pause narration' }).click()
    await expect(page.getByRole('button', { name: 'Play narration' })).toBeVisible()
  })

  test('replay control is present and labelled', async ({ page }) => {
    await page.goto('/read/tortoise-and-hare')
    await expect(
      page.getByRole('button', { name: /replay this page/i }),
    ).toBeVisible()
  })

  test('books without recordings fall back gracefully', async ({ page }) => {
    await page.goto('/read/star-coins')
    // Headless Chromium exposes speechSynthesis (no voices needed for the UI).
    await page.getByRole('button', { name: 'Narration options' }).click()
    const dialog = page.getByRole('dialog', { name: 'Narration options' })
    await expect(dialog.getByText(/device voice|read-aloud/i).first()).toBeVisible()
  })
})
