import { hasUnclosedMark } from '../slides/markup'
import type {
  DialogueLineSource,
  LessonSource,
  SlideSource,
} from './source'
import { LEVELS, PARTS_OF_SPEECH, SCHEMA_VERSION } from './source'

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
  rule: ['title', 'pattern', 'examples'],
  conjugation: ['verb', 'ru', 'rows'],
  compare: ['title', 'left', 'right'],
  practice: ['group', 'phrase'],
  dialogue: ['title', 'lines'],
  final: ['title', 'bullets', 'nextTitle', 'nextText'],
} as const satisfies Record<SlideSource['type'], readonly string[]>

const COMPARE_TONES = ['wrong', 'right']

/** Сколько помещается в холст 1920×1080 — по типам слайдов. */
const MAX_TABLE_ROWS = 5
const MAX_CONJUGATION_ROWS = 6
const MAX_RULE_EXAMPLES = 3
const MAX_COMPARE_ITEMS = 3
const MAX_ALTERNATIVES = 2

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

function optStr(where: string, host: Record<string, unknown>, key: string): void {
  if (host[key] !== undefined) str(where, host, key)
}

/** Непустой массив не длиннее max — с понятной ошибкой в обоих случаях. */
function list(where: string, host: Record<string, unknown>, key: string, max?: number): unknown[] {
  const value = host[key]
  if (!Array.isArray(value) || value.length === 0) {
    throw new LessonError(where, `«${key}» должно быть непустым массивом`)
  }
  if (max !== undefined && value.length > max) {
    throw new LessonError(where, `в «${key}» элементов: ${value.length}, в холст помещается ${max}`)
  }
  return value
}

/** Парность `**` в строке с выделением нового. */
function marks(where: string, host: Record<string, unknown>, key: string): void {
  const value = host[key]
  if (typeof value === 'string' && hasUnclosedMark(value)) {
    throw new LessonError(where, `в «${key}» не закрыто выделение **: «${value}»`)
  }
}

interface PhraseRules {
  /** Транскрипция обязательна: таблицы новых слов и все фразы уровня A0. */
  ipa: boolean
  /** Перевод обязателен везде, кроме пунктов сравнения. */
  ru?: boolean
}

function phrase(where: string, value: unknown, rules: PhraseRules): Record<string, unknown> {
  if (!isObject(value)) throw new LessonError(where, 'фраза должна быть объектом')
  str(where, value, 'es')
  if (rules.ru === false) optStr(where, value, 'ru')
  else str(where, value, 'ru')
  if (rules.ipa) str(where, value, 'ipa')
  if (value.ipa !== undefined && typeof value.ipa !== 'string') {
    throw new LessonError(where, 'поле «ipa» должно быть строкой')
  }
  marks(where, value, 'es')
  marks(where, value, 'ru')
  return value
}

function conjugationRow(where: string, value: unknown, ipa: boolean): void {
  if (!isObject(value)) throw new LessonError(where, 'строка спряжения должна быть объектом')
  str(where, value, 'pronoun')
  str(where, value, 'ru')
  for (const key of ['stem', 'ending'] as const) {
    if (typeof value[key] !== 'string') {
      throw new LessonError(where, `поле «${key}» должно быть строкой (можно пустой)`)
    }
  }
  if (`${String(value.stem)}${String(value.ending)}` === '') {
    throw new LessonError(where, 'stem и ending пусты одновременно — формы нет')
  }
  if (ipa) str(where, value, 'ipa')
  else optStr(where, value, 'ipa')
}

function compareSide(where: string, value: unknown): void {
  if (!isObject(value)) throw new LessonError(where, 'колонка сравнения должна быть объектом')
  str(where, value, 'label')
  if (value.tone !== undefined && !COMPARE_TONES.includes(value.tone as string)) {
    throw new LessonError(
      where,
      `неизвестный tone «${String(value.tone)}», ожидался один из ${COMPARE_TONES.join(', ')}`,
    )
  }
  list(where, value, 'items', MAX_COMPARE_ITEMS).forEach((item, i) =>
    phrase(`${where}, пункт ${i}`, item, { ipa: false, ru: false }),
  )
}

function slide(file: string, index: number, value: unknown, levelA0: boolean): SlideSource {
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
    list(where, value, 'rows', MAX_TABLE_ROWS).forEach((row, i) =>
      phrase(`${where}, строка ${i}`, row, { ipa: true }),
    )
    if (value.headers !== undefined && !isObject(value.headers)) {
      throw new LessonError(where, 'headers — объект с полями es и/или ru')
    }
  }

  if (type === 'rule') {
    str(where, value, 'title')
    list(where, value, 'pattern').forEach((token, i) => {
      if (typeof token !== 'string' || token === '') {
        throw new LessonError(`${where}, pattern[${i}]`, 'элемент формулы — непустая строка')
      }
    })
    optStr(where, value, 'text')
    list(where, value, 'examples', MAX_RULE_EXAMPLES).forEach((example, i) =>
      phrase(`${where}, пример ${i}`, example, { ipa: levelA0 }),
    )
  }

  if (type === 'conjugation') {
    str(where, value, 'verb')
    str(where, value, 'ru')
    list(where, value, 'rows', MAX_CONJUGATION_ROWS).forEach((row, i) =>
      conjugationRow(`${where}, строка ${i}`, row, levelA0),
    )
  }

  if (type === 'compare') {
    str(where, value, 'title')
    compareSide(`${where}, left`, value.left)
    compareSide(`${where}, right`, value.right)
  }

  if (type === 'practice') {
    const p = phrase(`${where}, phrase`, value.phrase, { ipa: levelA0 })
    optStr(`${where}, phrase`, p, 'hint')
    if (p.alternatives !== undefined) {
      list(`${where}, phrase`, p, 'alternatives', MAX_ALTERNATIVES).forEach((alt, i) => {
        if (typeof alt !== 'string' || alt === '') {
          throw new LessonError(`${where}, alternatives[${i}]`, 'вариант ответа — непустая строка')
        }
        if (hasUnclosedMark(alt)) {
          throw new LessonError(`${where}, alternatives[${i}]`, `не закрыто выделение **: «${alt}»`)
        }
      })
    }
    if (value.pauseMs !== undefined && (typeof value.pauseMs !== 'number' || value.pauseMs <= 0)) {
      throw new LessonError(where, 'pauseMs — число больше нуля')
    }
  }

  if (type === 'dialogue') {
    list(where, value, 'lines').forEach((line, i) => {
      phrase(`${where}, реплика ${i}`, line, { ipa: false })
      str(`${where}, реплика ${i}`, line as Record<string, unknown>, 'speaker')
    })
  }

  if (value.id !== undefined && typeof value.id !== 'string') {
    throw new LessonError(where, 'поле «id» должно быть строкой')
  }

  return value as unknown as SlideSource
}

function vocabulary(file: string, raw: Record<string, unknown>): void {
  if (raw.newVocabulary !== undefined) {
    if (!Array.isArray(raw.newVocabulary)) throw new LessonError(file, 'newVocabulary — массив')
    for (const [i, entry] of raw.newVocabulary.entries()) {
      const where = `${file}, newVocabulary[${i}]`
      if (!isObject(entry)) throw new LessonError(where, 'запись словаря должна быть объектом')
      str(where, entry, 'es')
      str(where, entry, 'ru')
      if (!(PARTS_OF_SPEECH as readonly string[]).includes(entry.pos as string)) {
        throw new LessonError(
          where,
          `неизвестный pos «${String(entry.pos)}», ожидался один из ${PARTS_OF_SPEECH.join(', ')}`,
        )
      }
    }
  }
  if (raw.newGrammar !== undefined) {
    if (!Array.isArray(raw.newGrammar)) throw new LessonError(file, 'newGrammar — массив строк')
    raw.newGrammar.forEach((item, i) => {
      if (typeof item !== 'string' || item === '') {
        throw new LessonError(`${file}, newGrammar[${i}]`, 'должна быть непустая строка')
      }
    })
  }
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
  if (!(LEVELS as readonly string[]).includes(raw.level as string)) {
    throw new LessonError(
      file,
      `неизвестный level «${String(raw.level)}», ожидался один из ${LEVELS.join(', ')}`,
    )
  }
  if (!Number.isInteger(raw.planLesson) || (raw.planLesson as number) <= 0) {
    throw new LessonError(file, 'planLesson — номер урока внутри уровня, целое больше нуля')
  }
  const levelA0 = raw.level === 'A0'

  str(file, raw, 'title')
  str(file, raw, 'course')
  vocabulary(file, raw)

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
    if (group.pauseMs !== undefined && (typeof group.pauseMs !== 'number' || group.pauseMs <= 0)) {
      throw new LessonError(
        `${file}, группа «${String(group.name)}»`,
        'pauseMs — число больше нуля или не задан (тогда пауза по длине фразы)',
      )
    }
  }
  const groupNames = new Set(raw.practiceGroups.map((g: Record<string, unknown>) => g.name))

  if (!Array.isArray(raw.slides) || raw.slides.length === 0) {
    throw new LessonError(file, 'нет слайдов')
  }
  const slides = raw.slides.map((value, index) => slide(file, index, value, levelA0))

  // --- связи между частями урока -------------------------------------------

  const ids = new Set<string>()
  for (const [index, s] of slides.entries()) {
    if (s.id !== undefined) {
      if (ids.has(s.id)) throw new LessonError(file, `повторяется id слайда «${s.id}»`)
      ids.add(s.id)
    }

    if (s.type === 'practice' && !groupNames.has(s.group)) {
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
  }

  return raw as unknown as LessonSource
}
