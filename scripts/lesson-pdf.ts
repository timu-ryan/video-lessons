/**
 * PDF-конспект урока для печати на A4: `npm run lessons:pdf -- N [--html]`.
 *
 * Порядок: шапка → теория (table, rule, conjugation, compare по разделам) →
 * практика «переведи сам» с пустой колонкой → диалоги → новые слова →
 * итог урока → ответы с новой страницы. `notes` в конспект не попадают.
 *
 * Результат — handouts/lesson-NN.pdf; с `--html` рядом кладётся .html
 * для отладки вёрстки.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { chromium } from 'playwright'
import type {
  CompareSlideSource,
  ConjugationSlideSource,
  DialogueSlideSource,
  LessonSource,
  PracticeSlideSource,
  RuleSlideSource,
  SlideSource,
  TableSlideSource,
} from '../src/features/lessons/source.ts'
import { plainText, splitMarks } from '../src/features/slides/markup.ts'
import { loadLessons, ROOT } from './lessons.ts'

const OUT_DIR = join(ROOT, 'handouts')

/** Канал курса — в подвале каждой страницы. */
const TELEGRAM = 'espanolcontim'

const args = process.argv.slice(2)
const withHtml = args.includes('--html')
const arg = args.find((a) => !a.startsWith('--'))
const target = Number(arg)
if (!arg || !Number.isInteger(target) || target <= 0) {
  console.error('Использование: npm run lessons:pdf -- <номер урока> [--html]')
  process.exit(1)
}

const { lessons, errors } = loadLessons()
const found = lessons.find(({ lesson }) => lesson.number === target)
if (!found) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error(`\nУрок ${target} не найден или не прошёл проверку (npm run lessons:validate).`)
  process.exit(1)
}

// --- html --------------------------------------------------------------------

const escape = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** `**…**` → `<strong>`. */
const marked = (text: string): string =>
  splitMarks(text)
    .map((part) => (part.marked ? `<strong>${escape(part.text)}</strong>` : escape(part.text)))
    .join('')

const ipa = (value: string | undefined): string =>
  value ? `<span class="ipa">[${escape(value)}]</span>` : ''

const CYRILLIC = /[а-яё]/i

/** Сколько строк таблицы не отрывать друг от друга в начале и в конце. */
const KEEP_ROWS = 2

/**
 * Тело таблицы: первые и последние KEEP_ROWS строк — в отдельных `tbody`,
 * которые не рвутся. На новую страницу не уходит одна последняя строка,
 * а под заголовком не остаётся одна первая.
 */
function tbody(rows: string[]): string {
  if (rows.length <= KEEP_ROWS * 2) return `<tbody class="keep">${rows.join('')}</tbody>`
  const head = rows.slice(0, KEEP_ROWS)
  const middle = rows.slice(KEEP_ROWS, -KEEP_ROWS)
  const tail = rows.slice(-KEEP_ROWS)
  return [
    `<tbody class="keep">${head.join('')}</tbody>`,
    middle.length > 0 ? `<tbody>${middle.join('')}</tbody>` : '',
    `<tbody class="keep">${tail.join('')}</tbody>`,
  ].join('')
}

/** Подряд идущие диалоги с одинаковым title — один диалог, как «1/2», «2/2» на слайдах. */
function dialogueRuns(slides: SlideSource[]): { title: string; slides: DialogueSlideSource[] }[] {
  const runs: { title: string; slides: DialogueSlideSource[] }[] = []
  slides.forEach((slide, i) => {
    if (slide.type !== 'dialogue') return
    const previous = slides[i - 1]
    const last = runs.at(-1)
    if (last && previous?.type === 'dialogue' && previous.title === slide.title) last.slides.push(slide)
    else runs.push({ title: slide.title, slides: [slide] })
  })
  return runs
}

function renderTable(lesson: LessonSource, title: string, slides: TableSlideSource[]): string {
  const headers = { ...lesson.tableHeaders, ...slides[0]!.headers }
  const rows = slides
    .flatMap((slide) => slide.rows)
    .map(
      (row) =>
        `<tr><td class="es">${marked(row.es)}</td><td>${ipa(row.ipa)}</td><td>${marked(row.ru)}</td></tr>`,
    )
  return `<div><h3>${escape(title)}</h3>
<table class="words"><colgroup><col class="c-es"><col class="c-ipa"><col></colgroup>
<thead><tr><th>${escape(headers.es)}</th><th>Произношение</th><th>${escape(headers.ru)}</th></tr></thead>
${tbody(rows)}</table></div>`
}

function renderRule(slide: RuleSlideSource): string {
  const pattern = slide.pattern
    .map((item) => {
      if (item === '+') return '<span class="plus">+</span>'
      return `<span class="${CYRILLIC.test(item) ? 'slot' : 'chip'}">${escape(item)}</span>`
    })
    .join('')
  const examples = slide.examples
    .map(
      (example) =>
        `<li><span class="es">${marked(example.es)}</span> ${ipa(example.ipa)}<br><span class="ru">${marked(example.ru)}</span></li>`,
    )
    .join('')
  return `<div class="block rule"><h3>${escape(slide.title)}</h3>
<div class="pattern">${pattern}</div>
${slide.text ? `<p class="text">${escape(slide.text)}</p>` : ''}
<ul class="examples">${examples}</ul></div>`
}

function renderConjugation(slide: ConjugationSlideSource): string {
  const rows = slide.rows
    .map(
      (row) =>
        `<tr><td class="pronoun">${escape(row.pronoun)}</td><td class="es">${escape(row.stem)}<strong>${escape(row.ending)}</strong></td><td>${ipa(row.ipa)}</td><td>${escape(row.ru)}</td></tr>`,
    )
    .join('')
  return `<div class="block"><h3><span class="es">${escape(slide.verb)}</span> — ${escape(slide.ru)}</h3>
<table class="words"><tbody>${rows}</tbody></table></div>`
}

function renderCompare(slide: CompareSlideSource): string {
  const side = (s: CompareSlideSource['left']): string => {
    const mark = s.tone === 'wrong' ? '✗ ' : s.tone === 'right' ? '✓ ' : ''
    const items = s.items
      .map(
        (item) =>
          `<li><span class="es">${marked(item.es)}</span>${item.ru ? `<br><span class="ru">${marked(item.ru)}</span>` : ''}</li>`,
      )
      .join('')
    return `<div class="side ${s.tone ?? ''}"><div class="label">${mark}${escape(s.label)}</div><ul>${items}</ul></div>`
  }
  return `<div class="block"><h3>${escape(slide.title)}</h3>
<div class="compare">${side(slide.left)}${side(slide.right)}</div></div>`
}

function renderTheory(lesson: LessonSource): string {
  const parts: string[] = []
  let section = ''
  let sectionHint = ''
  let pending: string[] = []

  const flush = () => {
    if (pending.length === 0) return
    parts.push(
      `<section><h2>${escape(section)}</h2>${sectionHint ? `<p class="hint">${escape(sectionHint)}</p>` : ''}${pending.join('')}</section>`,
    )
    pending = []
  }

  const slides = lesson.slides
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!
    switch (slide.type) {
      case 'section':
        flush()
        section = slide.title
        sectionHint = slide.hint ?? ''
        break
      case 'table': {
        const run = [slide]
        while (true) {
          const next = slides[i + 1]
          if (next?.type !== 'table' || next.title !== slide.title) break
          run.push(next)
          i++
        }
        pending.push(renderTable(lesson, slide.title, run))
        break
      }
      case 'rule':
        pending.push(renderRule(slide))
        break
      case 'conjugation':
        pending.push(renderConjugation(slide))
        break
      case 'compare':
        pending.push(renderCompare(slide))
        break
      default:
        break
    }
  }
  flush()
  return parts.join('')
}

interface Task {
  n: number
  slide: PracticeSlideSource
}

function practiceByGroup(lesson: LessonSource): { name: string; tasks: Task[] }[] {
  const practice = lesson.slides.filter((s): s is PracticeSlideSource => s.type === 'practice')
  let n = 0
  const numbered = practice.map((slide) => ({ n: ++n, slide }))
  return lesson.practiceGroups
    .map((group) => ({ name: group.name, tasks: numbered.filter((t) => t.slide.group === group.name) }))
    .filter((group) => group.tasks.length > 0)
}

const task = (t: Task): string =>
  `<td class="num">${t.n}</td><td>${marked(t.slide.phrase.ru)}${t.slide.phrase.hint ? ` <span class="task-hint">(${escape(t.slide.phrase.hint)})</span>` : ''}</td>`

function renderPractice(lesson: LessonSource, answers: boolean): string {
  const groups = practiceByGroup(lesson)
  if (groups.length === 0) return ''
  const body = groups
    .map((group) => {
      const rows = group.tasks
        .map((t) => {
          if (!answers) return `<tr class="task">${task(t)}<td class="blank"></td></tr>`
          const alternatives = (t.slide.phrase.alternatives ?? []).map(marked).join('; ')
          return `<tr>${task(t)}<td class="es">${marked(t.slide.phrase.es)}${alternatives ? `<br><span class="alt">или ${alternatives}</span>` : ''}</td></tr>`
        })
      return `<h3>${escape(group.name)}</h3>
<table class="practice"><colgroup><col class="c-num"><col class="c-ru"><col></colgroup>
<thead><tr><th>№</th><th>По-русски</th><th>По-испански</th></tr></thead>${tbody(rows)}</table>`
    })
    .join('')
  return answers
    ? `<section class="answers"><h2>Ответы к практике</h2>${body}</section>`
    : `<section><h2>Практика</h2><p class="hint">Переведите на испанский письменно, потом сверьтесь с ответами в конце.</p>${body}</section>`
}

function renderDialogues(lesson: LessonSource): string {
  const runs = dialogueRuns(lesson.slides)
  if (runs.length === 0) return ''
  const body = runs
    .map((run) => {
      const lines = run.slides
        .flatMap((slide) => slide.lines)
        .map(
          (line) =>
            `<tr><td class="speaker">${escape(lesson.speakers[line.speaker] ?? line.speaker)}:</td><td><span class="es">${marked(line.es)}</span><br><span class="ru">${marked(line.ru)}</span></td></tr>`,
        )
      return `<div><h3>${escape(run.title)}</h3><table class="dialogue">${tbody(lines)}</table></div>`
    })
    .join('')
  return `<section><h2>Диалоги</h2>${body}</section>`
}

/** «¿Cómo te llamas?» и «¿cómo te llamas?» — одно и то же. */
const wordKey = (text: string): string =>
  plainText(text)
    .toLowerCase()
    .replace(/[¿?¡!.,…]/g, '')
    .trim()

/** Все фразы урока с транскрипцией; таблицы первыми — это новые слова. */
function phrasesWithIpa(lesson: LessonSource): { es: string; ipa: string }[] {
  const tables: { es: string; ipa?: string }[] = []
  const rest: { es: string; ipa?: string }[] = []
  for (const slide of lesson.slides) {
    if (slide.type === 'table') tables.push(...slide.rows)
    if (slide.type === 'rule') rest.push(...slide.examples)
    if (slide.type === 'practice') rest.push(slide.phrase)
    if (slide.type === 'compare') rest.push(...slide.left.items, ...slide.right.items)
    if (slide.type === 'conjugation') {
      rest.push(...slide.rows.map((row) => ({ es: row.stem + row.ending, ipa: row.ipa })))
    }
  }
  return [...tables, ...rest].filter((p): p is { es: string; ipa: string } => Boolean(p.ipa))
}

/**
 * Транскрипция слова словаря из фраз с `ipa`: сначала фраза целиком
 * («¿Cómo te llamas?»), иначе по словам — «el / la estudiante» и «la carta»
 * собираются из отдельных слов. Слово фразы сопоставляется слову `ipa`,
 * только если их число совпадает: «Quiero beber.» ↔ «ˈkjeɾo beˈbeɾ».
 * Сначала ищется в самом уроке, потом в остальных (артикли, частые слова).
 */
function vocabularyIpa(lessons: LessonSource[]): (es: string) => string | undefined {
  const phrases = new Map<string, string>()
  const words = new Map<string, string>()
  for (const phrase of lessons.flatMap(phrasesWithIpa)) {
    const key = wordKey(phrase.es)
    if (!phrases.has(key)) phrases.set(key, phrase.ipa)
    const esWords = key.split(/\s+/)
    const ipaWords = phrase.ipa.replaceAll('·', ' ').split(/\s+/).filter(Boolean)
    if (esWords.length !== ipaWords.length) continue
    esWords.forEach((word, i) => {
      if (!words.has(word)) words.set(word, ipaWords[i]!)
    })
  }
  return (es) => {
    const key = wordKey(es)
    const whole = phrases.get(key)
    if (whole) return whole
    // «el / la estudiante», «el programador, la programadora»: разделители как есть
    const parts = es
      .toLowerCase()
      .split(/(\s*[/,]\s*|\s+)/)
      .filter(Boolean)
      .map((part) => (/^\s*[/,]?\s*$/.test(part) ? part : words.get(wordKey(part))))
    return parts.every((part) => part !== undefined) ? parts.join('') : undefined
  }
}

function renderVocabulary(lesson: LessonSource, all: LessonSource[]): string {
  const vocabulary = lesson.newVocabulary ?? []
  if (vocabulary.length === 0) return ''
  const lookup = vocabularyIpa([lesson, ...all.filter((other) => other !== lesson)])
  const rows = vocabulary.map((entry) => {
    const value = entry.ipa ?? lookup(entry.es)
    if (!value) console.warn(`⚠ нет произношения: «${entry.es}» — добавьте ipa в newVocabulary`)
    return `<tr><td class="es">${escape(entry.es)}</td><td>${ipa(value)}</td><td>${escape(entry.ru)}</td></tr>`
  })
  return `<section><h2>Новые слова</h2>
<table class="words vocabulary"><colgroup><col class="c-es"><col class="c-ipa"><col></colgroup>
<thead><tr><th>${escape(lesson.tableHeaders.es)}</th><th>Произношение</th><th>${escape(lesson.tableHeaders.ru)}</th></tr></thead>
${tbody(rows)}</table></section>`
}

function renderSummary(lesson: LessonSource): string {
  const final = lesson.slides.find((s) => s.type === 'final')
  if (!final || final.bullets.length === 0) return ''
  const bullets = final.bullets.map((b) => `<li>${escape(b)}</li>`).join('')
  return `<section class="block"><h2>${escape(final.title)}</h2><ul class="summary">${bullets}</ul>
<p class="next"><b>${escape(final.nextTitle)}:</b> ${escape(final.nextText)}</p></section>`
}

const STYLE = `
@page { size: A4; margin: 15mm 15mm 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif; font-size: 10.5pt; line-height: 1.4; color: #1a1a1a; margin: 0; }
header { border-bottom: 2px solid #b8452e; padding-bottom: 4mm; margin-bottom: 6mm; }
header .course { color: #777; font-size: 9pt; text-transform: uppercase; letter-spacing: .08em; }
header h1 { font-size: 20pt; margin: 1mm 0; }
header .meta { color: #555; }
h2, h3, p.hint { break-after: avoid; }
h2 { font-size: 14pt; color: #b8452e; margin: 7mm 0 2mm; }
h3 { font-size: 11pt; margin: 4mm 0 1.5mm; }
p.hint { color: #555; font-style: italic; margin: 0 0 2mm; }
.block { break-inside: avoid; }
.es { font-weight: 600; }
strong { color: #b8452e; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
.ipa { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.5pt; color: #777; white-space: nowrap; }
.ru { color: #444; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr, tbody.keep { break-inside: avoid; }
th { text-align: left; font-size: 8.5pt; font-weight: 600; color: #777; border-bottom: 1px solid #999; padding: 1mm 2mm; }
td { padding: 1.3mm 2mm; border-bottom: 1px solid #ddd; vertical-align: top; }
col.c-es { width: 38%; } col.c-ipa { width: 27%; }
td.pronoun { color: #555; width: 30%; }
.pattern { margin: 1mm 0 2mm; }
.pattern span { display: inline-block; padding: .6mm 2.5mm; border-radius: 1.5mm; margin-right: 1.5mm; }
.pattern .chip { background: #f3dcd5; font-weight: 600; }
.pattern .slot { border: 1px dashed #999; color: #555; }
.pattern .plus { padding: 0 .5mm; color: #777; }
.rule p.text { margin: 0 0 1.5mm; }
.examples { margin: 0; padding-left: 5mm; }
.examples li { margin-bottom: 1mm; }
.compare { display: flex; gap: 4mm; }
.compare .side { flex: 1; border: 1px solid #ddd; border-radius: 2mm; padding: 2mm 3mm; }
.compare .label { font-weight: 600; color: #555; margin-bottom: 1mm; }
.compare ul { margin: 0; padding-left: 4mm; }
.compare .wrong .label { color: #b3261e; }
.compare .wrong .es { text-decoration: line-through; color: #777; }
.compare .right .label { color: #2e7d32; }
col.c-num { width: 8mm; } col.c-ru { width: 45%; }
td.num { color: #777; text-align: right; }
.practice tr.task td { height: 11mm; }
.practice td.blank { border-left: 1px solid #ddd; }
.task-hint { color: #777; font-style: italic; }
.alt { color: #555; font-weight: 400; }
.dialogue td.speaker { width: 22mm; font-weight: 600; color: #555; }
.summary { margin: 0; padding-left: 5mm; }
.next { color: #555; }
.answers { break-before: page; }
.answers h2 { margin-top: 0; }
`

function renderHandout(lesson: LessonSource, all: LessonSource[]): string {
  const grammar = lesson.newGrammar ?? []
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Урок ${lesson.number}. ${escape(lesson.title)}</title><style>${STYLE}</style></head><body>
<header><div class="course">${escape(lesson.course)}</div>
<h1>Урок ${lesson.number}. ${escape(lesson.title)}</h1>
<div class="meta">Уровень ${lesson.level}, урок ${lesson.planLesson}${grammar.length > 0 ? ` · Грамматика: ${grammar.map(escape).join(', ')}` : ''}</div></header>
${renderTheory(lesson)}
${renderPractice(lesson, false)}
${renderDialogues(lesson)}
${renderVocabulary(lesson, all)}
${renderSummary(lesson)}
${renderPractice(lesson, true)}
</body></html>`
}

// --- pdf ---------------------------------------------------------------------

const { lesson } = found
const name = `lesson-${String(lesson.number).padStart(2, '0')}`
const html = renderHandout(
  lesson,
  lessons.map((file) => file.lesson),
)
mkdirSync(OUT_DIR, { recursive: true })
if (withHtml) writeFileSync(join(OUT_DIR, `${name}.html`), html)

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  const out = join(OUT_DIR, `${name}.pdf`)
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#888;font-family:'Noto Sans','DejaVu Sans',sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>Урок ${lesson.number}. ${escape(lesson.title)} · <a href="https://t.me/${TELEGRAM}" style="color:#b8452e;text-decoration:none">@${TELEGRAM}</a></span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  })
  console.log(`✓ ${relative(ROOT, out)}`)
} finally {
  await browser.close()
}
