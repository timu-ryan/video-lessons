import { THEMES, type ScreenPalette, type ThemeName } from '../settings/palettes'
import { splitMarks, type MarkedPart } from '../slides/markup'
import { CARD_LABELS, type Card, type CardRow, type CoverStyle } from './draft'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
const MARGIN = 86
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2
const FOOTER_TOP = 1220
const FONT = 'Manrope, system-ui, sans-serif'

interface TextStyle {
  size: number
  weight: number
  color: string
  accent?: string
  leading?: number
}

type Word = MarkedPart[]
type TextRun = MarkedPart & { width: number; ascent: number; descent: number }
type Line = { runs: TextRun[]; gap: number }[]

function lineHeight(style: TextStyle): number {
  return Math.ceil(style.size * (style.leading ?? 1.26))
}

export async function loadCardFonts(cards: Card[]): Promise<void> {
  const content = cards.flatMap(({ title, detail, rows }) => [
    title, detail, ...rows.flatMap(({ text, note, label }) => [text, note, label]),
  ]).join(' ')
  const sample = `Испанский с нуля · Español con Tim ¿Ñ? ${content}`
  await Promise.all([600, 700, 800].map((weight) => document.fonts.load(`${weight} 48px Manrope`, sample)))
}

function wrapWords(text: string): Word[][] {
  const paragraphs: Word[][] = [[]]
  let paragraph = paragraphs[0]!
  let word: Word | undefined
  for (const part of splitMarks(text)) {
    for (const value of part.text.match(/\n|[^\S\n]+|\S+/gu) ?? []) {
      if (value === '\n') {
        paragraph = []
        paragraphs.push(paragraph)
        word = undefined
      } else if (value.trim() === '') {
        word = undefined
      } else {
        if (!word) {
          word = []
          paragraph.push(word)
        }
        word.push({ text: value, marked: part.marked })
      }
    }
  }
  return paragraphs
}

function number(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export function cardFilename(index: number): string {
  return `${number(index)}.png`
}

/** Предпросмотр и PNG проходят через один рисунок в полном разрешении. */
export function drawCard(
  canvas: HTMLCanvasElement,
  card: Card,
  stamp: string,
  index: number,
  count: number,
  theme: ThemeName,
  coverStyle: CoverStyle = 'filled',
): boolean {
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не смог открыть холст для карточек.')
  const ctx = context
  const palette = THEMES[theme].screen

  function color(key: keyof ScreenPalette): string {
    const value = palette[key]
    const reference = /^var\(--([\w-]+)\)$/u.exec(value)?.[1]
    return reference ? color(reference as keyof ScreenPalette) : value
  }

  const cover = card.kind === 'cover'
  const filledCover = cover && coverStyle === 'filled'
  const question = card.kind === 'question'
  const answer = card.kind === 'answer'
  const variations = card.kind === 'variations'
  const numbered = question || answer || variations
  const coverBackground = color('badge')
  const ink = filledCover ? color('on-badge') : color('text')
  const secondary = filledCover ? ink : color('text-2')
  const accent = filledCover ? ink : color('mark')
  const dot = color('bar')
  let horizontalOverflow = false

  function font(style: TextStyle, marked = false) {
    ctx.font = `${marked ? 800 : style.weight} ${style.size}px ${FONT}`
  }

  function line(text: string, x: number, y: number, style: TextStyle) {
    font(style)
    ctx.fillStyle = style.color
    ctx.textBaseline = 'top'
    ctx.fillText(text, x, y)
  }

  function centeredLine(text: string, x: number, centerY: number, style: TextStyle) {
    font(style)
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = style.color
    const bounds = ctx.measureText(text)
    const offsetX = ctx.textAlign === 'center' ? (bounds.actualBoundingBoxLeft - bounds.actualBoundingBoxRight) / 2 : 0
    ctx.fillText(text, x + offsetX, centerY + (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2)
  }

  function block(text: string, x: number, y: number, width: number, style: TextStyle, paint = true): number {
    if (text.trim() === '') return 0
    const lines: Line[] = []
    font(style)
    ctx.textBaseline = 'alphabetic'
    const space = ctx.measureText(' ').width
    for (const paragraph of wrapWords(text.trim())) {
      let current: Line = []
      let used = 0
      for (const word of paragraph) {
        const runs = word.map((part) => {
          font(style, part.marked)
          const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = ctx.measureText(part.text)
          return { ...part, width, ascent: actualBoundingBoxAscent, descent: actualBoundingBoxDescent }
        })
        const measured = runs.reduce((sum, run) => sum + run.width, 0)
        horizontalOverflow ||= measured > width
        if (current.length > 0 && used + space + measured > width) {
          lines.push(current)
          current = []
          used = 0
        }
        const gap = current.length === 0 ? 0 : space
        current.push({ runs, gap })
        used += gap + measured
      }
      lines.push(current)
    }

    const leading = lineHeight(style)
    if (paint) {
      lines.forEach((words, row) => {
        const runs = words.flatMap((word) => word.runs)
        const ascent = Math.max(0, ...runs.map((run) => run.ascent))
        const descent = Math.max(0, ...runs.map((run) => run.descent))
        // Один базовый уровень для всей строки, включая выделенные фрагменты.
        const baseline = y + row * leading + (leading + ascent - descent) / 2
        let left = x
        for (const { runs, gap } of words) {
          left += gap
          for (const run of runs) {
            font(style, run.marked)
            ctx.fillStyle = run.marked ? (style.accent ?? style.color) : style.color
            ctx.fillText(run.text, left, baseline)
            left += run.width
          }
        }
      })
    }
    return lines.length * leading
  }

  function rect(x: number, y: number, width: number, height: number, color: string, radius = 0) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, radius)
    ctx.fill()
  }

  const titleStyle: TextStyle = { size: cover ? 88 : 74, weight: 800, color: ink, accent, leading: 1.15 }
  const examples = card.kind === 'examples'
  const compact = ((question || answer) && card.rows.length >= 4) || (examples && card.rows.length >= 3)
  const rowPadding = (variations ? 12 : numbered ? 25 : 30) - (compact ? 5 : 0)
  const rowGap = variations ? 15 : compact ? 18 : 24
  const detailStyle: TextStyle = { size: cover ? 42 : examples ? 34 : 46, weight: 600, color: secondary, accent, leading: 1.32 }
  const rowStyle: TextStyle = { size: numbered ? 46 : cover ? 61 : 53, weight: 700, color: cover ? ink : color('es'), accent }
  const noteStyle: TextStyle = { size: 35, weight: 600, color: secondary, accent }
  const labelStyle: TextStyle = { size: 27, weight: 800, color: accent }

  function hasContent(row: CardRow): boolean {
    return Boolean(row.label.trim() || row.text.trim() || row.note.trim())
  }

  function drawRow(row: CardRow, y: number, rowIndex: number, paint = true): number {
    if (!hasContent(row)) return 0
    const x = MARGIN + (numbered ? 92 : 38)
    const w = CARD_WIDTH - MARGIN - 38 - x
    const rule = card.kind === 'rule' && rowIndex === 0
    const ownText = rule ? { ...rowStyle, size: 46 } : rowStyle
    const ownLabel = card.kind === 'mistake'
      ? { ...labelStyle, color: color(rowIndex === 0 ? 'bad' : 'ok') }
      : answer ? noteStyle : labelStyle
    const hLabel = block(row.label, x, 0, w, ownLabel, false)
    const hText = block(row.text, x, 0, w, ownText, false)
    const ownNote = variations ? { ...noteStyle, size: 32 } : noteStyle
    const hNote = block(row.note, x, 0, w, ownNote, false)
    const pad = rowPadding
    const height = pad * 2 + hLabel + hText + hNote
      + (hLabel && (hText || hNote) ? 12 : 0) + (hText && hNote ? 8 : 0)
    if (!paint) return height
    ctx.save()
    if (variations) {
      rect(MARGIN, y + height, CONTENT_WIDTH, 2, color('rule'))
    } else if (examples || answer) {
      const positive = color('mark-bg-ok')
      const border = answer && positive !== 'transparent' ? positive : color('accent-soft')
      rect(MARGIN, y, CONTENT_WIDTH, height, color('bg-panel'), 28)
      ctx.globalAlpha = .25
      rect(MARGIN, y, CONTENT_WIDTH, height, border, 28)
      ctx.globalAlpha = 1
      ctx.lineWidth = 3
      ctx.strokeStyle = border
      ctx.stroke()
    } else {
      const tint = color('mark-bg')
      const background = color(rule ? 'accent-soft' : 'bg-panel')
      if (filledCover) ctx.globalAlpha = .12
      rect(MARGIN, y, CONTENT_WIDTH, height, filledCover ? ink : rule && tint !== 'transparent' ? tint : background, 28)
    }
    ctx.restore()
    if (numbered) {
      const firstStyle = hLabel ? ownLabel : hText ? ownText : ownNote
      const centerY = y + pad + lineHeight(firstStyle) / 2
      rect(MARGIN + 26, centerY - 21.5, 43, 43, color('accent-soft'), 12)
      ctx.textAlign = 'center'
      centeredLine(String(rowIndex + 1), MARGIN + 47.5, centerY, labelStyle)
      ctx.textAlign = 'left'
    }
    let top = y + pad
    if (hLabel) top += block(row.label, x, top, w, ownLabel) + (hText || hNote ? 12 : 0)
    if (hText) top += block(row.text, x, top, w, ownText) + (hNote ? 8 : 0)
    if (hNote) block(row.note, x, top, w, ownNote)
    return height
  }

  function drawConjugation(rows: CardRow[], y: number, paint: boolean): number {
    if (!rows.length) return 0
    const pronounX = MARGIN + 28
    const formX = MARGIN + 440
    const pronounStyle = { ...noteStyle, size: 36 }
    const formStyle = { ...rowStyle, size: 49 }
    const translationStyle = { ...noteStyle, size: 30 }
    const formWidth = CARD_WIDTH - MARGIN - 28 - formX
    if (paint) {
      centeredLine('Лицо', pronounX, y + 17, labelStyle)
      centeredLine('Форма', formX, y + 17, labelStyle)
    }
    let top = y + 53
    for (const [rowIndex, row] of rows.entries()) {
      const hPronoun = block(row.label, pronounX, 0, 380, pronounStyle, false)
      const hForm = block(row.text, formX, 0, formWidth, formStyle, false)
      const hTranslation = block(row.note, formX, 0, formWidth, translationStyle, false)
      const gap = hForm && hTranslation ? 4 : 0
      const hRight = hForm + gap + hTranslation
      const hContent = Math.max(hPronoun, hRight)
      if (paint) {
        rect(MARGIN, top, CONTENT_WIDTH, hContent + 28, color(rowIndex % 2 ? 'bg-panel' : 'accent-soft'), 14)
        block(row.label, pronounX, top + 14 + (hContent - hPronoun) / 2, 380, pronounStyle)
        const right = top + 14 + (hContent - hRight) / 2
        block(row.text, formX, right, formWidth, formStyle)
        block(row.note, formX, right + hForm + gap, formWidth, translationStyle)
      }
      top += hContent + 34
    }
    return top - y
  }

  function drawComparison(rows: CardRow[], y: number, paint: boolean): number {
    if (!rows.length) return 0
    const gap = 22
    const width = (CONTENT_WIDTH - gap * (rows.length - 1)) / rows.length
    const inset = 30
    const w = width - inset * 2
    const heading = { ...labelStyle, size: 34, leading: 1.2 }
    const example = { ...rowStyle, size: 49 }
    const description = { ...noteStyle, size: 32 }
    const layouts = rows.map((row) => {
      const hLabel = block(row.label, 0, 0, w, heading, false)
      const hText = block(row.text, 0, 0, w, example, false)
      const hNote = block(row.note, 0, 0, w, description, false)
      return { hLabel, hText, hNote }
    })
    const labelHeight = Math.max(...layouts.map((item) => item.hLabel))
    const textHeight = Math.max(...layouts.map((item) => item.hText))
    const noteHeight = Math.max(...layouts.map((item) => item.hNote))
    const height = labelHeight + textHeight + noteHeight + 112
    if (paint) {
      for (const [column, row] of rows.entries()) {
        const x = MARGIN + column * (width + gap)
        rect(x, y, width, height, color(column ? 'bg-panel-alt' : 'accent-soft'), 24)
        block(row.label, x + inset, y + 30, w, heading)
        block(row.text, x + inset, y + 50 + labelHeight, w, example)
        block(row.note, x + inset, y + 76 + labelHeight + textHeight, w, description)
      }
    }
    return height + 24
  }

  function drawRows(y: number, paint: boolean): number {
    if (card.kind === 'conjugation') return drawConjugation(card.rows.filter(hasContent), y, paint)
    if (card.kind === 'comparison') return drawComparison(card.rows.filter(hasContent), y, paint)
    let top = y
    for (const [rowIndex, row] of card.rows.entries()) {
      const height = drawRow(row, top, rowIndex, paint)
      if (height) top += height + rowGap
    }
    return top - y
  }

  rect(0, 0, CARD_WIDTH, CARD_HEIGHT, filledCover ? coverBackground : color(question ? 'accent-soft' : 'bg'))
  if (cover) {
    ctx.save()
    ctx.strokeStyle = filledCover ? ink : color('accent')
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    const right = CARD_WIDTH - MARGIN
    for (const [index, width] of [128, 92, 57].entries()) {
      const y = 100 + index * 22
      ctx.globalAlpha = .26 - index * .05
      ctx.beginPath()
      ctx.moveTo(right - width, y)
      ctx.lineTo(right, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  rect(MARGIN, 101, 22, 22, filledCover && dot === coverBackground ? ink : dot, 6)
  centeredLine(stamp.toUpperCase(), MARGIN + 42, 112, { size: 29, weight: 800, color: secondary })

  const titleHeight = block(card.title, MARGIN, 0, CONTENT_WIDTH, titleStyle, false)
  const detailHeight = block(card.detail, MARGIN, 0, CONTENT_WIDTH, detailStyle, false)
  const rowsHeight = drawRows(0, false)
  const detailAbove = card.kind === 'conjugation' && detailHeight > 0
  const titleGap = titleHeight && (rowsHeight || detailHeight) ? (cover ? 50 : detailAbove ? 16 : 42) : 0
  const detailGap = detailHeight && rowsHeight && (detailAbove || examples) ? 22 : 0
  const contentHeight = titleHeight + titleGap + rowsHeight + detailHeight + detailGap
  const top = cover
    ? Math.max(230, Math.min(425, 630 - contentHeight / 2))
    : Math.max(253, Math.min(410, 720 - contentHeight / 2))
  if (!cover) line(CARD_LABELS[card.kind], MARGIN, top - 72, labelStyle)
  if (cover && !filledCover) rect(MARGIN, top - 50, 112, 10, color('accent'), 5)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, top, CARD_WIDTH, FOOTER_TOP - top - 32)
  ctx.clip()

  let y = top
  if (titleHeight) y += block(card.title, MARGIN, y, CONTENT_WIDTH, titleStyle) + titleGap
  if (detailAbove) y += block(card.detail, MARGIN, y, CONTENT_WIDTH, detailStyle) + detailGap
  y += drawRows(y, true)
  if (!detailAbove && detailHeight) y += detailGap + block(card.detail, MARGIN, y + detailGap, CONTENT_WIDTH, detailStyle)
  ctx.restore()
  ctx.save()
  if (filledCover) ctx.globalAlpha = .3
  const footerColor = filledCover ? ink : color(question ? 'bar' : 'rule')
  rect(MARGIN, FOOTER_TOP, CONTENT_WIDTH, question ? 4 : 2, footerColor)
  ctx.restore()
  centeredLine('@espanolcontimur', MARGIN, 1271, { size: 28, weight: 800, color: secondary })
  if (count > 1) {
    ctx.textAlign = 'right'
    centeredLine(`${number(index)} / ${String(count).padStart(2, '0')}`, CARD_WIDTH - MARGIN, 1271, {
      size: 28, weight: 800, color: secondary,
    })
    ctx.textAlign = 'left'
  }

  return !horizontalOverflow && y <= FOOTER_TOP - 32
}
