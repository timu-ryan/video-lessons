import type {
  DialogueLineSource,
  LessonSource,
  PhraseSource,
  PracticeGroupSource,
  SlideSource,
} from './source'
import { SCHEMA_VERSION } from './source'

/**
 * Разбор урока из JSON. Данные лежат вне TypeScript, поэтому опечатку
 * в поле компилятор уже не поймает — ловим здесь, при загрузке, и падаем
 * с адресом ошибки (файл → слайд → поле), а не тихо рисуем пустой слайд.
 */

/** Обязательные поля каждого типа слайда, помимо необязательных id/notes. */
const SLIDE_FIELDS = {
  title: [],
  section: ['title'],
  table: ['title', 'rows'],
  practice: ['group', 'phrase'],
  dialogue: ['title', 'lines'],
  mistake: ['kind', 'wrong', 'right', 'note'],
  final: ['title', 'bullets', 'nextTitle', 'nextText'],
} as const satisfies Record<SlideSource['type'], readonly string[]>

const MISTAKE_KINDS = ['pronunciation', 'grammar', 'false-friend', 'usage']

/** Строк в таблице: больше в холст 1920×1080 не помещается. */
const MAX_ROWS = 5

class LessonError extends Error {
  constructor(where: string, message: string) {
    super(`${where}: ${message}`)
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function str(where: string, host: Record<string, unknown>, key: string): string {
  const value = host[key]
  if (typeof value !== 'string' || value === '') {
    throw new LessonError(where, `поле «${key}» должно быть непустой строкой`)
  }
  return value
}

/**
 * @param needIpa у строк таблицы и заданий практики транскрипция обязательна,
 *   у реплик диалога её нет — там на слайде только испанский и перевод.
 */
function phrase(where: string, value: unknown, needIpa: boolean): PhraseSource {
  if (!isObject(value)) throw new LessonError(where, 'фраза должна быть объектом')
  str(where, value, 'es')
  str(where, value, 'ru')
  if (needIpa) str(where, value, 'ipa')
  for (const key of ['ipa', 'audioId'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      throw new LessonError(where, `поле «${key}» должно быть строкой`)
    }
  }
  return value as unknown as PhraseSource
}

function slide(file: string, index: number, value: unknown): SlideSource {
  if (!isObject(value)) {
    throw new LessonError(`${file}, слайд ${index}`, 'слайд должен быть объектом')
  }

  const type = str(`${file}, слайд ${index}`, value, 'type')
  const where = `${file}, слайд ${index} (${type}${value.id ? ` «${String(value.id)}»` : ''})`
  const fields = SLIDE_FIELDS[type as SlideSource['type']] as readonly string[] | undefined
  if (!fields) {
    throw new LessonError(
      where,
      `неизвестный type «${type}», ожидался один из ${Object.keys(SLIDE_FIELDS).join(', ')}`,
    )
  }
  for (const key of fields) {
    if (value[key] === undefined) throw new LessonError(where, `нет обязательного поля «${key}»`)
  }

  if (type === 'table') {
    const rows = value.rows
    if (!Array.isArray(rows) || rows.length === 0) throw new LessonError(where, 'rows пуст')
    if (rows.length > MAX_ROWS) {
      throw new LessonError(where, `строк ${rows.length}, в холст помещается ${MAX_ROWS}`)
    }
    rows.forEach((row, i) => phrase(`${where}, строка ${i}`, row, true))
    if (value.headers !== undefined && !isObject(value.headers)) {
      throw new LessonError(where, 'headers — объект с полями es и/или ru')
    }
  }

  if (type === 'practice') phrase(`${where}, phrase`, value.phrase, true)

  if (type === 'dialogue') {
    const lines = value.lines
    if (!Array.isArray(lines) || lines.length === 0) throw new LessonError(where, 'lines пуст')
    lines.forEach((line: unknown, i) => {
      phrase(`${where}, реплика ${i}`, line, false)
      str(`${where}, реплика ${i}`, line as Record<string, unknown>, 'speaker')
    })
  }

  if (type === 'mistake' && !MISTAKE_KINDS.includes(value.kind as string)) {
    throw new LessonError(
      where,
      `неизвестный kind «${String(value.kind)}», ожидался один из ${MISTAKE_KINDS.join(', ')}`,
    )
  }

  if (value.id !== undefined && typeof value.id !== 'string') {
    throw new LessonError(where, 'поле «id» должно быть строкой')
  }

  return value as unknown as SlideSource
}

/**
 * @param file имя файла — попадает в текст ошибки
 * @param expectedNumber номер из имени файла: lesson-07.json → 7
 */
export function parseLesson(file: string, expectedNumber: number, raw: unknown): LessonSource {
  if (!isObject(raw)) throw new LessonError(file, 'на верхнем уровне ожидался объект урока')

  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new LessonError(
      file,
      `schemaVersion = ${String(raw.schemaVersion)}, приложение понимает ${SCHEMA_VERSION}`,
    )
  }
  if (raw.number !== expectedNumber) {
    throw new LessonError(
      file,
      `number = ${String(raw.number)}, а имя файла обещает ${expectedNumber}`,
    )
  }
  str(file, raw, 'title')
  str(file, raw, 'course')
  str(file, raw, 'audioDir')

  if (!isObject(raw.speakers)) throw new LessonError(file, 'нет объекта speakers')
  for (const [key, name] of Object.entries(raw.speakers)) {
    if (typeof name !== 'string' || name === '') {
      throw new LessonError(file, `говорящий «${key}»: имя должно быть непустой строкой`)
    }
  }

  if (!isObject(raw.tableHeaders)) throw new LessonError(file, 'нет объекта tableHeaders')
  str(`${file}, tableHeaders`, raw.tableHeaders, 'es')
  str(`${file}, tableHeaders`, raw.tableHeaders, 'ru')

  if (!Array.isArray(raw.practiceGroups)) throw new LessonError(file, 'нет массива practiceGroups')
  for (const [i, group] of raw.practiceGroups.entries()) {
    if (!isObject(group)) throw new LessonError(file, `practiceGroups[${i}] — не объект`)
    str(`${file}, practiceGroups[${i}]`, group, 'name')
    if (typeof group.pauseMs !== 'number' || group.pauseMs <= 0) {
      throw new LessonError(`${file}, группа «${String(group.name)}»`, 'pauseMs — число больше нуля')
    }
  }
  const groups = raw.practiceGroups as PracticeGroupSource[]

  if (!Array.isArray(raw.slides) || raw.slides.length === 0) {
    throw new LessonError(file, 'нет слайдов')
  }
  const slides = raw.slides.map((value, index) => slide(file, index, value))

  // --- связи между частями урока -------------------------------------------

  const ids = new Set<string>()
  const audioIds = new Set<string>()
  for (const [index, s] of slides.entries()) {
    if (s.id !== undefined) {
      if (ids.has(s.id)) throw new LessonError(file, `повторяется id слайда «${s.id}»`)
      ids.add(s.id)
    }

    if (s.type === 'practice' && !groups.some((g) => g.name === s.group)) {
      throw new LessonError(
        `${file}, слайд ${index}`,
        `группа «${s.group}» не описана в practiceGroups`,
      )
    }

    if (s.type === 'dialogue') {
      for (const line of s.lines as DialogueLineSource[]) {
        if (!(line.speaker in (raw.speakers as Record<string, string>))) {
          throw new LessonError(
            `${file}, слайд ${index}`,
            `говорящий «${line.speaker}» не описан в speakers`,
          )
        }
      }
    }

    // Аудио лежит в одной папке на урок, поэтому имена не должны повторяться.
    for (const p of slidePhraseSources(s)) {
      if (p.audioId === undefined) continue
      if (audioIds.has(p.audioId)) {
        throw new LessonError(file, `повторяется audioId «${p.audioId}»`)
      }
      audioIds.add(p.audioId)
    }
  }

  return raw as unknown as LessonSource
}

function slidePhraseSources(s: SlideSource): PhraseSource[] {
  if (s.type === 'table') return s.rows
  if (s.type === 'practice') return [s.phrase]
  if (s.type === 'dialogue') return s.lines
  return []
}
