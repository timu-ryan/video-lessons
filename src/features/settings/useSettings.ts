import { useCallback, useEffect, useState } from 'react'

export type ThemeName = 'sand' | 'night'

export interface Settings {
  /** T — транскрипция под испанским текстом. */
  transcription: boolean
  /** R — перевод (выключить, чтобы получился слайд «проверь себя»). */
  translation: boolean
  /** G — пунктирная рамка безопасной зоны под камеру. */
  safeZone: boolean
  /** B — тонкая полоска прогресса урока внизу. */
  progress: boolean
  theme: ThemeName
}

const STORAGE_KEY = 'video-lessons.settings.v1'

const DEFAULTS: Settings = {
  transcription: true,
  translation: true,
  safeZone: false,
  progress: true,
  theme: 'sand',
}

function read(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* приватный режим — просто не сохраняем */
    }
    document.documentElement.dataset.theme = settings.theme
  }, [settings])

  const toggle = useCallback((key: 'transcription' | 'translation' | 'safeZone' | 'progress') => {
    setSettings((s) => ({ ...s, [key]: !s[key] }))
  }, [])

  const setTheme = useCallback((theme: ThemeName) => {
    setSettings((s) => ({ ...s, theme }))
  }, [])

  return { settings, setSettings, toggle, setTheme }
}
