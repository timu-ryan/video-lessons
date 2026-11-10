/**
 * Что недоработано к практическому уроку: `npm run practice:gaps -- 1-4`.
 *
 * Аргумент — уроки блока, которые закрепляет практика (from–to). Считает,
 * сколько раз каждое слово словаря прозвучало в речи: задания практики,
 * реплики диалогов и предложения текстов уроков 1…to. Таблицы и правила не
 * считаются — там слово показывают, а не говорят.
 *
 * Печатает:
 *   - грамматику уроков блока (newGrammar) — у каждой темы должен быть блок
 *     или заметная доля заданий;
 *   - слова блока, прозвучавшие 0–2 раза, — их практика обязана задействовать;
 *   - слова прошлых уроков (до from), прозвучавшие 0–1 раз, — кандидаты
 *     для блока «Вперемешку».
 *
 * Эвристика: формы — правильное спряжение, множественное число, род
 * прилагательных и все формы из слайдов conjugation / conjugationCompare.
 * Неправильную форму, которой не было в спряжении, она не узнает.
 */
import type { LessonSource, VocabularyEntrySource } from '../src/features/lessons/source.ts'
import { plainText } from '../src/features/slides/markup.ts'
import { loadLessons, tokenize, withoutArticle } from './lessons.ts'

const ENDINGS = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
} as const

const match = /^(\d+)[-–](\d+)$/.exec(process.argv[2] ?? '')
const from = Number(match?.[1])
const to = Number(match?.[2])
if (!match || from <= 0 || to < from) {
  console.error('Использование: npm run practice:gaps -- <первый урок>-<последний урок>, например 1-4')
  process.exit(1)
}

const { lessons: loaded, errors } = loadLessons()
for (const error of errors) console.warn(`! пропущен: ${error}`)
const lessons = loaded.map(({ lesson }) => lesson).filter((lesson) => lesson.number <= to)
if (!lessons.some((lesson) => lesson.number === to)) {
  console.error(`Урока ${to} нет в lessons/`)
  process.exit(1)
}

// --- формы глаголов из спряжений: инфинитив → формы ---------------------------

const verbForms = new Map<string, Set<string>>()
const addVerbForm = (verb: string, form: string) => {
  const key = verb.toLowerCase()
  const forms = verbForms.get(key) ?? new Set<string>()
  tokenize(form).forEach((f) => forms.add(f))
  verbForms.set(key, forms)
}
for (const lesson of lessons) {
  for (const slide of lesson.slides) {
    if (slide.type === 'conjugation') {
      for (const row of slide.rows) addVerbForm(slide.verb, row.stem + row.ending)
    }
    if (slide.type === 'conjugationCompare') {
      for (const row of slide.rows) {
        row.forms.forEach((form, i) => {
          const verb = slide.verbs[i]?.verb
          if (verb) addVerbForm(verb, form.stem + form.ending)
        })
      }
    }
  }
}

/** Все формы одного варианта словарной записи: «tener que» → «tengo que», … */
function variantForms(variant: string, pos: VocabularyEntrySource['pos']): string[] {
  const words = tokenize(withoutArticle(variant))
  const [head, ...rest] = words
  if (!head) return []
  const tail = rest.length > 0 ? ` ${rest.join(' ')}` : ''
  const heads = new Set<string>([head])

  const infinitive = /[aei]rse$/.test(head) ? head.slice(0, -2) : head
  const group = infinitive.slice(-2) as keyof typeof ENDINGS
  // Спряжение бывает и у сочетания целиком: conjugation «tener que» → tengo, tienes…
  const conjugated = verbForms.get(words.join(' ')) ?? verbForms.get(infinitive)
  if ((pos === 'verb' || conjugated) && group in ENDINGS) {
    heads.add(infinitive)
    for (const ending of ENDINGS[group]) heads.add(infinitive.slice(0, -2) + ending)
    conjugated?.forEach((form) => heads.add(form))
  }
  if (rest.length === 0 && (pos === 'noun' || pos === 'adj')) {
    heads.add(/[aeiouáéó]$/.test(head) ? `${head}s` : `${head}es`)
    if (pos === 'adj' && head.endsWith('o')) {
      heads.add(`${head.slice(0, -1)}a`)
      heads.add(`${head.slice(0, -1)}as`)
    }
  }
  return [...heads].map((h) => h + tail)
}

function entryForms({ es, pos }: VocabularyEntrySource): string[] {
  return plainText(es)
    .split(/,|\s\/\s/)
    .flatMap((variant) => variantForms(variant, pos))
}

// --- где слово прозвучало ----------------------------------------------------

/** Речь урока: нормализованные строки « слово слово », чтобы искать сочетания целиком. */
function speech(lesson: LessonSource): string[] {
  const texts: string[] = []
  for (const slide of lesson.slides) {
    if (slide.type === 'practice') texts.push(slide.phrase.es)
    if (slide.type === 'dialogue') slide.lines.forEach((line) => texts.push(line.es))
    if (slide.type === 'text') slide.sentences.forEach((sentence) => texts.push(sentence.es))
  }
  return texts.map((text) => ` ${tokenize(text).join(' ')} `)
}

const speechByLesson = new Map(lessons.map((lesson) => [lesson.number, speech(lesson)]))

interface Usage {
  entry: VocabularyEntrySource
  lesson: number
  total: number
  /** Номера уроков, где слово звучало. */
  where: number[]
}

const usages: Usage[] = []
for (const lesson of lessons) {
  for (const entry of lesson.newVocabulary ?? []) {
    if (entry.pos === 'art') continue
    const forms = entryForms(entry).map((form) => ` ${form} `)
    let total = 0
    const where: number[] = []
    for (const [number, lines] of speechByLesson) {
      const hits = lines.filter((line) => forms.some((form) => line.includes(form))).length
      total += hits
      if (hits > 0) where.push(number)
    }
    usages.push({ entry, lesson: lesson.number, total, where })
  }
}

// --- отчёт ----------------------------------------------------------------------

const range = from === to ? `урок ${from}` : `уроки ${from}–${to}`
console.log(`Практика: ${range}. Речь — задания, диалоги и тексты уроков 1–${to}.\n`)

console.log('Грамматика блока:')
for (const lesson of lessons.filter((l) => l.number >= from)) {
  console.log(`  ${lesson.number}. ${lesson.title}`)
  for (const line of lesson.newGrammar ?? []) console.log(`     · ${line}`)
}

const label = ({ entry, lesson, where }: Usage) => {
  const heard = where.length > 0 ? `; звучало в ${where.join(', ')}` : ''
  return `${plainText(entry.es)} — ${entry.ru} (урок ${lesson}${heard})`
}

const block = usages.filter((u) => u.lesson >= from)
console.log(`\nСлова блока, прозвучавшие 0–2 раза (всего слов в блоке: ${block.length}):`)
for (const times of [0, 1, 2]) {
  const rare = block.filter((u) => u.total === times)
  if (rare.length === 0) continue
  console.log(`  ${times} ${times === 0 || times === 1 ? 'раз' : 'раза'}:`)
  for (const usage of rare) console.log(`    ${label(usage)}`)
}

const earlier = usages.filter((u) => u.lesson < from && u.total <= 1)
if (from > 1) {
  console.log(`\nСлова уроков 1–${from - 1}, прозвучавшие 0–1 раз, — для «Вперемешку»: ${earlier.length}`)
  for (const usage of earlier) console.log(`    ${label(usage)}`)
}
