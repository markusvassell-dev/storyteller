---
name: narration-helper
description: Validate and build narration for Storytime Library books — per-page audio mapping, whole-book audio timestamps, transcripts, TTS fallback, synthetic demo narration. Use this whenever the user mentions narration, read-aloud, audio not playing, page timestamps, text-to-speech, voices, or generating/checking story audio.
---

# Narration helper

## Check narration mapping

```bash
npm run narration:map
```

Verifies per-page audio files exist in browser-safe formats, whole-book audio
cues are ordered and inside the audio's duration, every page has text for the
device-TTS fallback, and synthetic narration is disclosed.

## How narration works in the app

- Engine: `src/features/reader/useNarration.ts`; TTS wrapper: `src/lib/tts.ts`.
- Two sources per book: prerecorded audio (per-page files, or one whole-book
  file with `bookAudioCue {start,end}` per page) and device TTS
  (`narrationText ?? text`).
- iOS requires a user gesture to start speech — never autoplay narration.
- Synthetic voices must be disclosed (`narration.synthetic: true` shows
  "computer-generated" in the UI).

## Generate synthetic demo narration

```bash
apt-get install -y espeak-ng lame   # once
npx tsx scripts/generate-demo-narration.ts
```

Edit that script to target another book/voice. Human recordings from the owner
are always preferred; add them via the in-app wizard (Narration step) so they
stay on-device.

## Timestamp mapping for whole-book audio

Each page gets `bookAudioCue.start` (seconds) and optional `end` (defaults to
playing until the next cue/page end). Enter them in the wizard's Narration
step, or in story.json for bundled books, then re-run `npm run narration:map`.
