/**
 * Общее для скриптов уроков: чтение lessons/*.json тем же parse.ts,
 * что в приложении, диапазоны номеров по уровням и работа со словами.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { plainText } from '../src/features/slides/markup.ts'
import { parseLesson } from '../src/features/lessons/parse.ts'
import type { Level, LessonSource } from '../src/features/lessons/source.ts'

export const ROOT = join(import.meta.dirname, '..')
export const LESSONS_DIR = join(ROOT, 'lessons')

/** Как в registry.ts: glob `lesson-*.json`, номер — из имени файла. */
const FILE_PATTERN = /lesson-(\d+)\.json$/

/** Сквозные номера уроков по уровням — из docs/course-plan.md. */
export const LEVEL_RANGES: Partial<Record<Level, { first: number; last: number }>> = {
  A0: { first: 1, last: 14 },
  A1: { first: 15, last: 39 },
  A2: { first: 40, last: 64 },
  B1: { first: 65, last: 84 },
}

export interface LessonFile {
  file: string
  lesson: LessonSource
}

export interface LoadResult {
  /** Уроки, прошедшие parse.ts, по возрастанию number. */
  lessons: LessonFile[]
  /** Ошибки загрузки: уже с адресом «файл, слайд, поле». */
  errors: string[]
}

/**
 * @param check дополнительная проверка поверх parse.ts — например, deriveLesson,
 *   как в registry.ts; её исключение тоже попадёт в errors
 */
export function loadLessons(check?: (lesson: LessonSource) => void): LoadResult {
  const lessons: LessonFile[] = []
  const errors: string[] = []

  const files = readdirSync(LESSONS_DIR)
    .filter((name) => name.startsWith('lesson-') && name.endsWith('.json'))
    .sort()

  for (const file of files) {
    const number = FILE_PATTERN.exec(file)?.[1]
    if (!number) {
      errors.push(`${file}: имя не по шаблону lesson-NN.json`)
      continue
    }
    try {
      const raw: unknown = JSON.parse(readFileSync(join(LESSONS_DIR, file), 'utf8'))
      const lesson = parseLesson(file, Number.parseInt(number, 10), raw)
      check?.(lesson)
      lessons.push({ file, lesson })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(error instanceof SyntaxError ? `${file}: не JSON — ${message}` : message)
    }
  }

  lessons.sort((a, b) => a.lesson.number - b.lesson.number)
  return { lessons, errors }
}

// --- слова -------------------------------------------------------------------

const ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/i

/** «el café» → «café». */
export const withoutArticle = (es: string): string => es.replace(ARTICLE, '').trim()

/** Ключ сравнения слов словаря: без артикля, без разметки, в нижнем регистре. */
export const vocabularyKey = (es: string): string => withoutArticle(plainText(es)).toLowerCase()

/** Слова из букв испанского алфавита, в нижнем регистре. */
export const tokenize = (text: string): string[] =>
  plainText(text).toLowerCase().match(/[a-záéíóúüñ]+/g) ?? []

export const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

/** [1, 2, 3, 5, 7, 8] → «1–3, 5, 7–8». */
export function formatRanges(numbers: number[]): string {
  const parts: string[] = []
  for (let i = 0; i < numbers.length; i++) {
    const start = numbers[i]!
    let end = start
    while (numbers[i + 1] === end + 1) end = numbers[++i]!
    parts.push(start === end ? `${start}` : `${start}–${end}`)
  }
  return parts.join(', ')
}
