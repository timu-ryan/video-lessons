/**
 * Что из конспектов бесплатно, что платно, куда вести читателя и в какой
 * палитре печатать. Меняется здесь — остальные скрипты берут отсюда.
 */
import type { ThemeName } from '../src/features/settings/palettes.ts'

export const HANDOUTS = {
  /** Полные конспекты уроков 1–N бесплатные (A0), дальше — на Boosty. Выжимки бесплатны всегда. */
  freeFullUntil: 14,
  /** Дополнительные материалы — только на Boosty, для всех уроков. */
  freeExtras: false,
  telegram: 'espanolcontim',
  boosty: 'https://boosty.to/espanolcontim',
  /** Палитра всех конспектов (src/features/settings/palettes.ts); разово — `--theme=…`. */
  theme: 'sand' as ThemeName,
}

export const telegramUrl = `https://t.me/${HANDOUTS.telegram}`
