# Testing

## Suites

### Unit / integration — Vitest (`npm test`)

`tests/unit/` (jsdom + fake-indexeddb):

- **schema** — story validation: page-number sequencing, alt-text
  requirement, English-only language, rights coherence (owner confirmation,
  CC licence), audio-cue rules, quarantine warnings
- **util** — natural filename sorting, slugify, byte formatting
- **spreads** — two-page spread pairing (cover alone, then pairs)
- **search** — MiniSearch behaviour incl. typo tolerance and prefix matches
- **bookState** — progress, completion, favourites, history clearing rules
- **bookAdmin** — save/validate/quarantine, sort order, slug uniqueness
- **backup** — export/import round trip, replace-not-duplicate, AES
  encryption with wrong-password rejection, junk-file rejection
- **zip** — ZIP/CBZ extraction order, junk filtering, mime detection
- **tts** — graceful degradation without the Web Speech API
- **summary** — index v2 summaries, text-page vs picture-page rules, asset-ref
  tiers (`stories/`, `library/`, `idb:`)
- **bookPipeline** — Gutenberg HTML parsing (boilerplate stripping, table
  layouts, images inside paragraphs, duplicate plates), page composition and
  pagination, alt-text derivation, cover generation

### Browser end-to-end — Playwright (`npm run test:e2e`)

Runs against the production build (`npm run build` first; the config starts
`vite preview` itself). Five projects: iphone-portrait (393×852),
iphone-landscape, ipad-portrait (834×1194), ipad-landscape, desktop-admin
(1440×900). The pre-installed Chromium is used via
`launchOptions.executablePath` — never run `playwright install` here.

Coverage:

- **library** — shelves, typo-tolerant search, filters, empty states, book
  details, favourite persistence across reloads
- **reader** — button/keyboard navigation, tap debounce, progress
  save/resume, resume offer on the details page, Continue Reading shelf,
  two-page spread pairing on iPad landscape, forced single-page layout,
  text-size/reduced-motion controls, distraction-free mode
- **narration** — menu controls (source, speed, volume, mute, auto-advance),
  voice-origin disclosure, play/pause state transitions on recorded audio,
  TTS fallback for books without recordings
- **admin** — PIN gate (set/lock/wrong-PIN/unlock), the full 8-step image
  import wizard (order fixing, alt text, rights confirmation, validation,
  save), reading the imported book, hide/duplicate/delete, storage usage +
  deletion, integrity check, custom categories, and a full backup
  export→delete→restore round trip via real file download/upload
- **offline** — service-worker precache, then a fully offline reload:
  shell, shelves, and a demo book readable with the network cut
- **pwa** — manifest validity (name, standalone, start_url, 192/512/maskable
  icons resolving), iOS meta tags, service-worker serving & registration
- **classics** — the bundled public-domain library: original artwork on the
  shelves, illustrator/source credits, reading a plate and a page of prose,
  chapter-book pagination, save-for-offline, and the content-advisory rules
  that keep hidden books out of the library while remaining reachable by link
- **a11y** — axe-core scans (WCAG 2.x A/AA tags) of home, details, reader,
  settings, and the install guide; serious/critical violations fail

## Running

```bash
npm test                 # unit
npm run build            # required before e2e
npm run test:e2e         # all viewports
npx playwright test tests/e2e/reader.spec.ts --project=ipad-landscape
npm run check            # typecheck + lint + unit + rights & asset audits
```

## Audits as tests

`npm run audit:rights` (also inside every build), `npm run audit:assets`,
`npm run audit:links`, and `npm run narration:map` are deterministic checks
that exit non-zero on failure — treat them as part of the suite. The
`deploy-check` project skill sequences everything.

## Manual device checklist

Real-device checks that automation can't fully cover: Add to Home Screen on
iPhone and iPad, standalone launch + safe areas, actual TTS voices, audio
with the silent switch on, VoiceOver walkthrough of the reader, and an
airplane-mode session after install.
