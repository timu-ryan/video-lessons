/**
 * Дополнительные материалы урока — платный PDF для подписчиков:
 * `npm run lessons:extra -- N [--html]`.
 *
 * Источник — extras/lesson-NN.json (формат — раздел 14 справочника).
 * Порядок: шапка → живые выражения → практика (перевод, найдите ошибку,
 * вставьте слово, переведите на русский) → мини-история → фразы
 * с характером → Испания изнутри → ваш ход с образцом → ответы с новой
 * страницы.
 *
 * Предупреждает, если задание дословно повторяет фразу урока или его
 * выжимки, и если материалы заняли больше MAX_PAGES страниц. Результат —
 * handouts/paid/lesson-NN-extra.pdf (freeExtras в handouts.config.ts).
 */
import { relative } from 'node:path'
import { chromium } from 'playwright'
import type { LessonSource } from '../src/features/lessons/source.ts'
import {
  type CultureSource,
  type ExerciseSource,
  type ExtraSource,
  extraTexts,
  GAP,
  loadExtras,
} from './extras.ts'
import {
  escape,
  handoutPath,
  htmlPage,
  ipa,
  marked,
  printPdf,
  renderHeader,
  tbody,
} from './handout-common.ts'
import { loadLessons, ROOT, tokenize } from './lessons.ts'

/** Обычно 5: 3 страницы заданий, страница интересного, страница ответов. */
const MAX_PAGES = 5

/** Строк для записи в «Вашем ходе». */
const WRITING_LINES = 6

const args = process.argv.slice(2)
const withHtml = args.includes('--html')
const arg = args.find((a) => !a.startsWith('--'))
const target = Number(arg)
if (!arg || !Number.isInteger(target) || target <= 0) {
  console.error('Использование: npm run lessons:extra -- <номер урока> [--html]')
  process.exit(1)
}

const { lessons, errors: lessonErrors } = loadLessons()
const lesson = lessons.find((file) => file.lesson.number === target)?.lesson
if (!lesson) {
  for (const error of lessonErrors) console.error(`✗ ${error}`)
  console.error(`\nУрок ${target} не найден или не прошёл проверку (npm run lessons:validate).`)
  process.exit(1)
}

const name = `extras/lesson-${String(target).padStart(2, '0')}.json`
const { extras, errors } = loadExtras([lesson])
const extra = extras.find((file) => file.lesson === lesson)?.extra
if (!extra) {
  const own = errors.filter((error) => error.startsWith(name))
  for (const error of own) console.error(`✗ ${error}`)
  console.error(own.length > 0 ? '\nИсправьте допматериалы.' : `Нет файла ${name} — составьте его: /extra ${target}`)
  process.exit(1)
}

// --- html --------------------------------------------------------------------

function renderExpressions(extra: ExtraSource): string {
  const cards = extra.expressions
    .map(
      (e) => `<div class="expr">
<div class="head"><span class="es">${marked(e.es)}</span> ${ipa(e.ipa)}</div>
<div class="ru">${marked(e.ru)}</div>
${e.note ? `<p class="note">${escape(e.note)}</p>` : ''}
${e.example ? `<p class="example"><span class="es">${marked(e.example.es)}</span><br><span class="ru">${marked(e.example.ru)}</span></p>` : ''}
</div>`,
    )
    .join('')
  return `<section><h2>Живые выражения</h2>
<p class="hint">Бонус: этих выражений нет в уроке. Учить не обязательно — но с ними вы звучите как испанцы.</p>
<div class="expressions">${cards}</div></section>`
}

/** Задание с номером: что видит ученик до ответа. */
function taskRows(block: ExerciseSource, first: number): string[] {
  const num = (i: number) => `<td class="num">${first + i}</td>`
  switch (block.type) {
    case 'translate':
      return block.tasks.map(
        (t, i) =>
          `<tr class="task">${num(i)}<td>${marked(t.ru)}${t.hint ? ` <span class="task-hint">(${escape(t.hint)})</span>` : ''}</td><td class="blank"></td></tr>`,
      )
    case 'fix':
      return block.tasks.map(
        (t, i) => `<tr class="task">${num(i)}<td class="es">${marked(t.wrong)}</td><td class="blank"></td></tr>`,
      )
    case 'gap':
      return block.tasks.map((t, i) => {
        const [before = '', after = ''] = t.es.split(GAP)
        return `<tr class="task">${num(i)}<td><span class="es">${marked(before)}<span class="gap"></span>${marked(after)}</span>${t.ru ? ` <span class="task-hint">(${marked(t.ru)})</span>` : ''}</td></tr>`
      })
    case 'read':
      return block.tasks.map(
        (t, i) => `<tr class="task">${num(i)}<td class="es">${marked(t.es)}</td><td class="blank"></td></tr>`,
      )
  }
}

/** Ответы к блоку: верные фразы по порядку заданий. */
function answers(block: ExerciseSource): string[] {
  switch (block.type) {
    case 'translate':
      return block.tasks.map((t) => {
        const alternatives = (t.alternatives ?? []).map(marked).join('; ')
        return `<span class="es">${marked(t.es)}</span>${alternatives ? ` <span class="alt">или ${alternatives}</span>` : ''}`
      })
    case 'fix':
      return block.tasks.map(
        (t) => `<span class="es">${marked(t.es)}</span>${t.why ? ` <span class="why">${escape(t.why)}</span>` : ''}`,
      )
    case 'gap':
      return block.tasks.map((t) => `<span class="es">${marked(t.es.replace(GAP, `**${t.answer}**`))}</span>`)
    case 'read':
      return block.tasks.map((t) => marked(t.ru))
  }
}

/** Ответы мелко, в две колонки: номер задания — номер пункта. */
const answerList = (items: string[], first = 1): string =>
  `<ol class="answer-list" start="${first}">${items.map((item) => `<li>${item}</li>`).join('')}</ol>`

/** Блоки упражнений со сквозной нумерацией: [блок, номер первого задания]. */
function numbered(extra: ExtraSource): [ExerciseSource, number][] {
  let n = 1
  return extra.exercises.map((block) => {
    const first = n
    n += block.tasks.length
    return [block, first]
  })
}

function renderPractice(extra: ExtraSource): string {
  const blocks = numbered(extra)
    .map(([block, first]) => {
      const options =
        block.type === 'gap'
          ? `<p class="options">${block.options.map((o) => `<span class="chip">${escape(o)}</span>`).join('')}</p>`
          : ''
      // У gap пишут прямо в пропуске — пустая колонка не нужна
      const cols = block.type === 'gap' ? '<col class="c-num"><col>' : '<col class="c-num"><col class="c-task"><col>'
      return `<h3>${escape(block.title)}</h3>${options}
<table class="practice"><colgroup>${cols}</colgroup>${tbody(taskRows(block, first))}</table>`
    })
    .join('')
  return `<section><h2>Практика</h2>
<p class="hint">Сначала сами, письменно, потом сверьтесь с ответами в конце.</p>${blocks}</section>`
}

const isDialogue = (extra: ExtraSource): boolean => extra.story.lines.some((line) => line.speaker)

function renderStory(extra: ExtraSource): string {
  const { story } = extra
  const text = isDialogue(extra)
    ? `<table class="dialogue">${tbody(
        story.lines.map(
          (line) =>
            `<tr><td class="speaker">${line.speaker ? `${escape(line.speaker)}:` : ''}</td><td class="es">${marked(line.es)}</td></tr>`,
        ),
      )}</table>`
    : `<p class="story-text es">${story.lines.map((line) => marked(line.es)).join(' ')}</p>`
  const glossary = story.glossary
    ? `<p class="glossary">Новые слова: ${story.glossary.map((g) => `<span class="es">${marked(g.es)}</span> — ${marked(g.ru)}`).join('; ')}</p>`
    : ''
  const questions = story.questions.map(
    (q, i) => `<tr class="task"><td class="num">${i + 1}</td><td>${marked(q.question)}</td><td class="blank"></td></tr>`,
  )
  return `<section><h2>Мини-история</h2><div class="block"><h3>${escape(story.title)}</h3>${text}${glossary}</div>
<h3>Вопросы</h3>
<table class="practice"><colgroup><col class="c-num"><col class="c-task"><col></colgroup>${tbody(questions)}</table></section>`
}

function renderPhrases(extra: ExtraSource): string {
  const rows = extra.phrases.map(
    (p) => `<tr><td><span class="es">${marked(p.es)}</span>${p.ipa ? `<br>${ipa(p.ipa)}` : ''}</td><td>${marked(p.ru)}</td></tr>`,
  )
  return `<section><h2>Фразы с характером</h2>
<p class="hint">Скажите вслух — с выражением!</p>
<table class="words phrases"><colgroup><col class="c-phrase"><col></colgroup>${tbody(rows)}</table></section>`
}

const CULTURE_LABELS: Record<CultureSource['kind'], string> = {
  refrán: 'Пословица',
  trabalenguas: 'Скороговорка',
  fact: 'Факт',
  song: 'Песня',
}

function renderCulture(extra: ExtraSource): string {
  const c = extra.culture
  const quote = c.es
    ? `<p class="quote"><span class="es">${marked(c.es)}</span> ${ipa(c.ipa)}</p>${c.ru ? `<p class="ru">${marked(c.ru)}</p>` : ''}`
    : ''
  return `<section><h2>Испания изнутри</h2>
<div class="culture block"><div class="kind">${CULTURE_LABELS[c.kind]}</div><h3>${escape(c.title)}</h3>
${quote}<p class="text">${marked(c.text)}</p></div></section>`
}

function renderYourTurn(extra: ExtraSource): string {
  const { yourTurn } = extra
  const template = yourTurn.template
    ? `<p class="options">${yourTurn.template.map((t) => `<span class="chip">${escape(t)}</span>`).join('')}</p>`
    : ''
  const lines = '<div></div>'.repeat(WRITING_LINES)
  // Задание открытое: образец — подсказка, а не ответ, поэтому здесь же
  const model = yourTurn.model
    .map((p) => `<li><span class="es">${marked(p.es)}</span> — <span class="ru">${marked(p.ru)}</span></li>`)
    .join('')
  return `<section><div class="block"><h2>Ваш ход</h2>
<p>${escape(yourTurn.task)}</p>${template}<div class="lines">${lines}</div></div>
<div class="block model"><h3>Образец — загляните, когда напишете своё</h3><ul>${model}</ul></div></section>`
}

function renderAnswers(extra: ExtraSource): string {
  const practice = numbered(extra)
    .map(([block, first]) => `<h3>${escape(block.title)}</h3>${answerList(answers(block), first)}`)
    .join('')

  const { story } = extra
  const translation = isDialogue(extra)
    ? `<table class="dialogue">${tbody(
        story.lines.map(
          (line) =>
            `<tr><td class="speaker">${line.speaker ? `${escape(line.speaker)}:` : ''}</td><td class="ru">${marked(line.ru)}</td></tr>`,
        ),
      )}</table>`
    : `<p class="story-text ru">${story.lines.map((line) => marked(line.ru)).join(' ')}</p>`

  return `<section class="answers"><h2>Ответы</h2>${practice}
<h3>Мини-история: перевод</h3>${translation}
<h3>Мини-история: вопросы</h3>${answerList(story.questions.map((q) => `<span class="es">${marked(q.answer)}</span>`))}</section>`
}

/** Своё для допматериалов; общее — BASE_STYLE в handout-common.ts. */
const STYLE = `
col.c-task { width: 50%; } col.c-phrase { width: 58%; }
.practice tr.task td { height: 9mm; }
.phrases .ipa { white-space: normal; }
.expressions { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.expr { break-inside: avoid; border: 1px solid #ddd; border-left: 3px solid #b8452e; border-radius: 1.5mm; padding: 2mm 3mm; }
.expr .head .es { font-size: 12pt; }
.expr p { margin: 1mm 0 0; font-size: 9.5pt; }
.expr .note { color: #555; }
.options { margin: 0 0 1.5mm; break-after: avoid; }
.chip { display: inline-block; padding: .6mm 2.5mm; border-radius: 1.5mm; background: #f3dcd5; font-weight: 600; margin-right: 1.5mm; }
.gap { display: inline-block; width: 22mm; border-bottom: 1px solid #555; margin: 0 1mm; }
.story-text { margin: 0 0 2mm; line-height: 1.6; font-weight: 400; }
.dialogue td.speaker { width: 22mm; font-weight: 600; color: #555; }
.glossary { font-size: 9pt; color: #555; margin: 1mm 0 0; }
.culture { background: #faf0ec; border-left: 3px solid #b8452e; border-radius: 1.5mm; padding: 3mm 4mm; }
.culture .kind { color: #b8452e; font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }
.culture h3 { margin-top: 1mm; }
.culture p { margin: 0 0 1.5mm; }
.culture .quote .es { font-size: 13pt; }
.culture .text { margin: 0; }
.lines div { height: 9mm; border-bottom: 1px solid #ccc; }
.answers { break-before: page; }
.answers h2 { margin-top: 0; }
.answer-list { columns: 2; column-gap: 8mm; margin: 0; padding-left: 7mm; font-size: 9.5pt; }
.answer-list li { break-inside: avoid; margin-bottom: 1mm; }
.answers .story-text { font-size: 9.5pt; }
.answers .dialogue td { padding: .5mm 2mm; border-bottom: none; font-size: 9.5pt; }
.why { color: #666; font-size: 9pt; font-weight: 400; }
.model { font-size: 9.5pt; }
.model ul { margin: 0; padding-left: 5mm; }
`

function renderExtra(lesson: LessonSource, extra: ExtraSource): string {
  return htmlPage(
    lesson,
    `${lesson.title} — дополнительные материалы`,
    STYLE,
    `${renderHeader(lesson, 'Дополнительные материалы: практика, история и живые выражения')}
${renderExpressions(extra)}
${renderPractice(extra)}
${renderStory(extra)}
${renderPhrases(extra)}
${renderCulture(extra)}
${renderYourTurn(extra)}
${renderAnswers(extra)}`,
  )
}

// --- повторы фраз урока --------------------------------------------------------

const phraseKey = (es: string): string => tokenize(es).join(' ')

/** Ключи всех испанских фраз урока и выжимки. */
function lessonPhrases(lesson: LessonSource): Set<string> {
  const texts: string[] = []
  for (const slide of lesson.slides) {
    if (slide.type === 'table') texts.push(...slide.rows.map((row) => row.es))
    if (slide.type === 'rule') texts.push(...slide.examples.map((example) => example.es))
    if (slide.type === 'practice') texts.push(slide.phrase.es, ...(slide.phrase.alternatives ?? []))
    if (slide.type === 'dialogue') texts.push(...slide.lines.map((line) => line.es))
    if (slide.type === 'compare') {
      texts.push(...[...slide.left.items, ...slide.right.items].map((item) => item.es))
    }
  }
  if (lesson.summary) {
    texts.push(...lesson.summary.phrases.map((p) => p.es))
    texts.push(...lesson.summary.practice.flatMap((p) => [p.es, ...(p.alternatives ?? [])]))
  }
  return new Set(texts.map(phraseKey))
}

/** Задания и фразы, которые должны быть новыми; история и образец могут повторять урок. */
const MUST_BE_NEW = /^extra-(translate|fix|gap|read|phrase)-/

function repeats(lesson: LessonSource, extra: ExtraSource): string[] {
  const known = lessonPhrases(lesson)
  return extraTexts(extra)
    .filter(({ where }) => MUST_BE_NEW.test(where))
    .flatMap(({ where, texts }) =>
      texts.filter((es) => known.has(phraseKey(es))).map((es) => `${where} повторяет фразу урока: «${es}»`),
    )
}

// --- pdf ---------------------------------------------------------------------

const out = handoutPath(lesson, 'extra')
const browser = await chromium.launch()
try {
  const pages = await printPdf(browser, lesson, renderExtra(lesson, extra), out, {
    pageNumbers: true,
    html: withHtml,
  })
  const tasks = extra.exercises.map((block) => `${block.type} ${block.tasks.length}`).join(', ')
  console.log(`✓ ${relative(ROOT, out)} · стр. ${pages} · заданий: ${tasks}`)
  if (pages > MAX_PAGES) console.warn(`⚠ страниц ${pages}, больше ${MAX_PAGES} — сократите практику или историю`)
} finally {
  await browser.close()
}
for (const warning of repeats(lesson, extra)) console.warn(`⚠ ${warning}`)
