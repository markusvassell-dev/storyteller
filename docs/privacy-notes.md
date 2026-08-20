# Privacy notes

Storytime Library is designed to collect as little information as possible —
ideally nothing at all.

## What the app does NOT do

- No accounts, registration, or child profiles
- No real-name collection
- No advertising
- No behavioural tracking or third-party analytics
- No public comments or social features
- No location, camera, or microphone access (the deploy headers explicitly
  deny these permissions)
- No uploads: there is no code path that sends book content, reading history,
  or settings anywhere

## What stays on the device

- Imported private books (pages, covers, audio) — IndexedDB
- Reading progress, favourites, recently-opened history — IndexedDB
- Settings (theme, text size, narration preferences) — localStorage
- The owner PIN — stored only as a salted PBKDF2 hash in localStorage

The deployed host serves static files (the app shell and the public-domain
demo stories) and therefore sees only ordinary web-server request logs from
the hosting provider. Choosing a host with minimal logging (Cloudflare Pages
serves static assets without site-owner analytics unless enabled) keeps this
surface small. Do not enable host-side analytics products.

## The owner PIN is a convenience barrier

The PIN keeps children out of the editing tools on a shared device. It is not
a security boundary: anyone with full access to the device/browser profile
can read the local data regardless. This is acceptable because nothing
private ever leaves the device — there are no remotely hosted private assets
for a stronger credential to protect.

## Data loss warnings (shown in-app)

Browsers may evict site data under storage pressure, and clearing
Safari/browser data removes locally stored books. The app:

- requests persistent storage (`navigator.storage.persist()`),
- recommends installing to the Home Screen (more durable storage on iOS),
- prominently offers backup export, and warns before destructive actions.

## Compliance posture

The app is built to be privacy-respecting by construction, but **no formal
compliance claim (COPPA, GDPR, etc.) is made** — that would require legal
review. As a single-owner personal app with no data collection, the practical
surface is minimal.
