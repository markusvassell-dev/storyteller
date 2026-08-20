import { expect, test } from '@playwright/test'
import { onlyOnProjects } from './helpers'

test.describe('PWA installation metadata', () => {
  onlyOnProjects(['iphone-portrait'])

  test('manifest is valid for Home Screen installation', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBe(true)
    const manifest = (await res.json()) as {
      name: string
      short_name: string
      display: string
      start_url: string
      theme_color: string
      background_color: string
      icons: { src: string; sizes: string; purpose?: string }[]
    }
    expect(manifest.name).toBe('Storytime Library')
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true)
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true)
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)

    // Icon files actually resolve.
    for (const icon of manifest.icons) {
      const iconRes = await request.get(`/${icon.src.replace(/^\//, '')}`)
      expect(iconRes.ok(), icon.src).toBe(true)
    }
  })

  test('iOS-specific tags are present', async ({ request }) => {
    const res = await request.get('/')
    const html = await res.text()
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(html).toContain('apple-touch-icon')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('theme-color')
  })

  test('service worker script is served', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.ok()).toBe(true)
    expect(await res.text()).toContain('precache')
  })

  test('registers the service worker in the page', async ({ page }) => {
    await page.goto('/')
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      return Boolean(reg.active)
    })
    expect(registered).toBe(true)
  })
})
