/**
 * Общее для PDF-конспектов: полного (lesson-pdf.ts) и краткого
 * (lesson-summary.ts). Разметка, стиль, шапка, раскладка free/paid, печать.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Browser } from 'playwright'
import type { CompareSideSource, LessonSource } from '../src/features/lessons/source.ts'
import { splitMarks } from '../src/features/slides/markup.ts'
import { HANDOUTS, telegramUrl } from './handouts.config.ts'
import { ROOT } from './lessons.ts'

export const HANDOUTS_DIR = join(ROOT, 'handouts')

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

/** Шапка первой страницы: курс, «Урок N. Тема», строка под заголовком. */
export const renderHeader = (lesson: LessonSource, meta: string): string =>
  `<header><div class="course">${escape(lesson.course)}</div>
<h1>Урок ${lesson.number}. ${escape(lesson.title)}</h1>
<div class="meta">${meta}</div></header>`

/** Стиль, общий для обоих конспектов; каждый дописывает своё. */
export const BASE_STYLE = `
@page { size: A4; margin: 15mm 15mm 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif; font-size: 10.5pt; line-height: 1.4; color: #1a1a1a; margin: 0; }
a { color: #b8452e; }
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
.compare { display: flex; gap: 4mm; }
.compare .side { flex: 1; border: 1px solid #ddd; border-radius: 2mm; padding: 2mm 3mm; }
.compare .label { font-weight: 600; color: #555; margin-bottom: 1mm; }
.compare ul { margin: 0; padding-left: 4mm; }
.compare .wrong .label { color: #b3261e; }
.compare .wrong .es { text-decoration: line-through; color: #777; }
.compare .right .label { color: #2e7d32; }
col.c-num { width: 8mm; }
td.num { color: #777; text-align: right; }
.practice tr.task td { height: 11mm; }
.practice td.blank { border-left: 1px solid #ddd; }
.task-hint { color: #777; font-style: italic; }
.alt { color: #555; font-weight: 400; }
`

export const htmlPage = (lesson: LessonSource, title: string, style: string, body: string): string =>
  `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Урок ${lesson.number}. ${escape(title)}</title><style>${BASE_STYLE}${style}</style></head><body>
${body}
</body></html>`

// --- файлы -------------------------------------------------------------------

export type HandoutKind = 'full' | 'summary'

/** Полный конспект урока бесплатный? Выжимки бесплатны всегда. */
export const isFree = (lesson: LessonSource, kind: HandoutKind): boolean =>
  kind === 'summary' || lesson.number <= HANDOUTS.freeFullUntil

/** handouts/free/lesson-01.pdf, handouts/free/lesson-01-summary.pdf, handouts/paid/lesson-15.pdf. */
export function handoutPath(lesson: LessonSource, kind: HandoutKind): string {
  const name = `lesson-${String(lesson.number).padStart(2, '0')}${kind === 'summary' ? '-summary' : ''}`
  return join(HANDOUTS_DIR, isFree(lesson, kind) ? 'free' : 'paid', `${name}.pdf`)
}

// --- pdf ---------------------------------------------------------------------

interface PrintOptions {
  /** «3 / 8» в подвале; одностраничной выжимке не нужно. */
  pageNumbers: boolean
  /** Рядом с PDF положить .html — отладка вёрстки. */
  html: boolean
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
      footerTemplate: `<div style="width:100%;font-size:8px;color:#888;font-family:'Noto Sans','DejaVu Sans',sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>Урок ${lesson.number}. ${escape(lesson.title)} · <a href="${telegramUrl}" style="color:#b8452e;text-decoration:none">@${HANDOUTS.telegram}</a></span>${options.pageNumbers ? '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>' : ''}</div>`,
    })
    return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g)?.length ?? 0
  } finally {
    await page.close()
  }
}
