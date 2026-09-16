import { plainText } from './markup'
import type { Slide } from './types'

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
    case 'rule':
      return slide.examples.length + 1 // 0: формула и пояснение, дальше примеры по одному
    case 'conjugation':
      return slide.rows.length
    case 'compare':
      // Пункты идут парами; короткая колонка просто кончается раньше.
      return Math.max(slide.left.items.length, slide.right.items.length)
    case 'practice':
      return 2 // 0: русская фраза + таймер, 1: испанский ответ
    case 'final':
      return slide.bullets.length + 1
    case 'title':
    case 'section':
      return 1
  }
}

/** Пауза перед показом ответа на слайде практики. */
export function pauseMs(slide: Slide): number {
  return slide.type === 'practice' ? slide.pauseMs : 0
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
    case 'rule':
    case 'compare':
      return slide.title
    case 'conjugation':
      return `${slide.verb} — ${slide.ru}`
    case 'practice':
      return `Практика ${slide.index}/${slide.total} — ${plainText(slide.phrase.ru)}`
    case 'dialogue':
      return slide.part ? `${slide.title} ${slide.part[0]}/${slide.part[1]}` : slide.title
    case 'final':
      return slide.title
  }
}
