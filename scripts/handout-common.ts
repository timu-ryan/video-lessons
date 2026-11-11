/**
 * Общее для PDF-конспектов: полного (lesson-pdf.ts), краткого
 * (lesson-summary.ts) и допматериалов (lesson-extra.ts). Разметка, стиль,
 * палитра, шапка, раскладка free/paid, печать.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Browser } from 'playwright'
import type { CompareSideSource, LessonSource } from '../src/features/lessons/source.ts'
import {
  cssVars,
  isThemeName,
  type PrintPalette,
  THEME_NAMES,
  THEMES,
} from '../src/features/settings/palettes.ts'
import { splitMarks } from '../src/features/slides/markup.ts'
import { HANDOUTS, telegramUrl } from './handouts.config.ts'
import { ROOT } from './lessons.ts'

export const HANDOUTS_DIR = join(ROOT, 'handouts')

// --- палитра -----------------------------------------------------------------

/**
 * Палитра конспекта: `--theme=имя` в командной строке, иначе
 * HANDOUTS.theme. Палитры общие со слайдами — src/features/settings/palettes.ts,
 * в стилях конспекта только переменные.
 */
export function handoutPalette(args: string[]): PrintPalette {
  const flag = args.find((a) => a.startsWith('--theme='))
  const name = flag ? flag.slice('--theme='.length) : HANDOUTS.theme
  const palette = isThemeName(name) ? THEMES[name].print : undefined
  if (!palette) {
    const printable = THEME_NAMES.filter((theme) => THEMES[theme].print)
    console.error(`Нет палитры «${name}» для печати. Есть: ${printable.join(', ')}`)
    process.exit(1)
  }
  return palette
}

// --- html --------------------------------------------------------------------

export const escape = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** `**…**` → `<strong>`. */
export const marked = (text: string): string =>
  splitMarks(text)
    .map((part) => (part.marked ? `<strong>${escape(part.text)}</strong>` : escape(part.text)))
    .join('')

export const ipa = (value: string | undefined): string =>
  value ? `<span class="ipa">[${escape(value)}]</span>` : ''

/** Сколько строк таблицы не отрывать друг от друга в начале и в конце. */
const KEEP_ROWS = 2

/**
 * Тело таблицы: первые и последние KEEP_ROWS строк — в отдельных `tbody`,
 * которые не рвутся. На новую страницу не уходит одна последняя строка,
 * а под заголовком не остаётся одна первая.
 */
export function tbody(rows: string[]): string {
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

/** Сравнение в две колонки: ✗ и зачёркивание у `wrong`, ✓ у `right`. */
export function renderCompare(title: string, left: CompareSideSource, right: CompareSideSource): string {
  const side = (s: CompareSideSource): string => {
    const mark = s.tone === 'wrong' ? '✗ ' : s.tone === 'right' ? '✓ ' : ''
    const items = s.items
      .map(
        (item) =>
          `<li><span class="es">${marked(item.es)}</span>${item.ru ? `<br><span class="ru">${marked(item.ru)}</span>` : ''}</li>`,
      )
      .join('')
    return `<div class="side ${s.tone ?? ''}"><div class="label">${mark}${escape(s.label)}</div><ul>${items}</ul></div>`
  }
  return `<div class="block">${title ? `<h3>${escape(title)}</h3>` : ''}
<div class="compare">${side(left)}${side(right)}</div></div>`
}

/** «Урок 5» или «Практика 1»: у практики своя нумерация. */
export const lessonLabel = (lesson: LessonSource): string =>
  `${lesson.kind === 'practice' ? 'Практика' : 'Урок'} ${lesson.number}`

/** Шапка первой страницы: курс, «Урок N. Тема», строка под заголовком. */
export const renderHeader = (lesson: LessonSource, meta: string): string =>
  `<header><div class="course">${escape(lesson.course)}</div>
<h1>${lessonLabel(lesson)}. ${escape(lesson.title)}</h1>
<div class="meta">${meta}</div></header>`

/** Стиль, общий для обоих конспектов; каждый дописывает своё. Цвета — из палитры. */
export const BASE_STYLE = `
@page { size: A4; margin: 15mm 15mm 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif; font-size: 10.5pt; line-height: 1.4; color: var(--text); margin: 0; }
a { color: var(--accent); }
header { border-bottom: 2px solid var(--bar); padding-bottom: 4mm; margin-bottom: 6mm; }
header .course { color: var(--text-3); font-size: 9pt; text-transform: uppercase; letter-spacing: .08em; }
header h1 { font-size: 20pt; margin: 1mm 0; }
header .meta { color: var(--text-2); }
h2, h3, p.hint { break-after: avoid; }
h2 { font-size: 14pt; color: var(--heading); margin: 7mm 0 2mm; }
h3 { font-size: 11pt; margin: 4mm 0 1.5mm; }
p.hint { color: var(--text-2); font-style: italic; margin: 0 0 2mm; }
.block { break-inside: avoid; }
.es { font-weight: 600; color: var(--es); }
strong { color: var(--mark); background: var(--mark-bg); border-radius: .5mm; text-decoration: underline; text-decoration-color: var(--mark-line); text-decoration-thickness: 1px; text-underline-offset: 2px; }
.ipa { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.5pt; color: var(--text-3); white-space: nowrap; }
.ru { color: var(--ru); }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr, tbody.keep { break-inside: avoid; }
th { text-align: left; font-size: 8.5pt; font-weight: 600; color: var(--text-3); border-bottom: 1px solid var(--rule-strong); padding: 1mm 2mm; }
td { padding: 1.3mm 2mm; border-bottom: 1px solid var(--rule); vertical-align: top; }
.compare { display: flex; gap: 4mm; }
.compare .side { flex: 1; border: 1px solid var(--rule); border-radius: 2mm; padding: 2mm 3mm; }
.compare .label { font-weight: 600; color: var(--text-2); margin-bottom: 1mm; }
.compare ul { margin: 0; padding-left: 4mm; }
.compare .wrong .label { color: var(--bad); }
.compare .wrong .es { text-decoration: line-through; color: var(--text-3); }
.compare .wrong strong { background: var(--mark-bg-bad); }
.compare .right .label { color: var(--ok); }
.compare .right strong { background: var(--mark-bg-ok); }
col.c-num { width: 8mm; }
td.num { color: var(--text-3); text-align: right; }
.practice tr.task td { height: 11mm; }
.practice td.blank { border-left: 1px solid var(--rule); }
.task-hint { color: var(--text-3); font-style: italic; }
.alt { color: var(--text-2); font-weight: 400; }
`

export const htmlPage = (
  lesson: LessonSource,
  palette: PrintPalette,
  title: string,
  style: string,
  body: string,
): string =>
  `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>${lessonLabel(lesson)}. ${escape(title)}</title><style>:root { ${cssVars(palette)} }${BASE_STYLE}${style}</style></head><body>
${body}
</body></html>`

// --- файлы -------------------------------------------------------------------

export type HandoutKind = 'full' | 'summary' | 'extra'

/**
 * Материал урока бесплатный? Выжимки бесплатны всегда, допматериалы — по
 * freeExtras. Практика — как урок, после которого она стоит.
 */
export function isFree(lesson: LessonSource, kind: HandoutKind): boolean {
  if (kind === 'summary') return true
  if (kind === 'extra') return HANDOUTS.freeExtras
  return (lesson.afterLesson ?? lesson.number) <= HANDOUTS.freeFullUntil
}

const SUFFIX: Record<HandoutKind, string> = { full: '', summary: '-summary', extra: '-extra' }

/**
 * handouts/free/lesson-01.pdf, handouts/free/lesson-01-summary.pdf,
 * handouts/paid/lesson-15.pdf, handouts/paid/lesson-01-extra.pdf,
 * handouts/free/practice-01.pdf.
 */
export function handoutPath(lesson: LessonSource, kind: HandoutKind): string {
  const prefix = lesson.kind === 'practice' ? 'practice' : 'lesson'
  const name = `${prefix}-${String(lesson.number).padStart(2, '0')}${SUFFIX[kind]}`
  return join(HANDOUTS_DIR, isFree(lesson, kind) ? 'free' : 'paid', `${name}.pdf`)
}

// --- pdf ---------------------------------------------------------------------

interface PrintOptions {
  /** «3 / 8» в подвале; одностраничной выжимке не нужно. */
  pageNumbers: boolean
  /** Рядом с PDF положить .html — отладка вёрстки. */
  html: boolean
  /** Подвал печатается отдельно от страницы, переменные палитры до него не доходят. */
  palette: PrintPalette
}

/** Печатает HTML в PDF по пути `out`. Возвращает число страниц. */
export async function printPdf(
  browser: Browser,
  lesson: LessonSource,
  html: string,
  out: string,
  options: PrintOptions,
): Promise<number> {
  mkdirSync(dirname(out), { recursive: true })
  if (options.html) writeFileSync(out.replace(/\.pdf$/, '.html'), html)
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:${options.palette['text-3']};font-family:'Noto Sans','DejaVu Sans',sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>${lessonLabel(lesson)}. ${escape(lesson.title)} · <a href="${telegramUrl}" style="color:${options.palette.accent};text-decoration:none">@${HANDOUTS.telegram}</a></span>${options.pageNumbers ? '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>' : ''}</div>`,
    })
    return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g)?.length ?? 0
  } finally {
    await page.close()
  }
}
