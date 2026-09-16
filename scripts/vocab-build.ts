/**
 * Собирает docs/vocabulary.md из newVocabulary и newGrammar всех уроков:
 * `npm run vocab:build`.
 *
 * Файл перезаписывается целиком и зависит только от уроков: одинаковые
 * входы — одинаковый выход (без дат и прочего меняющегося). Руками его
 * не правят — правят уроки.
 *
 * Предупреждает, если слово (с артиклем или без) уже было новым
 * в более раннем уроке.
 */
import { writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  collator,
  formatRanges,
  loadLessons,
  ROOT,
  vocabularyKey,
  withoutArticle,
} from './lessons.ts'

const OUT = join(ROOT, 'docs', 'vocabulary.md')

const { lessons, errors } = loadLessons()
for (const error of errors) console.error(`✗ ${error}`)
if (errors.length > 0) {
  console.error('\nСловарь не собран: сначала исправьте уроки (npm run lessons:validate).')
  process.exit(1)
}

const cell = (text: string) => text.replaceAll('|', '\\|')

const numbers = lessons.map(({ lesson }) => lesson.number)
const last = Math.max(0, ...numbers)
const missing = Array.from({ length: last }, (_, i) => i + 1).filter((n) => !numbers.includes(n))
const words = lessons.flatMap(({ lesson }) =>
  (lesson.newVocabulary ?? []).map((entry) => ({ ...entry, lesson: lesson.number })),
)

const lines = [
  '# Словарь курса',
  '',
  '> Генерируется командой `npm run vocab:build`. Не редактировать вручную.',
  '> Готовя урок N, считайте изученным только то, что введено в уроках с номером меньше N.',
  '',
  [
    `Уроков: ${lessons.length}`,
    `слов: ${words.length}`,
    ...(missing.length > 0 ? [`нет уроков: ${formatRanges(missing)}`] : []),
  ].join(' · '),
  '',
]

const warnings: string[] = []
const firstSeen = new Map<string, number>()

for (const { lesson } of lessons) {
  const vocabulary = lesson.newVocabulary ?? []
  const grammar = lesson.newGrammar ?? []

  lines.push(`## Урок ${lesson.number} · ${lesson.level}-${lesson.planLesson} · ${lesson.title}`, '')
  lines.push(
    vocabulary.length > 0
      ? `**Слова (${vocabulary.length}):** ${vocabulary.map((e) => `${e.es} — ${e.ru}`).join(' · ')}`
      : '**Слова:** не указаны',
    '',
  )
  lines.push(
    grammar.length > 0 ? `**Грамматика:** ${grammar.join(' · ')}` : '**Грамматика:** не указана',
    '',
  )

  for (const entry of vocabulary) {
    const key = vocabularyKey(entry.es)
    const earlier = firstSeen.get(key)
    if (earlier === undefined) firstSeen.set(key, lesson.number)
    else if (earlier !== lesson.number) {
      warnings.push(`${entry.es}: урок ${lesson.number} повторяет урок ${earlier}`)
    } else {
      warnings.push(`${entry.es}: дважды в уроке ${lesson.number}`)
    }
  }
}

// Указатель: без учёта артикля («el café» — на «c»), при равенстве — по уроку.
const index = words.toSorted(
  (a, b) =>
    collator.compare(withoutArticle(a.es), withoutArticle(b.es)) ||
    collator.compare(a.es, b.es) ||
    a.lesson - b.lesson,
)
lines.push('## Алфавитный указатель', '', '| es | ru | pos | урок |', '|---|---|---|---|')
for (const w of index) lines.push(`| ${cell(w.es)} | ${cell(w.ru)} | ${w.pos} | ${w.lesson} |`)

writeFileSync(OUT, `${lines.join('\n')}\n`)
console.log(`▸ ${relative(ROOT, OUT)}: уроков ${lessons.length}, слов ${words.length}`)
for (const warning of warnings) console.warn(`! ${warning}`)
