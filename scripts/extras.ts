/**
 * Дополнительные материалы урока — платный PDF для подписчиков:
 * extras/lesson-NN.json. Формат — раздел 14 docs/lessons-guide.md.
 *
 * Лежат отдельно от уроков нарочно: vocab:build читает только lessons/,
 * поэтому бонусные выражения не попадают в словарь курса, а пересборка
 * урока из сценария не затирает допматериалы. Приложению они не нужны —
 * разбор живёт в скриптах, на помощниках parse.ts.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  alternatives,
  count,
  isObject,
  LessonError,
  list,
  marks,
  optStr,
  phrase,
  str,
} from '../src/features/lessons/parse.ts'
import type {
  LessonSource,
  PhraseSource,
  PracticePhraseSource,
} from '../src/features/lessons/source.ts'
import { plainText } from '../src/features/slides/markup.ts'
import { ROOT } from './lessons.ts'

export const EXTRAS_DIR = join(ROOT, 'extras')

/** Как у уроков: номер — из имени файла. */
const FILE_PATTERN = /lesson-(\d+)\.json$/

// --- форма файла ---------------------------------------------------------------

/** Бонусное выражение: в словарь курса не входит. */
export interface ExpressionSource extends PhraseSource {
  ipa: string
  /** Когда и как говорят; «подробно — в уроке X». */
  note?: string
  example?: PhraseSource
}

/** Перевод с русского: как задание `practice`. */
export interface TranslateExerciseSource {
  type: 'translate'
  title: string
  tasks: PracticePhraseSource[]
}

export interface FixTaskSource {
  /** Фраза с одной ошибкой — печатается как есть, без выделения. */
  wrong: string
  /** Верная фраза; исправленное выделено `**…**`. */
  es: string
  ru: string
  /** Почему так: одна короткая фраза в ответах. */
  why?: string
}

export interface FixExerciseSource {
  type: 'fix'
  title: string
  tasks: FixTaskSource[]
}

export interface GapTaskSource {
  /** Фраза с одним пропуском `___`. */
  es: string
  /** Что вставить — одно из `options` блока. */
  answer: string
  /** Перевод-подсказка, когда без него ответ неоднозначен. */
  ru?: string
}

export interface GapExerciseSource {
  type: 'gap'
  title: string
  /** Варианты для всего блока: muy / mucho. */
  options: string[]
  tasks: GapTaskSource[]
}

/** Перевод с испанского: `es` — задание, `ru` — ответ. */
export interface ReadExerciseSource {
  type: 'read'
  title: string
  tasks: PhraseSource[]
}

export type ExerciseSource =
  | TranslateExerciseSource
  | FixExerciseSource
  | GapExerciseSource
  | ReadExerciseSource

export const EXERCISE_TYPES = ['translate', 'fix', 'gap', 'read'] as const

export interface StoryLineSource extends PhraseSource {
  /** Имя говорящего, если история — диалог. */
  speaker?: string
}

export interface StorySource {
  title: string
  lines: StoryLineSource[]
  /** Слова вне словаря курса, без которых история не складывается. */
  glossary?: PhraseSource[]
  questions: { question: string; answer: string }[]
}

export const CULTURE_KINDS = ['refrán', 'trabalenguas', 'fact', 'song'] as const

/** «Испания изнутри»: пословица, скороговорка, факт или песня. */
export interface CultureSource {
  kind: (typeof CULTURE_KINDS)[number]
  title: string
  /** Пословица, скороговорка, название песни. С ним обязательна `ipa`. */
  es?: string
  ipa?: string
  ru?: string
  text: string
}

export interface YourTurnSource {
  task: string
  /** Начала фраз-плашки: «Me gusta…». */
  template?: string[]
  /** Образец ответа — под строками для записи: задание открытое, это подсказка. */
  model: PhraseSource[]
}

export interface ExtraSource {
  number: number
  expressions: ExpressionSource[]
  exercises: ExerciseSource[]
  story: StorySource
  phrases: PhraseSource[]
  culture: CultureSource
  yourTurn: YourTurnSource
}

// --- разбор ---------------------------------------------------------------------

/** Чтобы допматериалы уместились на 3–4 страницы A4. */
const EXPRESSIONS = { min: 2, max: 4 }
const EXERCISES = { min: 2, max: 5 }
const BLOCK_TASKS = { min: 3, max: 12 }
const ALL_TASKS = { min: 20, max: 40 }
const GAP_OPTIONS = { min: 2, max: 3 }
const STORY_LINES = { min: 4, max: 10 }
const STORY_QUESTIONS = { min: 2, max: 4 }
const MAX_GLOSSARY = 2
const PHRASES = { min: 4, max: 8 }
const MODEL = { min: 3, max: 6 }
const MAX_TEMPLATE = 4

/** Пропуск в задании `gap`. */
export const GAP = '___'

/** Как в check-slides.mjs: запись фонемная, без аллофонов. */
const FORBIDDEN_IPA = 'βðɣʎ'

function ipaValue(where: string, host: Record<string, unknown>): void {
  if (typeof host.ipa !== 'string') return
  const found = [...host.ipa].filter((c) => FORBIDDEN_IPA.includes(c))
  if (found.length > 0) {
    throw new LessonError(
      where,
      `«${host.ipa}» — запись не фонемная (${[...new Set(found)].join(' ')}), см. раздел 8 справочника`,
    )
  }
}

function extraPhrase(where: string, value: unknown, ipa: boolean): Record<string, unknown> {
  const p = phrase(where, value, { ipa })
  ipaValue(where, p)
  return p
}

function obj(where: string, host: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = host[key]
  if (!isObject(value)) throw new LessonError(where, `«${key}» должно быть объектом`)
  return value
}

function ranged(
  where: string,
  host: Record<string, unknown>,
  key: string,
  range: { min: number; max: number },
): unknown[] {
  const items = list(where, host, key)
  count(where, items, key, range)
  return items
}

function exercise(where: string, value: unknown): number {
  if (!isObject(value)) throw new LessonError(where, 'блок упражнения должен быть объектом')
  const type = str(where, value, 'type')
  if (!(EXERCISE_TYPES as readonly string[]).includes(type)) {
    throw new LessonError(where, `неизвестный type «${type}», ожидался один из ${EXERCISE_TYPES.join(', ')}`)
  }
  const at = `${where} (${type})`
  str(at, value, 'title')
  const tasks = ranged(at, value, 'tasks', BLOCK_TASKS)

  const options =
    type === 'gap'
      ? ranged(at, value, 'options', GAP_OPTIONS).map((option, i) => {
          if (typeof option !== 'string' || option === '') {
            throw new LessonError(`${at}, options[${i}]`, 'вариант — непустая строка')
          }
          return option
        })
      : []

  tasks.forEach((task, i) => {
    const t = `${at}, задание ${i}`
    if (!isObject(task)) throw new LessonError(t, 'задание должно быть объектом')
    switch (type) {
      case 'translate':
        extraPhrase(t, task, false)
        optStr(t, task, 'hint')
        alternatives(t, task)
        break
      case 'fix':
        extraPhrase(t, task, false)
        str(t, task, 'wrong')
        marks(t, task, 'wrong')
        optStr(t, task, 'why')
        if (plainText(task.wrong as string) === plainText(task.es as string)) {
          throw new LessonError(t, '«wrong» совпадает с «es» — ошибки нет')
        }
        break
      case 'gap': {
        str(t, task, 'es')
        marks(t, task, 'es')
        optStr(t, task, 'ru')
        const answer = str(t, task, 'answer')
        if ((task.es as string).split(GAP).length !== 2) {
          throw new LessonError(t, `в «es» должен быть ровно один пропуск ${GAP}: «${String(task.es)}»`)
        }
        if (!options.includes(answer)) {
          throw new LessonError(t, `ответ «${answer}» не из вариантов: ${options.join(', ')}`)
        }
        break
      }
      case 'read':
        extraPhrase(t, task, false)
        break
    }
  })
  return tasks.length
}

function story(where: string, value: Record<string, unknown>): void {
  str(where, value, 'title')
  ranged(where, value, 'lines', STORY_LINES).forEach((line, i) => {
    const p = extraPhrase(`${where}, строка ${i}`, line, false)
    optStr(`${where}, строка ${i}`, p, 'speaker')
  })
  if (value.glossary !== undefined) {
    const glossary = list(where, value, 'glossary')
    count(where, glossary, 'glossary', { min: 1, max: MAX_GLOSSARY })
    glossary.forEach((entry, i) => extraPhrase(`${where}, glossary[${i}]`, entry, false))
  }
  ranged(where, value, 'questions', STORY_QUESTIONS).forEach((q, i) => {
    const at = `${where}, вопрос ${i}`
    if (!isObject(q)) throw new LessonError(at, 'вопрос должен быть объектом { question, answer }')
    str(at, q, 'question')
    str(at, q, 'answer')
  })
}

function culture(where: string, value: Record<string, unknown>): void {
  const kind = str(where, value, 'kind')
  if (!(CULTURE_KINDS as readonly string[]).includes(kind)) {
    throw new LessonError(where, `неизвестный kind «${kind}», ожидался один из ${CULTURE_KINDS.join(', ')}`)
  }
  str(where, value, 'title')
  str(where, value, 'text')
  marks(where, value, 'text')
  optStr(where, value, 'ru')
  if (kind === 'refrán' || kind === 'trabalenguas') str(where, value, 'es')
  if (value.es !== undefined) {
    str(where, value, 'es')
    str(where, value, 'ipa')
  }
  ipaValue(where, value)
}

function yourTurn(where: string, value: Record<string, unknown>): void {
  str(where, value, 'task')
  if (value.template !== undefined) {
    const template = list(where, value, 'template')
    count(where, template, 'template', { min: 1, max: MAX_TEMPLATE })
    template.forEach((item, i) => {
      if (typeof item !== 'string' || item === '') {
        throw new LessonError(`${where}, template[${i}]`, 'начало фразы — непустая строка')
      }
    })
  }
  ranged(where, value, 'model', MODEL).forEach((p, i) => extraPhrase(`${where}, model[${i}]`, p, false))
}

/**
 * @param file адрес для ошибок: extras/lesson-07.json
 * @param lesson урок с тем же номером — нужен уровень (на A0 у фраз обязательна `ipa`)
 */
export function parseExtra(file: string, lesson: LessonSource, raw: unknown): ExtraSource {
  if (!isObject(raw)) throw new LessonError(file, 'на верхнем уровне ожидался объект')
  if (raw.number !== lesson.number) {
    throw new LessonError(file, `number = ${String(raw.number)}, а имя файла обещает ${lesson.number}`)
  }
  const levelA0 = lesson.level === 'A0'

  ranged(file, raw, 'expressions', EXPRESSIONS).forEach((value, i) => {
    const where = `${file}, expressions[${i}]`
    const e = extraPhrase(where, value, true)
    optStr(where, e, 'note')
    if (e.example !== undefined) extraPhrase(`${where}, example`, e.example, false)
  })

  const tasks = ranged(file, raw, 'exercises', EXERCISES).reduce<number>(
    (sum, value, i) => sum + exercise(`${file}, exercises[${i}]`, value),
    0,
  )
  if (tasks < ALL_TASKS.min || tasks > ALL_TASKS.max) {
    throw new LessonError(
      `${file}, exercises`,
      `заданий всего: ${tasks}, нужно от ${ALL_TASKS.min} до ${ALL_TASKS.max}`,
    )
  }

  story(`${file}, story`, obj(file, raw, 'story'))
  ranged(file, raw, 'phrases', PHRASES).forEach((p, i) =>
    extraPhrase(`${file}, phrases[${i}]`, p, levelA0),
  )
  culture(`${file}, culture`, obj(file, raw, 'culture'))
  yourTurn(`${file}, yourTurn`, obj(file, raw, 'yourTurn'))

  return raw as unknown as ExtraSource
}

// --- загрузка -------------------------------------------------------------------

export interface ExtraFile {
  file: string
  extra: ExtraSource
  lesson: LessonSource
}

/**
 * Все extras/*.json, у которых есть урок среди `lessons`. Нет папки —
 * нет допматериалов, это не ошибка.
 */
export function loadExtras(lessons: LessonSource[]): { extras: ExtraFile[]; errors: string[] } {
  const extras: ExtraFile[] = []
  const errors: string[] = []
  if (!existsSync(EXTRAS_DIR)) return { extras, errors }

  const files = readdirSync(EXTRAS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
  for (const name of files) {
    const file = `extras/${name}`
    const number = FILE_PATTERN.exec(name)?.[1]
    if (!number) {
      errors.push(`${file}: имя не по шаблону lesson-NN.json`)
      continue
    }
    const lesson = lessons.find((l) => l.number === Number.parseInt(number, 10))
    if (!lesson) {
      errors.push(`${file}: нет урока ${Number.parseInt(number, 10)} среди загруженных lessons/*.json`)
      continue
    }
    try {
      const raw: unknown = JSON.parse(readFileSync(join(EXTRAS_DIR, name), 'utf8'))
      extras.push({ file, extra: parseExtra(file, lesson, raw), lesson })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(error instanceof SyntaxError ? `${file}: не JSON — ${message}` : message)
    }
  }

  extras.sort((a, b) => a.lesson.number - b.lesson.number)
  return { extras, errors }
}

/** Фраза `gap` с ответом на месте пропуска. */
const fillGap = (task: GapTaskSource): string => task.es.replace(GAP, task.answer)

/**
 * Испанские фразы допматериалов, написанные курсом, — с адресом для отчёта:
 * extra-translate-03, extra-story-02. Сами выражения и `culture` не входят:
 * выражения новые нарочно, пословица и скороговорка — цитата. Примеры
 * к выражениям входят: кроме выражения, в них только известные слова.
 */
export function extraTexts(extra: ExtraSource): { where: string; texts: string[] }[] {
  const out: { where: string; texts: string[] }[] = []
  const counters = new Map<string, number>()
  const push = (kind: string, texts: (string | undefined)[]) => {
    const n = (counters.get(kind) ?? 0) + 1
    counters.set(kind, n)
    out.push({
      where: `extra-${kind}-${String(n).padStart(2, '0')}`,
      texts: texts.filter((t): t is string => t !== undefined),
    })
  }
  for (const block of extra.exercises) {
    switch (block.type) {
      case 'translate':
        for (const t of block.tasks) push('translate', [t.es, ...(t.alternatives ?? [])])
        break
      case 'fix':
        // `wrong` не проверяется: ошибка там нарочно
        for (const t of block.tasks) push('fix', [t.es])
        break
      case 'gap':
        for (const t of block.tasks) push('gap', [fillGap(t)])
        break
      case 'read':
        for (const t of block.tasks) push('read', [t.es])
        break
    }
  }
  for (const e of extra.expressions) if (e.example) push('example', [e.example.es])
  for (const line of extra.story.lines) push('story', [line.es])
  for (const q of extra.story.questions) push('question', [q.question, q.answer])
  for (const p of extra.phrases) push('phrase', [p.es])
  for (const p of extra.yourTurn.model) push('model', [p.es])
  return out
}
