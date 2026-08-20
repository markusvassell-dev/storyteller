import { expect, test, type Page } from '@playwright/test'
import { onlyOnProjects, photoPage, svgPage, wavClip } from './helpers'

async function unlockWorkshop(page: Page) {
  await page.goto('/admin')
  await page.getByLabel('New PIN').fill('4321')
  await page.getByLabel('Repeat PIN').fill('4321')
  await page.getByRole('button', { name: /set pin/i }).click()
  // Assert on something only the unlocked layout has — the gate screen shares
  // the "Owner workshop" heading with the dashboard.
  await expect(page.getByRole('button', { name: 'Lock workshop' })).toBeVisible()
}

test.describe('owner workshop', () => {
  onlyOnProjects(['desktop-admin'])

  test('PIN gate blocks and unlocks the workshop', async ({ page }) => {
    await unlockWorkshop(page)
    // Locking returns to the gate in enter mode.
    await page.getByRole('button', { name: 'Lock workshop' }).click()
    await expect(page.getByLabel('PIN', { exact: true })).toBeVisible()
    await page.getByLabel('PIN', { exact: true }).fill('9999')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await expect(page.getByText(/isn't right/i)).toBeVisible()
    await page.getByLabel('PIN', { exact: true }).fill('4321')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await expect(page.getByRole('heading', { name: 'Owner workshop' })).toBeVisible()
  })

  test('imports an image-set book through the full wizard', async ({ page }) => {
    await unlockWorkshop(page)
    await page.getByRole('link', { name: /add a book/i }).first().click()

    // 1 · Files — three pages, natural order.
    await page.getByLabel('Choose book files').setInputFiles([
      { name: 'page2.svg', mimeType: 'image/svg+xml', buffer: svgPage('Two', '#9c3d54') },
      { name: 'page10.svg', mimeType: 'image/svg+xml', buffer: svgPage('Ten', '#3e6b3f') },
      { name: 'page1.svg', mimeType: 'image/svg+xml', buffer: svgPage('One', '#2c2547') },
    ])
    await expect(page.getByText('3 pages ready', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Next →' }).click()

    // 2 · Details
    await page.getByLabel('Title *').fill('My Imported Test Book')
    await page.getByLabel('Author(s) *').fill('E2E Author')
    await page.getByLabel('Short description').fill('Created by the e2e test.')
    await page.getByRole('button', { name: 'Next →' }).click()

    // 3 · Page order — natural sort proposed page1, page2, page10; move page 1 later then back.
    await expect(page.getByText('Page 1', { exact: true })).toBeVisible()
    await expect(page.getByTitle('page1.svg')).toBeVisible()
    await page.getByRole('button', { name: 'Move page 1 later' }).click()
    await expect(page.getByTitle('page2.svg')).toBeVisible()
    await page.getByRole('button', { name: 'Move page 2 earlier' }).click()
    await page.getByRole('button', { name: 'Next →' }).click()

    // 4 · Page text — alt required on every page.
    const alts = ['A dark cover page', 'A berry-red page', 'A moss-green page']
    for (let i = 0; i < 3; i++) {
      await page.getByLabel(`Picture description (alt text) *`).nth(i).fill(alts[i]!)
    }
    await page
      .getByLabel('Page text (shown to the reader)')
      .first()
      .fill('Once upon an e2e test.')
    await page.getByRole('button', { name: 'Next →' }).click()

    // 5 · Narration — skip files, set a label.
    await page.getByLabel(/who is narrating/i).fill('Read by the test suite')
    await page.getByRole('button', { name: 'Next →' }).click()

    // 6 · Rights — owner permission blocks Next until confirmed.
    await page.getByLabel('Rights status *').selectOption('owner-permission')
    await expect(page.getByText(/confirm that you have permission/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next →' })).toBeDisabled()
    await page.getByText(/I confirm I own this material/).click()
    await page.getByRole('button', { name: 'Next →' }).click()

    // 7 · Preview & validate
    await expect(page.getByText(/passes validation/i)).toBeVisible()
    await page.getByRole('button', { name: 'Add to library' }).click()

    // Lands in Books with the new imported book listed.
    await expect(page.getByRole('heading', { name: 'Books', exact: true })).toBeVisible()
    await expect(page.getByText('My Imported Test Book')).toBeVisible()
    await expect(page.getByText('Imported (on device)').first()).toBeVisible()

    // The library home shows it on the imported shelf.
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'My Imported Books' })).toBeVisible()
    await expect(page.getByRole('link', { name: /My Imported Test Book/ }).first()).toBeVisible()

    // And it reads page by page.
    await page.goto('/book/my-imported-test-book')
    await page.getByRole('button', { name: /read this book/i }).click()
    await expect(page.getByText('1 / 3')).toBeVisible()
    await expect(page.getByRole('img', { name: 'A dark cover page' })).toBeVisible()
  })

  test('tidies photographed pages in bulk and one at a time', async ({ page }) => {
    test.slow()
    await unlockWorkshop(page)
    await page.getByRole('link', { name: /add a book/i }).first().click()

    await page.getByLabel('Choose book files').setInputFiles([
      { name: 'photo1.png', mimeType: 'image/png', buffer: await photoPage('One') },
      { name: 'photo2.png', mimeType: 'image/png', buffer: await photoPage('Two') },
    ])
    await expect(page.getByText('2 pages ready', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Next →' }).click()

    await page.getByLabel('Title *').fill('Photographed Book')
    await page.getByLabel('Author(s) *').fill('E2E Camera')
    await page.getByRole('button', { name: 'Next →' }).click()

    // 3 · Page order also hosts the scan tools.
    await page.getByRole('button', { name: /Trim every page/ }).click()
    await expect(page.getByText(/Trimmed the background from 2 of 2 pages/)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('✂️ tidied')).toHaveCount(2)

    // The per-page editor straightens one page without touching the other.
    await page.getByRole('button', { name: 'Straighten and trim page 1' }).click()
    const editor = page.getByRole('dialog', { name: 'Edit page 1' })
    await expect(editor.getByRole('heading', { name: 'Tidy up page 1' })).toBeVisible()
    await editor.getByRole('button', { name: 'Rotate right 90 degrees' }).click()
    await expect(editor.getByText('90.0°')).toBeVisible()
    await editor.getByRole('button', { name: /Apply to this page/ }).click()
    await expect(editor).toHaveCount(0)
    await page.getByRole('button', { name: 'Next →' }).click()

    // 4 · Page text
    await page.getByLabel('Picture description (alt text) *').nth(0).fill('A tidied page one')
    await page.getByLabel('Picture description (alt text) *').nth(1).fill('A tidied page two')
    await page.getByRole('button', { name: 'Next →' }).click()

    // 5 · Narration — skip. 6 · Rights — original work.
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByLabel('Rights status *').selectOption('original')
    await page.getByRole('button', { name: 'Next →' }).click()

    // Edited pages still save and read back. Wait for the wizard to land in
    // Books — the preview step shows the title too, so asserting on the title
    // alone would race the save.
    await expect(page.getByText(/passes validation/i)).toBeVisible()
    await page.getByRole('button', { name: 'Add to library' }).click()
    await expect(page.getByRole('heading', { name: 'Books', exact: true })).toBeVisible()
    await expect(page.getByText('Photographed Book')).toBeVisible()

    await page.goto('/book/photographed-book')
    await page.getByRole('button', { name: /read this book/i }).click()
    await expect(page.getByRole('img', { name: 'A tidied page one' })).toBeVisible()
  })

  test('maps one whole-book recording onto pages by tapping along', async ({ page }) => {
    test.slow()
    await unlockWorkshop(page)
    await page.getByRole('link', { name: /add a book/i }).first().click()

    await page.getByLabel('Choose book files').setInputFiles([
      { name: 'p1.svg', mimeType: 'image/svg+xml', buffer: svgPage('One', '#2c2547') },
      { name: 'p2.svg', mimeType: 'image/svg+xml', buffer: svgPage('Two', '#9c3d54') },
    ])
    await expect(page.getByText('2 pages ready', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Next →' }).click()

    await page.getByLabel('Title *').fill('Tap Along Book')
    await page.getByLabel('Author(s) *').fill('E2E Narrator')
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Next →' }).click()

    await page.getByLabel('Picture description (alt text) *').nth(0).fill('The first picture')
    await page.getByLabel('Picture description (alt text) *').nth(1).fill('The second picture')
    await page.getByRole('button', { name: 'Next →' }).click()

    // 5 · Narration with one recording for the whole book.
    await page.getByText('Use one whole-book recording with page timestamps').click()
    await page.getByLabel('Choose whole-book audio').setInputFiles({
      name: 'reading.wav',
      mimeType: 'audio/wav',
      buffer: wavClip(4),
    })
    await expect(page.getByText('⏱ 4s')).toBeVisible()

    // Even spacing is the quick starting point.
    await page.getByRole('button', { name: /Space evenly/ }).click()
    await expect(page.getByLabel('Page 1 start time in seconds')).toHaveValue('0')
    await expect(page.getByLabel('Page 2 start time in seconds')).toHaveValue('2')

    // Tapping along replaces them with real timings.
    await page.getByRole('button', { name: /Listen & tap to set them/ }).click()
    const sync = page.getByRole('dialog', { name: 'Match the recording to the pages' })
    await expect(sync.getByText('/ 0:04')).toBeVisible()
    await sync.getByRole('button', { name: 'Start over' }).click()

    // Seek rather than waiting on real-time playback, so the tap lands exactly.
    await page.waitForFunction(() => {
      const el = document.querySelector('[role="dialog"] audio') as HTMLAudioElement | null
      return Boolean(el && el.readyState >= 1)
    })
    await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"] audio') as HTMLAudioElement
      el.currentTime = 1.5
    })
    await sync.getByRole('button', { name: /Turn the page \(1\/2\)/ }).click()
    await expect(sync.getByText('1 marked')).toBeVisible()
    await expect(sync.getByText('0:00–0:01')).toBeVisible()

    // A tap that landed early can be nudged.
    await sync.getByRole('button', { name: 'Move page 2 start half a second later' }).click()
    await expect(sync.getByText('0:00–0:02')).toBeVisible()

    await sync.getByRole('button', { name: 'Use these timings' }).click()
    await expect(sync).toHaveCount(0)
    await expect(page.getByLabel('Page 1 start time in seconds')).toHaveValue('0')
    await expect(page.getByLabel('Page 1 end time in seconds')).toHaveValue('2')
    await expect(page.getByLabel('Page 2 start time in seconds')).toHaveValue('2')
    await expect(page.getByLabel('Page 2 end time in seconds')).toHaveValue('4')

    // The timings survive saving.
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByLabel('Rights status *').selectOption('original')
    await page.getByRole('button', { name: 'Next →' }).click()
    await expect(page.getByText(/passes validation/i)).toBeVisible()
    await page.getByRole('button', { name: 'Add to library' }).click()
    await expect(page.getByRole('heading', { name: 'Books', exact: true })).toBeVisible()
    await expect(page.getByText('Tap Along Book')).toBeVisible()
  })

  test('hide, duplicate and delete books; storage screen lists usage', async ({ page }) => {
    test.slow()
    await unlockWorkshop(page)
    await page.getByRole('link', { name: 'Books', exact: true }).click()

    // Hide a built-in book, verify it leaves the home shelves, unhide again.
    await page.getByRole('button', { name: 'Hide The Star Coins' }).click()
    // Wait for this book's hidden state to commit before navigating away
    // (other books are hidden by default for content advisories).
    await expect(
      page.locator('li').filter({ hasText: 'The Star Coins' }).getByText('🙈 Hidden'),
    ).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Recently Added' })).toBeVisible()
    await expect(page.getByRole('link', { name: /The Star Coins/ })).toHaveCount(0)
    await page.goto('/admin/books')
    await page.getByRole('button', { name: 'Show The Star Coins' }).click()

    // Duplicate a built-in → becomes an imported copy.
    await page.getByRole('button', { name: 'Duplicate The Gingerbread Man' }).click()
    await expect(page.getByText('The Gingerbread Man (copy)')).toBeVisible()

    // Storage screen shows the imported copy and deletes it.
    await page.goto('/settings/storage')
    await expect(page.getByText('The Gingerbread Man (copy)')).toBeVisible()
    await page.getByRole('button', { name: 'Remove…' }).first().click()
    await page.getByRole('button', { name: 'Delete forever' }).click()
    await expect(page.getByText('The Gingerbread Man (copy)')).toHaveCount(0)
  })

  test('library check reports a healthy library', async ({ page }) => {
    // The check loads every book in the library, so give it room.
    test.slow()
    await unlockWorkshop(page)
    await page.getByRole('link', { name: 'Library check', exact: true }).click()
    await page.getByRole('button', { name: 'Run library check' }).click()
    await expect(page.getByText(/everything looks healthy/i)).toBeVisible({ timeout: 120_000 })
  })

  test('exports a backup and restores it after deletion', async ({ page }) => {
    test.slow()
    await unlockWorkshop(page)

    // Import a tiny book to have private content worth backing up.
    await page.getByRole('link', { name: /add a book/i }).first().click()
    await page.getByLabel('Choose book files').setInputFiles([
      { name: 'only.svg', mimeType: 'image/svg+xml', buffer: svgPage('Solo', '#a35314') },
    ])
    await expect(page.getByText('1 page ready', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByLabel('Title *').fill('Backup Roundtrip Book')
    await page.getByLabel('Author(s) *').fill('E2E')
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByLabel('Picture description (alt text) *').fill('An amber test page')
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByLabel('Rights status *').selectOption('original')
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Add to library' }).click()
    await expect(page.getByText('Backup Roundtrip Book')).toBeVisible()

    // Export the library.
    await page.goto('/admin/backup')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /export backup/i }).click()
    const download = await downloadPromise
    const backupPath = await download.path()
    await expect(page.getByText(/backup exported/i)).toBeVisible()

    // Delete the book, then restore from the backup.
    await page.goto('/admin/books')
    await page.getByRole('button', { name: 'Delete Backup Roundtrip Book' }).click()
    await page.getByRole('button', { name: 'Delete forever' }).click()
    // Exact match targets the list row title, not the "Deleted …" status text.
    await expect(page.getByText('Backup Roundtrip Book', { exact: true })).toHaveCount(0)

    await page.goto('/admin/backup')
    await page.getByLabel(/backup file/i).setInputFiles(backupPath)
    await expect(page.getByText(/restored 1 new book/i)).toBeVisible({ timeout: 20_000 })
    await page.goto('/admin/books')
    await expect(page.getByText('Backup Roundtrip Book')).toBeVisible()
  })

  test('custom categories can be added and removed', async ({ page }) => {
    await unlockWorkshop(page)
    await page.getByRole('link', { name: 'Categories', exact: true }).click()
    await page.getByLabel('New category name').fill('Dinosaur Week')
    await page.getByRole('button', { name: 'Add category' }).click()
    await expect(page.getByText('Dinosaur Week')).toBeVisible()
    await page.getByRole('button', { name: 'Remove category Dinosaur Week' }).click()
    await expect(page.getByText('Dinosaur Week')).toHaveCount(0)
  })
})
