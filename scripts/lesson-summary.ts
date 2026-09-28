/**
 * Краткий конспект (выжимка) — одна страница A4 для Telegram:
 * `npm run lessons:summary -- [N] [--ipa] [--html]`.
 *
 * Без номера — все уроки. Содержимое берётся из блока `summary` урока;
 * урок без него пропускается с предупреждением. Шапка → ключевые фразы →
 * правило → типичная ошибка → мини-практика с ответами → призыв к полной
 * версии. Выжимка длиннее страницы — ошибка сборки.
 *
 * `--ipa` добавляет транскрипцию к ключевым фразам. Результат —
 * handouts/free/lesson-NN-summary.pdf.
 */
import { relative } from 'node:path'
import { chromium } from 'playwright'
import type { LessonSource, SummarySource } from '../src/features/lessons/source.ts'
import {
  escape,
  handoutPath,
  htmlPage,
  ipa,
  isFree,
  marked,
  printPdf,
  renderCompare,
  renderHeader,
} from './handout-common.ts'
import { HANDOUTS, telegramUrl } from './handouts.config.ts'
import { loadLessons, ROOT } from './lessons.ts'

const args = process.argv.slice(2)
const withIpa = args.includes('--ipa')
const withHtml = args.includes('--html')
const arg = args.find((a) => !a.startsWith('--'))
const target = arg === undefined ? undefined : Number(arg)
if (target !== undefined && (!Number.isInteger(target) || target <= 0)) {
  console.error('Использование: npm run lessons:summary -- [номер урока] [--ipa] [--html]')
  process.exit(1)
}

// --- html --------------------------------------------------------------------

function renderPhrases(summary: SummarySource): string {
  const rows = summary.phrases
    .map(
      (p) =>
        `<tr><td class="es">${marked(p.es)}</td>${withIpa ? `<td>${ipa(p.ipa)}</td>` : ''}<td>${marked(p.ru)}</td></tr>`,
    )
    .join('')
  const cols = withIpa ? '<col class="c-es"><col class="c-ipa"><col>' : '<col class="c-es"><col>'
  return `<section><h2>Ключевые фразы</h2>
<table class="words"><colgroup>${cols}</colgroup><tbody>${rows}</tbody></table></section>`
}

function renderMistake(summary: SummarySource): string {
  const { wrong, right } = summary.mistake
  return `<section><h2>Типичная ошибка</h2>${renderCompare(
    '',
    { label: wrong.label ?? 'так не говорят', tone: 'wrong', items: [wrong] },
    { label: right.label ?? 'так говорят', tone: 'right', items: [right] },
  )}</section>`
}

function renderPractice(summary: SummarySource): string {
  const rows = summary.practice
    .map(
      (p, i) =>
        `<tr class="task"><td class="num">${i + 1}</td><td>${marked(p.ru)}${p.hint ? ` <span class="task-hint">(${escape(p.hint)})</span>` : ''}</td><td class="blank"></td></tr>`,
    )
    .join('')
  const answers = summary.practice
    .map((p, i) => {
      const alternatives = (p.alternatives ?? []).map(marked).join('; ')
      return `<span>${i + 1}. ${marked(p.es)}${alternatives ? ` <span class="alt">(или ${alternatives})</span>` : ''}</span>`
    })
    .join(' ')
  return `<section class="block"><h2>Мини-практика</h2>
<p class="hint">Переведите на испанский.</p>
<table class="practice"><colgroup><col class="c-num"><col class="c-ru"><col></colgroup><tbody>${rows}</tbody></table>
<p class="answers"><b>Ответы:</b> ${answers}</p></section>`
}

function renderCta(lesson: LessonSource): string {
  const text = isFree(lesson, 'full')
    ? `Полный конспект с практикой и ответами — бесплатно в Telegram <a href="${telegramUrl}">@${HANDOUTS.telegram}</a>`
    : `Полный конспект: вся практика, диалог и ответы — на Boosty: <a href="${HANDOUTS.boosty}">${HANDOUTS.boosty.replace(/^https?:\/\//, '')}</a>`
  return `<div class="cta">${text}</div>`
}

/** Своё для выжимки; общее — BASE_STYLE в handout-common.ts. */
const STYLE = `
.page { min-height: 250mm; display: flex; flex-direction: column; }
header { margin-bottom: 3mm; }
h2 { margin: 4mm 0 1.5mm; }
col.c-es { width: 40%; } col.c-ipa { width: 25%; }
col.c-ru { width: 50%; }
.rule { margin: 0; padding: 2.5mm 3.5mm; background: #faf0ec; border-left: 3px solid #b8452e; border-radius: 1mm; }
.compare .side { padding: 1.5mm 3mm; }
.practice tr.task td { height: 9mm; }
p.answers { font-size: 8pt; color: #666; margin: 2mm 0 0; }
p.answers span { margin-right: 3mm; }
.cta { margin-top: auto; break-inside: avoid; padding: 3mm 4mm; border: 1.5px solid #b8452e; border-radius: 2mm; text-align: center; font-weight: 600; }
.cta a { text-decoration: none; }
`

function renderSummaryPage(lesson: LessonSource, summary: SummarySource): string {
  return htmlPage(
    lesson,
    `${lesson.title} — краткий конспект`,
    STYLE,
    `<div class="page">
${renderHeader(lesson, 'Краткий конспект')}
${renderPhrases(summary)}
<section><h2>Главное правило</h2><p class="rule">${marked(summary.rule)}</p></section>
${renderMistake(summary)}
${renderPractice(summary)}
${renderCta(lesson)}
</div>`,
  )
}

// --- pdf ---------------------------------------------------------------------

const { lessons, errors } = loadLessons()
const selected =
  target === undefined ? lessons : lessons.filter(({ lesson }) => lesson.number === target)
if (selected.length === 0) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error(`\nУрок ${target} не найден или не прошёл проверку (npm run lessons:validate).`)
  process.exit(1)
}

const failures: string[] = []
const browser = await chromium.launch()
try {
  for (const { lesson } of selected) {
    if (!lesson.summary) {
      console.warn(`⚠ урок ${lesson.number}: нет блока summary, выжимка не собрана`)
      continue
    }
    const out = handoutPath(lesson, 'summary')
    const html = renderSummaryPage(lesson, lesson.summary)
    const pages = await printPdf(browser, lesson, html, out, { pageNumbers: false, html: withHtml })
    if (pages === 1) console.log(`✓ ${relative(ROOT, out)}`)
    else failures.push(`урок ${lesson.number}: выжимка заняла ${pages} стр., нужна 1 — сократите summary`)
  }
} finally {
  await browser.close()
}

// Сломанные уроки важны, только когда собираются все
const broken = target === undefined ? errors : []
for (const error of [...broken, ...failures]) console.error(`✗ ${error}`)
if (broken.length > 0 || failures.length > 0) process.exit(1)
