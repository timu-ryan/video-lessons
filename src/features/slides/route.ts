export interface DeckRoute {
  kind: 'deck'
  lessonId: string
  slideIndex: number
  step: number
}

export interface PresenterRoute {
  kind: 'presenter'
  lessonId: string
}

export type Route = DeckRoute | PresenterRoute

const DEFAULT_LESSON = '1'

/** #/lesson/1/12/3 — урок, слайд, шаг. #/presenter/1 — окно докладчика. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)

  if (parts[0] === 'presenter') {
    return { kind: 'presenter', lessonId: parts[1] ?? DEFAULT_LESSON }
  }
  if (parts[0] === 'lesson') {
    return {
      kind: 'deck',
      lessonId: parts[1] ?? DEFAULT_LESSON,
      slideIndex: toInt(parts[2]),
      step: toInt(parts[3]),
    }
  }
  return { kind: 'deck', lessonId: DEFAULT_LESSON, slideIndex: 0, step: 0 }
}

export function deckHash(lessonId: string, slideIndex: number, step: number): string {
  return `#/lesson/${lessonId}/${slideIndex}/${step}`
}

export function presenterHash(lessonId: string): string {
  return `#/presenter/${lessonId}`
}

function toInt(value: string | undefined): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
