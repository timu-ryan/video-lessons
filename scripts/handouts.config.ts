/**
 * Что из конспектов бесплатно, что платно, и куда вести читателя.
 * Меняется здесь — остальные скрипты берут отсюда.
 */
export const HANDOUTS = {
  /** Полные конспекты уроков 1–N бесплатные (A0), дальше — на Boosty. Выжимки бесплатны всегда. */
  freeFullUntil: 14,
  telegram: 'espanolcontim',
  boosty: 'https://boosty.to/espanolcontim',
}

export const telegramUrl = `https://t.me/${HANDOUTS.telegram}`
