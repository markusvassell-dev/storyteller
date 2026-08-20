import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StoryBook, StoryPage } from '@/lib/schema'
import { resolveAssetUrl } from '@/lib/assets'
import { useSettings } from '@/lib/settings'
import {
  isTtsSupported,
  loadVoices,
  pauseSpeech,
  resumeSpeech,
  sortVoicesForEnglish,
  speak,
  stopSpeech,
} from '@/lib/tts'

export type NarrationSource = 'prerecorded' | 'tts'
export type NarrationStatus = 'idle' | 'playing' | 'paused'

export interface NarrationController {
  status: NarrationStatus
  /** Sources this book actually offers on this device. */
  availableSources: NarrationSource[]
  source: NarrationSource | undefined
  setSource: (s: NarrationSource) => void
  /** Play/pause the current spread (always called from a user gesture). */
  toggle: () => void
  replay: () => void
  stop: () => void
  rate: number
  setRate: (r: number) => void
  volume: number
  setVolume: (v: number) => void
  muted: boolean
  setMuted: (m: boolean) => void
  voices: SpeechSynthesisVoice[]
  voiceUri: string | undefined
  setVoiceUri: (uri: string | undefined) => void
  /** Text of the page currently being narrated (for captions). */
  captionText: string | undefined
  /** Discloses what is speaking, e.g. "Device voice (Samantha)". */
  voiceLabel: string
  autoAdvance: boolean
  setAutoAdvance: (v: boolean) => void
}

function narrationTextOf(page: StoryPage | undefined): string {
  if (!page) return ''
  return page.narrationText ?? page.text ?? ''
}

/**
 * Narration engine for the reader.
 *
 * `pages` is the list of pages currently shown (1 in single-page view, up to
 * 2 in a spread). One tap of Play narrates them in order. When the last page
 * of the spread finishes and auto-advance is on, `onSpreadEnd` is called so
 * the reader can turn the page; narration then continues automatically.
 */
export function useNarration(
  book: StoryBook,
  pages: StoryPage[],
  onSpreadEnd: () => void,
): NarrationController {
  const settings = useSettings()
  const [status, setStatus] = useState<NarrationStatus>('idle')
  const [queueIndex, setQueueIndex] = useState(0)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cueEndRef = useRef<number | undefined>(undefined)
  const pendingAutoplayRef = useRef(false)

  const ttsAvailable = isTtsSupported()
  const recordedAvailable = useMemo(
    () => Boolean(book.narration?.bookAudio) || book.pages.some((p) => p.audio),
    [book],
  )

  const availableSources = useMemo(() => {
    const list: NarrationSource[] = []
    if (recordedAvailable) list.push('prerecorded')
    if (ttsAvailable) list.push('tts')
    return list
  }, [recordedAvailable, ttsAvailable])

  const [source, setSourceState] = useState<NarrationSource | undefined>(() =>
    availableSources.includes(settings.narrationPreference as NarrationSource)
      ? (settings.narrationPreference as NarrationSource)
      : availableSources[0],
  )

  useEffect(() => {
    void loadVoices().then((v) => setVoices(sortVoicesForEnglish(v)))
  }, [])

  const autoAdvance = settings.narrationAutoAdvance
  const autoAdvanceRef = useRef(autoAdvance)
  autoAdvanceRef.current = autoAdvance
  const onSpreadEndRef = useRef(onSpreadEnd)
  onSpreadEndRef.current = onSpreadEnd
  const pagesRef = useRef(pages)
  pagesRef.current = pages
  const sourceRef = useRef(source)
  sourceRef.current = source
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const stopAll = useCallback(() => {
    stopSpeech()
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.ontimeupdate = null
      audio.pause()
    }
    cueEndRef.current = undefined
    setStatus('idle')
    setQueueIndex(0)
  }, [])

  /** Play one page; chains to the next page in the spread when it ends. */
  const playPageAt = useCallback(async (index: number) => {
    const page = pagesRef.current[index]
    if (!page) return
    setQueueIndex(index)
    const s = settingsRef.current

    const finished = () => {
      if (index + 1 < pagesRef.current.length) {
        void playPageAt(index + 1)
      } else {
        setStatus('idle')
        setQueueIndex(0)
        if (autoAdvanceRef.current) {
          pendingAutoplayRef.current = true
          onSpreadEndRef.current()
        }
      }
    }

    const wantRecorded = sourceRef.current === 'prerecorded'
    const hasPageAudio = Boolean(page.audio)
    const hasCueAudio = Boolean(page.bookAudioCue && book.narration?.bookAudio)

    if (wantRecorded && (hasPageAudio || hasCueAudio)) {
      let audio = audioRef.current
      if (!audio) {
        audio = new Audio()
        audio.preload = 'auto'
        audioRef.current = audio
      }
      audio.onended = null
      audio.ontimeupdate = null

      const ref = hasPageAudio ? page.audio! : book.narration!.bookAudio!
      const url = await resolveAssetUrl(ref)
      if (!url) {
        finished()
        return
      }
      if (audio.dataset?.srcUrl !== url) {
        audio.src = url
        if (audio.dataset) audio.dataset.srcUrl = url
      }
      if (hasPageAudio) {
        cueEndRef.current = undefined
        audio.currentTime = 0
      } else {
        audio.currentTime = page.bookAudioCue!.start
        cueEndRef.current = page.bookAudioCue!.end
      }
      audio.playbackRate = s.narrationRate
      audio.volume = s.narrationMuted ? 0 : s.narrationVolume
      audio.onended = finished
      audio.ontimeupdate = () => {
        const end = cueEndRef.current
        if (end !== undefined && audio.currentTime >= end) {
          audio.pause()
          audio.ontimeupdate = null
          finished()
        }
      }
      try {
        await audio.play()
        setStatus('playing')
      } catch {
        setStatus('idle')
      }
      return
    }

    // Device text-to-speech (or fallback when this page has no audio file).
    const text = narrationTextOf(page)
    if (!text) {
      finished()
      return
    }
    const ok = speak(text, {
      voiceUri: s.preferredVoiceUri,
      rate: s.narrationRate,
      volume: s.narrationMuted ? 0 : s.narrationVolume,
      onEnd: finished,
      onError: () => setStatus('idle'),
    })
    setStatus(ok ? 'playing' : 'idle')
  }, [book])

  const play = useCallback(() => {
    void playPageAt(0)
  }, [playPageAt])

  const toggle = useCallback(() => {
    if (status === 'playing') {
      if (sourceRef.current === 'tts' || !audioRef.current?.src) pauseSpeech()
      audioRef.current?.pause()
      setStatus('paused')
    } else if (status === 'paused') {
      if (window.speechSynthesis?.paused) resumeSpeech()
      else void audioRef.current?.play()
      setStatus('playing')
    } else {
      play()
    }
  }, [status, play])

  const replay = useCallback(() => {
    stopAll()
    // Give cancel() a beat to settle before a fresh utterance (Safari quirk).
    setTimeout(() => play(), 60)
  }, [stopAll, play])

  // Spread change: stop, then continue automatically if auto-advance queued it.
  const spreadKey = pages.map((p) => p.number).join('-')
  useEffect(() => {
    stopSpeech()
    audioRef.current?.pause()
    setStatus('idle')
    setQueueIndex(0)
    if (pendingAutoplayRef.current) {
      pendingAutoplayRef.current = false
      const t = setTimeout(() => void playPageAt(0), 400)
      return () => clearTimeout(t)
    }
  }, [spreadKey, playPageAt])

  useEffect(() => () => stopAll(), [stopAll])

  // Live volume/rate updates for prerecorded audio.
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = settings.narrationMuted ? 0 : settings.narrationVolume
      audio.playbackRate = settings.narrationRate
    }
  }, [settings.narrationMuted, settings.narrationVolume, settings.narrationRate])

  const setSource = useCallback(
    (next: NarrationSource) => {
      stopAll()
      setSourceState(next)
      settingsRef.current.setSetting('narrationPreference', next)
    },
    [stopAll],
  )

  const currentPage = pages[queueIndex]
  const voiceLabel = useMemo(() => {
    if (source === 'prerecorded') {
      const label = book.narration?.voiceLabel ?? 'Recorded narration'
      return book.narration?.synthetic ? `${label} (computer-generated)` : label
    }
    const voice = voices.find((v) => v.voiceURI === settings.preferredVoiceUri)
    return `Device voice${voice ? ` (${voice.name})` : ''} — generated on this device`
  }, [source, book, voices, settings.preferredVoiceUri])

  return {
    status,
    availableSources,
    source,
    setSource,
    toggle,
    replay,
    stop: stopAll,
    rate: settings.narrationRate,
    setRate: (r) => settings.setSetting('narrationRate', r),
    volume: settings.narrationVolume,
    setVolume: (v) => settings.setSetting('narrationVolume', v),
    muted: settings.narrationMuted,
    setMuted: (m) => settings.setSetting('narrationMuted', m),
    voices,
    voiceUri: settings.preferredVoiceUri,
    setVoiceUri: (uri) => settings.setSetting('preferredVoiceUri', uri),
    captionText: status !== 'idle' ? narrationTextOf(currentPage) : undefined,
    voiceLabel,
    autoAdvance,
    setAutoAdvance: (v) => settings.setSetting('narrationAutoAdvance', v),
  }
}
