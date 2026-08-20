/**
 * Renders the app icon SVG into the PNG sizes a PWA needs (192/512/maskable/
 * apple-touch-icon) plus iOS splash-screen images, using the pre-installed
 * Chromium. Run: npx tsx scripts/generate-icons.ts
 */

import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'
const iconSvg = readFileSync(join(process.cwd(), 'public/icons/favicon.svg'), 'utf8')
const iconsDir = join(process.cwd(), 'public/icons')
const splashDir = join(process.cwd(), 'public/splash')
mkdirSync(iconsDir, { recursive: true })
mkdirSync(splashDir, { recursive: true })

const dataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`

interface Job {
  file: string
  width: number
  height: number
  html: string
}

function iconPage(size: number, scale = 1, bg = 'transparent'): string {
  const inner = Math.round(size * scale)
  const pad = Math.round((size - inner) / 2)
  return `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center">
  <img src="${dataUri}" style="width:${inner}px;height:${inner}px;margin:${pad}px" /></body></html>`
}

function splashPage(w: number, h: number): string {
  const icon = Math.round(Math.min(w, h) * 0.28)
  return `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:#251f3f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px">
  <img src="${dataUri}" style="width:${icon}px;height:${icon}px;border-radius:${Math.round(icon * 0.22)}px" />
  <div style="font-family:'Trebuchet MS',sans-serif;font-weight:700;font-size:${Math.round(icon * 0.18)}px;color:#f4edff">Storytime Library</div>
  </body></html>`
}

// Portrait splash sizes covering current iPhones and iPads (CSS points × DPR).
const splashSizes: [number, number][] = [
  [1179, 2556], // iPhone 15/16 class
  [1290, 2796], // iPhone Pro Max class
  [1170, 2532], // iPhone 12–14
  [828, 1792], // iPhone 11/XR
  [1620, 2160], // iPad 10.9"
  [2048, 2732], // iPad Pro 12.9"
]

const jobs: Job[] = [
  { file: join(iconsDir, 'pwa-192.png'), width: 192, height: 192, html: iconPage(192) },
  { file: join(iconsDir, 'pwa-512.png'), width: 512, height: 512, html: iconPage(512) },
  {
    file: join(iconsDir, 'maskable-512.png'),
    width: 512,
    height: 512,
    html: iconPage(512, 0.78, '#251f3f'),
  },
  {
    file: join(iconsDir, 'apple-touch-icon.png'),
    width: 180,
    height: 180,
    html: iconPage(180, 1, '#251f3f'),
  },
  ...splashSizes.map(([w, h]) => ({
    file: join(splashDir, `splash-${w}x${h}.png`),
    width: w,
    height: h,
    html: splashPage(w, h),
  })),
]

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()
for (const job of jobs) {
  await page.setViewportSize({ width: job.width, height: job.height })
  await page.setContent(job.html, { waitUntil: 'networkidle' })
  await page.screenshot({ path: job.file, omitBackground: true })
  console.log(`✓ ${job.file}`)
}
await browser.close()
console.log('Icons and splash screens generated.')
