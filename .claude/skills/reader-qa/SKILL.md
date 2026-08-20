---
name: reader-qa
description: Test the Storytime Library reading experience — page order, navigation, progress, favourites, orientations, spreads, offline, reduced motion, keyboard/screen-reader access, narration controls, install metadata. Use this whenever the user mentions testing the reader, e2e tests, viewport testing, accessibility checks, offline testing, or "does the app still work".
---

# Reader QA

## Automated suite

```bash
npm run build          # e2e runs against the production preview
npm run test:e2e       # Playwright, 5 viewport projects
npm run test:e2e -- --project=iphone-portrait   # one viewport
```

Viewports (playwright.config.ts): iphone-portrait 393×852, iphone-landscape
852×393, ipad-portrait 834×1194, ipad-landscape 1194×834, desktop-admin
1440×900. The pre-installed Chromium at `/opt/pw-browsers/chromium` is wired
via `launchOptions.executablePath` — do not run `playwright install`.

The suite covers: library shelves + search, book details, reader navigation
(buttons + keyboard), progress save/resume, favourites, two-page spread on
iPad landscape, narration control states, offline shell reload, PWA manifest
+ icons, and axe accessibility scans of the main screens.

## Manual spot-checks (things automation can't fully prove)

- Real iPhone/iPad: Add to Home Screen, standalone launch, safe-area insets,
  swipe turns, actual TTS voices, audio playback with the mute switch on.
- Reduced motion: toggle in Settings AND via OS setting — transitions collapse.
- Two-page spread pairing: cover alone, then 2-3, 4-5…
- Rapid-tapping Next never skips more than one spread (300 ms debounce).

## When a test fails

Reproduce with `--project=<viewport>` and `--trace=on`, read the trace, and fix
the app rather than loosening the assertion — these tests encode product
requirements (visible prev/next buttons, resume-from-saved-page, etc.).
