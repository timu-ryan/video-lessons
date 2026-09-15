/** Список уроков — то, что открывается по пустому адресу. */
export interface HomeRoute {
  kind: 'home'
}

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

export type Route = HomeRoute | DeckRoute | PresenterRoute

const DEFAULT_LESSON = '1'

/** #/lesson/1/12/3 — урок, слайд, шаг. #/presenter/1 — окно докладчика. Пусто — список уроков. */
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
  return { kind: 'home' }
}

/**
 * Один ли это экран. Позицию внутри урока ведёт useDeckNav, поэтому смена
 * слайда и шага в адресе экран не меняет.
 */
export function sameScreen(a: Route, b: Route): boolean {
  if (a.kind === 'home' || b.kind === 'home') return a.kind === b.kind
  return a.kind === b.kind && a.lessonId === b.lessonId
}

export function homeHash(): string {
  return '#/'
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
