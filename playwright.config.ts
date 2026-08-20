import { defineConfig } from '@playwright/test'

// The remote environment pre-installs Chromium at /opt/pw-browsers/chromium;
// pointing at it directly avoids any browser download at test time.
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      executablePath,
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'iphone-portrait',
      use: {
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iphone-landscape',
      use: {
        viewport: { width: 852, height: 393 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'ipad-portrait',
      use: { viewport: { width: 834, height: 1194 }, hasTouch: true },
    },
    {
      name: 'ipad-landscape',
      use: { viewport: { width: 1194, height: 834 }, hasTouch: true },
    },
    {
      name: 'desktop-admin',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
})
