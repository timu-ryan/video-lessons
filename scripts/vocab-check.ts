/**
 * Нет ли в уроке N слов, которые ещё не вводились: `npm run vocab:check -- N`.
 *
 * Эвристика, поэтому только предупреждения и код выхода 0.
 *
 * Известные формы — всё из уроков с number < N плюс сам урок N:
 *   - `es` из newVocabulary — с артиклем и без; у существительных
 *     и прилагательных — множественное число, у прилагательных на -o —
 *     ещё -a и -as;
 *   - у глаголов — инфинитив и шесть форм настоящего времени правильного
 *     спряжения по окончанию -ar / -er / -ir;
 *   - формы из слайдов conjugation (stem + ending);
 *   - слова из `es` строк table.
 *
 * Проверяется `es` и `alternatives` в rule, practice, dialogue, compare.
 * Имена собственные — в tools/vocab-ignore.txt.
 *
 * Адрес находки — тип слайда и номер фразы этого типа по порядку в уроке:
 * practice-14 — четырнадцатое задание, dialogue-05 — пятая реплика,
 * rule-04 — четвёртый пример, compare-07 — седьмая строка сравнения.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LessonSource, VocabularyEntrySource } from '../src/features/lessons/source.ts'
import { collator, loadLessons, ROOT, tokenize, withoutArticle } from './lessons.ts'

const IGNORE_FILE = join(ROOT, 'tools', 'vocab-ignore.txt')

const ENDINGS = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
} as const

const arg = process.argv[2]
const target = Number(arg)
if (!arg || !Number.isInteger(target) || target <= 0) {
  console.error('Использование: npm run vocab:check -- <номер урока>')
  process.exit(1)
}

const { lessons, errors } = loadLessons()
for (const error of errors) console.warn(`! пропущен: ${error}`)

const current = lessons.find(({ lesson }) => lesson.number === target)?.lesson
if (!current) {
  console.error(`Урок ${target} не найден среди загруженных lessons/*.json`)
  process.exit(1)
}

const ignored = new Set(
  readFileSync(IGNORE_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line !== '' && !line.startsWith('#')),
)

const known = new Set<string>()
for (const { lesson } of lessons) {
  if (lesson.number <= target) addKnown(lesson)
}

// слово → адреса, где встретилось, в порядке урока
const unknown = new Map<string, string[]>()
const counters = new Map<string, number>()
for (const slide of current.slides) {
  const texts: string[][] = (() => {
    switch (slide.type) {
      case 'rule':
        return slide.examples.map((p) => [p.es])
      case 'practice':
        return [[slide.phrase.es, ...(slide.phrase.alternatives ?? [])]]
      case 'dialogue':
        return slide.lines.map((line) => [line.es])
      case 'compare': {
        // Пункты идут парами по строкам — адрес у строки один.
        const rows = Math.max(slide.left.items.length, slide.right.items.length)
        return Array.from({ length: rows }, (_, i) =>
          [slide.left.items[i]?.es, slide.right.items[i]?.es].filter((es) => es !== undefined),
        )
      }
      default:
        return []
    }
  })()
  for (const phrase of texts) {
    const n = (counters.get(slide.type) ?? 0) + 1
    counters.set(slide.type, n)
    const where = `${slide.type}-${String(n).padStart(2, '0')}`
    for (const word of new Set(phrase.flatMap(tokenize))) {
      if (known.has(word) || ignored.has(word)) continue
      const places = unknown.get(word) ?? []
      if (!places.includes(where)) places.push(where)
      unknown.set(word, places)
    }
  }
}

if (unknown.size === 0) {
  console.log(`✓ Урок ${target}: все слова известны`)
} else {
  console.warn(`Урок ${target}: слов, которые не вводились раньше, — ${unknown.size}`)
  for (const word of [...unknown.keys()].sort(collator.compare)) {
    console.warn(`  ${word} — ${unknown.get(word)!.join(', ')}`)
  }
}

// --- известные формы -----------------------------------------------------------

function addKnown(lesson: LessonSource): void {
  for (const entry of lesson.newVocabulary ?? []) addEntry(entry)
  for (const slide of lesson.slides) {
    if (slide.type === 'conjugation') {
      for (const row of slide.rows) tokenize(row.stem + row.ending).forEach(add)
    }
    if (slide.type === 'table') {
      for (const row of slide.rows) tokenize(row.es).forEach(add)
    }
  }
}

function addEntry({ es, pos }: VocabularyEntrySource): void {
  tokenize(es).forEach(add)
  const base = tokenize(withoutArticle(es))
  const [word] = base
  if (base.length !== 1 || !word) return

  if (pos === 'noun' || pos === 'adj') {
    add(plural(word))
    if (pos === 'adj' && word.endsWith('o')) {
      add(`${word.slice(0, -1)}a`)
      add(`${word.slice(0, -1)}as`)
    }
  }
  if (pos === 'verb') {
    // Возвратный инфинитив (llamarse) спрягается по основе без -se.
    const infinitive = /[aei]rse$/.test(word) ? word.slice(0, -2) : word
    const group = infinitive.slice(-2) as keyof typeof ENDINGS
    if (group in ENDINGS) {
      const stem = infinitive.slice(0, -2)
      add(infinitive)
      for (const ending of ENDINGS[group]) add(stem + ending)
    }
  }
}

/** Множественное число: -s после гласной, -es после согласной, z → ces. */
function plural(word: string): string {
  if (/[aeiouáéó]$/.test(word)) return `${word}s`
  if (word.endsWith('z')) return `${word.slice(0, -1)}ces`
  // Ударение переходит на другой слог: inglés → ingleses, canción → canciones.
  const unstressed = word.replace(/[áéíóú](?=[ns]$)/, (v) => v.normalize('NFD')[0]!)
  return `${unstressed}es`
}

function add(form: string): void {
  known.add(form)
}
