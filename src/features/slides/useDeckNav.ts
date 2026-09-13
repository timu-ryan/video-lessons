import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lesson } from './types'
import { stepCount } from './steps'
import { deckHash, parseHash } from './route'

export interface DeckPosition {
  slideIndex: number
  step: number
}

export interface DeckNav extends DeckPosition {
  slide: Lesson['slides'][number]
  steps: number
  /** Сквозной прогресс по всем шагам урока, 0..1 — для нижней полоски. */
  progress: number
  next: () => void
  prev: () => void
  first: () => void
  last: () => void
  goTo: (position: DeckPosition) => void
}

function clampPosition(lesson: Lesson, slideIndex: number, step: number): DeckPosition {
  const maxSlide = lesson.slides.length - 1
  const index = Math.min(Math.max(slideIndex, 0), maxSlide)
  const slide = lesson.slides[index]
  if (!slide) return { slideIndex: 0, step: 0 }
  return { slideIndex: index, step: Math.min(Math.max(step, 0), stepCount(slide) - 1) }
}

/**
 * Позиция в уроке — источник истины для всего приложения. Хэш URL
 * зеркалит её (replaceState, чтобы не засорять историю), чтобы после
 * перезагрузки вернуться на тот же слайд и шаг.
 */
export function useDeckNav(lesson: Lesson): DeckNav {
  const [position, setPosition] = useState<DeckPosition>(() => {
    const route = parseHash(window.location.hash)
    return route.kind === 'deck'
      ? clampPosition(lesson, route.slideIndex, route.step)
      : { slideIndex: 0, step: 0 }
  })

  useEffect(() => {
    const hash = deckHash(lesson.id, position.slideIndex, position.step)
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [lesson.id, position])

  // Ручная правка адреса в браузере тоже работает.
  useEffect(() => {
    const onHashChange = () => {
      const route = parseHash(window.location.hash)
      if (route.kind !== 'deck') return
      setPosition((current) => {
        const target = clampPosition(lesson, route.slideIndex, route.step)
        return target.slideIndex === current.slideIndex && target.step === current.step
          ? current
          : target
      })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [lesson])

  const next = useCallback(() => {
    setPosition(({ slideIndex, step }) => {
      const slide = lesson.slides[slideIndex]
      if (slide && step < stepCount(slide) - 1) return { slideIndex, step: step + 1 }
      if (slideIndex < lesson.slides.length - 1) return { slideIndex: slideIndex + 1, step: 0 }
      return { slideIndex, step }
    })
  }, [lesson])

  const prev = useCallback(() => {
    setPosition(({ slideIndex, step }) => {
      if (step > 0) return { slideIndex, step: step - 1 }
      if (slideIndex > 0) {
        const previous = lesson.slides[slideIndex - 1]
        // Назад — к полностью раскрытому предыдущему слайду.
        return { slideIndex: slideIndex - 1, step: previous ? stepCount(previous) - 1 : 0 }
      }
      return { slideIndex, step }
    })
  }, [lesson])

  const first = useCallback(() => setPosition({ slideIndex: 0, step: 0 }), [])

  const last = useCallback(() => {
    const index = lesson.slides.length - 1
    const slide = lesson.slides[index]
    setPosition({ slideIndex: index, step: slide ? stepCount(slide) - 1 : 0 })
  }, [lesson])

  const goTo = useCallback(
    (target: DeckPosition) => setPosition(clampPosition(lesson, target.slideIndex, target.step)),
    [lesson],
  )

  const totals = useMemo(() => {
    const perSlide = lesson.slides.map(stepCount)
    const offsets: number[] = []
    let sum = 0
    for (const count of perSlide) {
      offsets.push(sum)
      sum += count
    }
    return { offsets, total: sum }
  }, [lesson])

  const slide = lesson.slides[position.slideIndex] ?? lesson.slides[0]
  if (!slide) throw new Error(`Урок ${lesson.id} не содержит слайдов`)

  const done = (totals.offsets[position.slideIndex] ?? 0) + position.step + 1
  const progress = totals.total > 1 ? done / totals.total : 1

  return {
    ...position,
    slide,
    steps: stepCount(slide),
    progress,
    next,
    prev,
    first,
    last,
    goTo,
  }
}
