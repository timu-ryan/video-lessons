/** Синхронизация основного окна и окна докладчика через BroadcastChannel. */

export const CHANNEL_NAME = 'video-lessons.presenter'

export interface DeckState {
  lessonId: string
  slideIndex: number
  step: number
  transcription: boolean
  translation: boolean
  /** Отметка начала записи (мс), общая для обоих окон. */
  startedAt: number
}

export type NavAction = 'next' | 'prev' | 'first' | 'last'

export type PresenterMessage =
  | { kind: 'state'; state: DeckState }
  /** Окно докладчика только что открылось и просит текущее состояние. */
  | { kind: 'hello' }
  /** Кликер/клавиши в окне докладчика управляют основным окном. */
  | { kind: 'nav'; action: NavAction }
  | { kind: 'reset-timer' }

export function openChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  return new BroadcastChannel(CHANNEL_NAME)
}

const STARTED_AT_KEY = 'video-lessons.startedAt'

export function readStartedAt(): number {
  try {
    const raw = localStorage.getItem(STARTED_AT_KEY)
    const value = raw ? Number.parseInt(raw, 10) : Number.NaN
    if (Number.isFinite(value)) return value
  } catch {
    /* без хранилища таймер просто начнётся заново */
  }
  const now = Date.now()
  writeStartedAt(now)
  return now
}

export function writeStartedAt(value: number): void {
  try {
    localStorage.setItem(STARTED_AT_KEY, String(value))
  } catch {
    /* игнорируем */
  }
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
