import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_THEME, isThemeName, nextTheme, type ThemeName } from './palettes'

export interface Settings {
  /** T — транскрипция под испанским текстом. */
  transcription: boolean
  /** R — перевод (выключить, чтобы получился слайд «проверь себя»). */
  translation: boolean
  /** G — пунктирная рамка безопасной зоны под камеру. */
  safeZone: boolean
  /** B — тонкая полоска прогресса урока внизу. */
  progress: boolean
  /** C — палитра по кругу; выбор по имени — в окне докладчика. */
  theme: ThemeName
}

const STORAGE_KEY = 'video-lessons.settings.v1'

const DEFAULTS: Settings = {
  transcription: true,
  translation: true,
  safeZone: false,
  progress: true,
  theme: DEFAULT_THEME,
}

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const settings = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
    // Палитру могли переименовать или удалить из palettes.ts
    return isThemeName(settings.theme) ? settings : { ...settings, theme: DEFAULT_THEME }
  } catch {
    return DEFAULTS
  }
}

/** Палитра выбирается атрибутом data-theme на <html> — см. palettes.ts. */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(readSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* приватный режим — просто не сохраняем */
    }
    applyTheme(settings.theme)
  }, [settings])

  const toggle = useCallback((key: 'transcription' | 'translation' | 'safeZone' | 'progress') => {
    setSettings((s) => ({ ...s, [key]: !s[key] }))
  }, [])

  const setTheme = useCallback((theme: ThemeName) => {
    setSettings((s) => ({ ...s, theme }))
  }, [])

  const cycleTheme = useCallback(() => {
    setSettings((s) => ({ ...s, theme: nextTheme(s.theme) }))
  }, [])

  return { settings, setSettings, toggle, setTheme, cycleTheme }
}
