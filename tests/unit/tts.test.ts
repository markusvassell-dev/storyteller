import { describe, expect, it, vi, afterEach } from 'vitest'
import { getVoicesNow, isTtsSupported, speak, stopSpeech } from '@/lib/tts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('device text-to-speech fallback behaviour', () => {
  it('reports unsupported when speechSynthesis is absent (jsdom default)', () => {
    expect(isTtsSupported()).toBe(false)
  })

  it('speak() degrades gracefully without the API', () => {
    expect(speak('Hello there')).toBe(false)
    expect(() => stopSpeech()).not.toThrow()
    expect(getVoicesNow()).toEqual([])
  })

  it('speak() refuses empty text even when the API exists', () => {
    const fakeSynth = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('speechSynthesis', fakeSynth)
    expect(speak('   ')).toBe(false)
    expect(fakeSynth.speak).not.toHaveBeenCalled()
  })

  it('speak() dispatches an utterance when supported', () => {
    const fakeSynth = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    class FakeUtterance {
      text: string
      constructor(text: string) {
        this.text = text
      }
    }
    vi.stubGlobal('speechSynthesis', fakeSynth)
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    expect(speak('Once upon a time')).toBe(true)
    expect(fakeSynth.cancel).toHaveBeenCalled()
    expect(fakeSynth.speak).toHaveBeenCalledOnce()
  })
})
