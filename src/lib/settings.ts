import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Owner/device preferences. Stored in localStorage so the theme and text
 * size apply before IndexedDB wakes up. Included in library backups.
 */

export type ThemeSetting = 'system' | 'light' | 'dark'
export type TextSizeSetting = 'normal' | 'large' | 'huge'
export type NarrationPreference = 'prerecorded' | 'tts' | 'off'
export type ReaderLayoutSetting = 'auto' | 'single' | 'spread'

export interface SettingsState {
  theme: ThemeSetting
  textSize: TextSizeSetting
  reducedMotion: boolean
  narrationPreference: NarrationPreference
  narrationRate: number
  narrationVolume: number
  narrationMuted: boolean
  narrationAutoAdvance: boolean
  preferredVoiceUri?: string
  readerLayout: ReaderLayoutSetting
  swipeEnabled: boolean
  showCaptions: boolean
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

export const SETTINGS_STORAGE_KEY = 'storytime-settings'

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      textSize: 'normal',
      reducedMotion: false,
      narrationPreference: 'prerecorded',
      narrationRate: 1,
      narrationVolume: 1,
      narrationMuted: false,
      narrationAutoAdvance: false,
      preferredVoiceUri: undefined,
      readerLayout: 'auto',
      swipeEnabled: true,
      showCaptions: true,
      setSetting: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { setSetting: _ignored, ...rest } = s
        return rest
      },
    },
  ),
)

/** Reflect settings onto <html> so CSS tokens can react to them. */
export function applySettingsToDocument(s: Pick<SettingsState, 'theme' | 'textSize' | 'reducedMotion'>) {
  const root = document.documentElement
  if (s.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = s.theme
  if (s.textSize === 'normal') delete root.dataset.textSize
  else root.dataset.textSize = s.textSize
  if (s.reducedMotion) root.dataset.reducedMotion = 'true'
  else delete root.dataset.reducedMotion
}

export function initSettingsSideEffects() {
  applySettingsToDocument(useSettings.getState())
  useSettings.subscribe((s) => applySettingsToDocument(s))
}

/** Serializable snapshot for backups. */
export function exportSettings(): Record<string, unknown> {
  const { setSetting: _ignored, ...rest } = useSettings.getState()
  return rest
}

export function importSettings(data: Record<string, unknown>) {
  const allowed: (keyof SettingsState)[] = [
    'theme',
    'textSize',
    'reducedMotion',
    'narrationPreference',
    'narrationRate',
    'narrationVolume',
    'narrationMuted',
    'narrationAutoAdvance',
    'preferredVoiceUri',
    'readerLayout',
    'swipeEnabled',
    'showCaptions',
  ]
  const patch: Partial<SettingsState> = {}
  for (const key of allowed) {
    if (key in data) (patch as Record<string, unknown>)[key] = data[key]
  }
  useSettings.setState(patch)
}
