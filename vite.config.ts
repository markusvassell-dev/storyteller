import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH lets the same build target hosts that serve from a sub-path
// (e.g. GitHub Pages "/storyteller/"). Cloudflare Pages serves from "/".
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg', 'splash/*.png'],
      manifest: {
        id: base,
        name: 'Storytime Library',
        short_name: 'Storytime',
        description:
          'A cozy, private library of picture books for bedtime reading on iPhone and iPad.',
        lang: 'en',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        theme_color: '#251f3f',
        background_color: '#faf3e7',
        categories: ['books', 'kids', 'education'],
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell, fonts, artwork and story JSON so the whole
        // demo library works offline. Audio is runtime-cached (below) because
        // Safari streams it with range requests.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest,json}'],
        globIgnores: [
          // English-only app: skip precaching the other font subsets.
          '**/*devanagari*',
          '**/*cyrillic*',
          '**/*vietnamese*',
          '**/node_modules/**',
          // The public-domain classics are large, so they are cached as they
          // are read rather than downloaded at install time. Their covers are
          // precached (below) so the shelves look complete offline, and the
          // small demo collection in stories/ stays fully precached so a
          // freshly installed app is immediately readable with no network.
          'library/*/pages/**',
          'library/*/story.json',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Classic-library pages: kept after first read so a book the
            // child has opened stays available offline, with a ceiling so the
            // cache cannot grow without bound.
            urlPattern: /\/library\/[^/]+\/pages\/.*\.(?:webp|jpe?g|png|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'library-pages',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true },
            },
          },
          {
            // Book data is small; revalidate in the background so edits to a
            // deployed book appear without blocking the reader.
            urlPattern: /\/library\/[^/]+\/story\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'library-books',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, purgeOnQuotaError: true },
            },
          },
          {
            // pdf.js worker (admin PDF import) — cached after first use so
            // importing keeps working offline.
            urlPattern: /pdf\.worker.*\.mjs$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-worker',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 2, purgeOnQuotaError: true },
            },
          },
          {
            urlPattern: /\/stories\/.*\.(?:mp3|m4a|aac|wav|ogg|opus)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'story-audio',
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, purgeOnQuotaError: true },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // pdf.js is only needed inside the admin importer; keep it out of
        // the reader/library path entirely.
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) return 'pdfjs'
        },
      },
    },
  },
})
