import type { Phrase, Slide } from './types'

/**
 * Сколько шагов внутри слайда. Шаг 0 — состояние сразу после перехода,
 * поэтому у слайда всегда минимум один шаг.
 */
export function stepCount(slide: Slide): number {
  switch (slide.type) {
    case 'table':
      return slide.rows.length // строки открываются по одной, первая — сразу
    case 'dialogue':
      return slide.lines.length
    case 'practice':
      return 2 // 0: русская фраза + таймер, 1: испанский ответ
    case 'mistake':
      return 3 // 0: неверно, 1: верно, 2: пояснение
    case 'final':
      return slide.bullets.length + 1
    case 'title':
    case 'section':
      return 1
  }
}

export const DEFAULT_PAUSE_MS = 4000

/** Пауза перед показом ответа на слайде практики. */
export function pauseMs(slide: Slide): number {
  return slide.type === 'practice' ? (slide.pauseMs ?? DEFAULT_PAUSE_MS) : 0
}

/** Все озвучиваемые фразы слайда — для клавиши A и для окна докладчика. */
export function slidePhrases(slide: Slide): Phrase[] {
  switch (slide.type) {
    case 'table':
      return slide.rows
    case 'practice':
      return [slide.answer]
    case 'dialogue':
      return slide.lines
        .filter((line) => line.audioId !== undefined)
        .map((line) => ({ id: line.audioId as string, es: line.es, tr: '', ru: line.ru }))
    default:
      return []
  }
}

/**
 * Фраза, которую озвучивает клавиша A на текущем шаге: последняя открытая
 * строка таблицы / реплика диалога, ответ на слайде практики.
 */
export function phraseAtStep(slide: Slide, step: number): Phrase | undefined {
  switch (slide.type) {
    case 'table':
      return slide.rows[Math.min(step, slide.rows.length - 1)]
    case 'dialogue': {
      const phrases = slidePhrases(slide)
      const line = slide.lines[Math.min(step, slide.lines.length - 1)]
      if (!line?.audioId) return undefined
      return phrases.find((p) => p.id === line.audioId)
    }
    case 'practice':
      return slide.answer
    default:
      return undefined
  }
}

/** Заголовок слайда для окна докладчика и индикатора прогресса. */
export function slideLabel(slide: Slide): string {
  switch (slide.type) {
    case 'title':
      return slide.topic
    case 'section':
      return `${slide.number}. ${slide.title}`
    case 'table':
      return slide.part ? `${slide.title} ${slide.part[0]}/${slide.part[1]}` : slide.title
    case 'practice':
      return `Практика ${slide.index}/${slide.total} — ${slide.ru}`
    case 'dialogue':
      return slide.part ? `${slide.title} ${slide.part[0]}/${slide.part[1]}` : slide.title
    case 'mistake':
      return `Ошибка ${slide.index}/${slide.total} — ${slide.wrong}`
    case 'final':
      return slide.title
  }
}
