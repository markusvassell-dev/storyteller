---
name: asset-optimizer
description: Check and optimize Storytime Library images and audio — formats, file sizes, duplicates, alt text, audio compatibility. Use this whenever the user mentions slow loading, large files, image optimization, converting/compressing pictures or audio, or when adding artwork or narration files to public/stories.
---

# Asset optimizer

## Check bundled assets

```bash
npm run audit:assets
```

Flags: oversized images (>600 KB), oversized audio (>2 MB), duplicate files,
non-browser-safe formats, missing/too-short alt text. Errors exit non-zero so
`npm run check` gates on them.

## Optimization rules

- Page images: WebP (or JPEG) at ≤1600px long edge, quality ~0.85. SVG stays
  SVG. Thumbnails ≤360px.
- Audio: MP3 (`lame -V5 -m m in.wav out.mp3`) or M4A. Avoid OGG (older iOS
  Safari) and large WAVs.
- Imported private books are normalised automatically on-device at import time
  (`src/lib/imageProcessing.ts`) — don't ask the owner to pre-process.

## Preserve originals

Never overwrite a source/original file in place. Optimize into the destination
path (`public/stories/...`) and leave the input untouched, or keep a copy —
the owner's originals may be irreplaceable scans.
