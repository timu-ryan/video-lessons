import type { Lesson } from '../slides/types'
import { lesson01 } from './lesson-01'

/** Новый урок = новый файл данных + строка здесь. Компоненты не трогаем. */
export const lessons: Record<string, Lesson> = {
  [lesson01.id]: lesson01,
}

export function getLesson(id: string): Lesson {
  return lessons[id] ?? lesson01
}
