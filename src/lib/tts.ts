/**
 * Thin wrapper around the Web Speech API (device-generated narration).
 *
 * iOS/iPadOS notes verified during implementation:
 *  - speech must start from a user gesture (we only ever speak on tap)
 *  - getVoices() can be empty until the async `voiceschanged` event
 *  - Chrome on iOS shares Safari's WebKit voices
 */

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let cachedVoices: SpeechSynthesisVoice[] = []

export function getVoicesNow(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return []
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) cachedVoices = voices
  return cachedVoices
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isTtsSupported()) {
      resolve([])
      return
    }
    const now = getVoicesNow()
    if (now.length > 0) {
      resolve(now)
      return
    }
    const onChange = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange)
      resolve(getVoicesNow())
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange)
    // Some browsers never fire voiceschanged; don't hang forever.
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange)
      resolve(getVoicesNow())
    }, 2000)
  })
}

/** English voices first, default voice at the top. */
export function sortVoicesForEnglish(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1
    const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1
    if (aEn !== bEn) return aEn - bEn
    if (a.default !== b.default) return a.default ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export interface SpeakOptions {
  voiceUri?: string
  rate?: number
  volume?: number
  onEnd?: () => void
  onError?: () => void
}

let currentUtterance: SpeechSynthesisUtterance | undefined

export function speak(text: string, opts: SpeakOptions = {}): boolean {
  if (!isTtsSupported() || !text.trim()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en'
  const voices = getVoicesNow()
  const voice = opts.voiceUri
    ? voices.find((v) => v.voiceURI === opts.voiceUri)
    : undefined
  if (voice) utterance.voice = voice
  utterance.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1))
  utterance.volume = Math.min(1, Math.max(0, opts.volume ?? 1))
  utterance.onend = () => {
    if (currentUtterance === utterance) currentUtterance = undefined
    opts.onEnd?.()
  }
  utterance.onerror = (e) => {
    if (currentUtterance === utterance) currentUtterance = undefined
    // 'interrupted'/'canceled' fire on ordinary stop; only real failures count.
    if (e.error !== 'interrupted' && e.error !== 'canceled') opts.onError?.()
  }
  currentUtterance = utterance
  synth.speak(utterance)
  return true
}

export function pauseSpeech(): void {
  if (isTtsSupported()) window.speechSynthesis.pause()
}

export function resumeSpeech(): void {
  if (isTtsSupported()) window.speechSynthesis.resume()
}

export function stopSpeech(): void {
  if (isTtsSupported()) {
    currentUtterance = undefined
    window.speechSynthesis.cancel()
  }
}

export function isSpeaking(): boolean {
  return isTtsSupported() && window.speechSynthesis.speaking
}
