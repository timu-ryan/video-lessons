import type { Speaker } from '../types'

/** Глобальные переключатели показа, общие для всех слайдов (клавиши T и R). */
export interface ViewOptions {
  transcription: boolean
  translation: boolean
  speakers: Record<string, Speaker>
}
