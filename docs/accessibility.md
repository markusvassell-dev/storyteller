# Accessibility

Target: WCAG 2.2 AA where practical, verified with automated scans and manual
checks.

## What's implemented

- **Semantic structure**: landmarks (`header`, `main`, `nav`, `search`),
  logical heading order, lists for shelves, `dl` for book facts.
- **Keyboard**: full reader control (arrows, PageUp/Down, Home/End, Space for
  narration, Escape to exit), skip links, no keyboard traps; menus close with
  Escape.
- **Visible focus**: 3 px high-contrast focus ring token applied globally.
- **Screen readers**: every control is labelled (page turns, narration,
  favourites with `aria-pressed`, progress bar with `role="progressbar"`),
  page changes are announced via a polite live region, artwork carries
  required alt text (schema-enforced — a book without alt text fails
  validation).
- **Touch targets**: 44 px minimum everywhere; 56 px for child-facing reader
  controls (design tokens `--tap-min`, `--tap-comfy`, `--reader-control`).
- **No gesture-only actions**: swiping is an optional convenience; visible
  Previous/Next buttons always remain (hiding controls leaves an always-visible
  restore button).
- **Reduced motion**: honours `prefers-reduced-motion` and an in-app toggle —
  all motion tokens collapse to 1 ms.
- **Text size**: three-step story text scaling (Settings and the reader's Aa
  menu).
- **Narration accessibility**: captions/transcript line for prerecorded
  audio, clear disclosure of synthetic/device voices, all audio controls are
  buttons with labels.
- **Drag and drop alternatives**: page reordering and book reordering offer
  arrow-button equivalents alongside drag handles.
- **Colour**: status is never conveyed by colour alone (badges pair icon +
  text); palettes were chosen for ≥4.5:1 text contrast in both themes.
- **Forms**: labelled fields, described errors with `role="alert"`, wizard
  step blockers listed as text.

## Automated testing

`tests/e2e/a11y.spec.ts` runs axe-core (WCAG 2.x A/AA rule tags) against the
library home, book details, reader, settings, and install guide at phone and
desktop sizes; any serious/critical violation fails CI. Unit-level schema
tests enforce alt text.

## Alternative text for historical illustrations

Alt text for the public-domain classics comes from the edition itself — the
illustration's own `alt` attribute, then its caption. Where a source offers
neither, the app states what the image is ("Illustration from The Jungle Book
by W. H. Drake") rather than inventing a description of artwork that was never
described. That is honest but thin, and it is a known limitation: a
screen-reader user gets the fact of an illustration, not its content. The
owner can write better alt text for any page through the admin editor.

Text pages carry no image and therefore need no alt text; the schema enforces
alt text on every page that *does* have an image.

## Known gaps / manual-check list

- Real VoiceOver behaviour on iOS (rotor navigation through the reader) needs
  periodic manual verification on-device.
- Caption timing (word-level highlight) is supported by the data model
  (`textTiming`) but the UI currently shows whole-page captions only.
- Colour contrast of user-imported artwork is outside the app's control.
