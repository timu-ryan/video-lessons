import type { Lesson } from '../slides/types'
import { deriveLesson } from './derive'
import { parseLesson } from './parse'

/**
 * Уроки — данные, а не код: каждый лежит в lessons/lesson-NN.json.
 * Новый урок = новый файл по этому шаблону, больше ничего трогать не нужно:
 * Vite подхватывает его при сборке сам, номер берётся из имени файла.
 */
const FILE_PATTERN = /lesson-(\d+)\.json$/

const files = import.meta.glob<unknown>('../../../lessons/lesson-*.json', {
  eager: true,
  import: 'default',
})

function load(): [Lesson, ...Lesson[]] {
  const parsed = Object.entries(files).map(([path, raw]) => {
    const name = path.slice(path.lastIndexOf('/') + 1)
    const number = FILE_PATTERN.exec(name)?.[1]
    if (!number) throw new Error(`${name}: имя не по шаблону lesson-NN.json`)
    return deriveLesson(parseLesson(name, Number.parseInt(number, 10), raw))
  })

  const [first, ...rest] = parsed.sort((a, b) => a.number - b.number)
  if (!first) throw new Error('в папке lessons/ нет файлов lesson-NN.json')
  return [first, ...rest]
}

export const lessonList = load()

export const lessons: Record<string, Lesson> = Object.fromEntries(
  lessonList.map((lesson) => [lesson.id, lesson]),
)

export function getLesson(id: string): Lesson {
  return lessons[id] ?? lessonList[0]
}
