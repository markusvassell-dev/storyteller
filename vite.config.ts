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
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
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
