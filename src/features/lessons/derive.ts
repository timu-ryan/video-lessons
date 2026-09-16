import type {
  DialogueSlide,
  Lesson,
  Slide,
  Speaker,
  TableSlide,
} from '../slides/types'
import { plainText } from '../slides/markup'
import type { LessonSource, SlideSource } from './source'

/**
 * Достраивает урок до того, что ждут компоненты: нумерация практики,
 * «1/2» у разрезанных разделов, название раздела на каждом слайде, оглавление
 * на титуле, пауза практики, форма глагола в спряжении, цвета говорящих.
 *
 * Всё это в файле урока не хранится — иначе вставка одной фразы в середину
 * заставляла бы перенумеровывать весь файл вручную. Здесь — единственное место,
 * где эти значения появляются.
 */

/** Цвета реплик раздаются по порядку говорящих; переменные живут в index.css. */
const SPEAKER_COLORS = ['var(--speaker-a)', 'var(--speaker-b)', 'var(--speaker-c)']

/**
 * Пауза практики, когда её не задали ни слайд, ни группа: время подумать
 * плюс время произнести. Считаем по словам, а не по буквам — длинное слово
 * говорится быстрее, чем столько же букв в коротких.
 */
const PAUSE_BASE_MS = 2500
const PAUSE_PER_WORD_MS = 600
const PAUSE_MIN_MS = 3000
const PAUSE_MAX_MS = 12000

export function autoPauseMs(es: string): number {
  const words = plainText(es)
    .split(/\s+/)
    .filter((word) => /\p{L}|\d/u.test(word)).length
  const ms = PAUSE_BASE_MS + PAUSE_PER_WORD_MS * words
  return Math.round(Math.min(PAUSE_MAX_MS, Math.max(PAUSE_MIN_MS, ms)) / 100) * 100
}

export function deriveLesson(source: LessonSource): Lesson {
  const speakers: Record<string, Speaker> = Object.fromEntries(
    Object.entries(source.speakers).map(([key, name], index) => [
      key,
      { name, color: SPEAKER_COLORS[index % SPEAKER_COLORS.length] as string },
    ]),
  )

  const pauseByGroup = new Map(source.practiceGroups.map((g) => [g.name, g.pauseMs]))
  const parts = computeParts(source.slides)
  const agenda = source.slides.flatMap((s) => (s.type === 'section' ? [s.title] : []))
  const totals = {
    practice: count(source.slides, 'practice'),
  }

  const seen = { section: 0, practice: 0 }
  const perType = new Map<string, number>()
  let section: string | undefined

  const slides = source.slides.map((raw, index): Slide => {
    const n = (perType.get(raw.type) ?? 0) + 1
    perType.set(raw.type, n)
    const base = { id: raw.id ?? `${raw.type}-${n}`, notes: raw.notes }

    switch (raw.type) {
      case 'title':
        return {
          ...base,
          type: 'title',
          course: source.course,
          lessonLabel: `Урок ${source.number}`,
          topic: source.title,
          agenda: raw.agenda ?? (agenda.length > 0 ? agenda : undefined),
        }

      case 'section': {
        seen.section += 1
        const number = String(seen.section)
        section = `${number} · ${raw.title}`
        return { ...base, type: 'section', number, title: raw.title, hint: raw.hint }
      }

      case 'table':
        return {
          ...base,
          type: 'table',
          title: raw.title,
          section,
          part: parts[index],
          headers: { ...source.tableHeaders, ...raw.headers },
          rows: raw.rows,
        }

      case 'rule':
        return {
          ...base,
          type: 'rule',
          title: raw.title,
          section,
          pattern: raw.pattern,
          text: raw.text,
          examples: raw.examples,
        }

      case 'conjugation':
        return {
          ...base,
          type: 'conjugation',
          verb: raw.verb,
          ru: raw.ru,
          section,
          rows: raw.rows.map((row) => ({ ...row, es: `${row.stem}${row.ending}` })),
        }

      case 'compare':
        return {
          ...base,
          type: 'compare',
          title: raw.title,
          section,
          left: raw.left,
          right: raw.right,
        }

      case 'practice': {
        seen.practice += 1
        return {
          ...base,
          type: 'practice',
          group: raw.group,
          index: seen.practice,
          total: totals.practice,
          phrase: raw.phrase,
          pauseMs: raw.pauseMs ?? pauseByGroup.get(raw.group) ?? autoPauseMs(raw.phrase.es),
        }
      }

      case 'dialogue':
        return {
          ...base,
          type: 'dialogue',
          title: raw.title,
          section,
          part: parts[index],
          lines: raw.lines,
        }

      case 'final':
        return {
          ...base,
          type: 'final',
          title: raw.title,
          bullets: raw.bullets,
          nextTitle: raw.nextTitle,
          nextText: raw.nextText,
          outro: raw.outro,
        }
    }
  })

  // Собранный id — ключ React; совпадение с заданным вручную ломало бы анимации.
  const ids = new Set<string>()
  for (const s of slides) {
    if (ids.has(s.id)) throw new Error(`Урок ${source.number}: повторяется id слайда «${s.id}»`)
    ids.add(s.id)
  }

  return {
    id: String(source.number),
    number: source.number,
    level: source.level,
    planLesson: source.planLesson,
    title: source.title,
    speakers,
    slides,
  }
}

function count(slides: SlideSource[], type: SlideSource['type']): number {
  return slides.reduce((sum, s) => sum + (s.type === type ? 1 : 0), 0)
}

/**
 * «1/2» у слайдов, на которые разрезан один раздел: подряд идущие таблицы
 * (или диалоги) с одинаковым заголовком. Именно подряд — одноимённый раздел
 * в другом месте урока не должен приклеиваться к этому.
 */
function computeParts(slides: SlideSource[]): Record<number, [number, number] | undefined> {
  const parts: Record<number, [number, number] | undefined> = {}
  const splittable = (s: SlideSource): s is TableSlide | DialogueSlide =>
    s.type === 'table' || s.type === 'dialogue'

  let start = 0
  while (start < slides.length) {
    const head = slides[start]
    if (!head || !splittable(head)) {
      start += 1
      continue
    }
    let end = start + 1
    while (end < slides.length) {
      const next = slides[end]
      if (!next || !splittable(next) || next.type !== head.type || next.title !== head.title) break
      end += 1
    }
    const length = end - start
    if (length > 1) {
      for (let i = 0; i < length; i++) parts[start + i] = [i + 1, length]
    }
    start = end
  }
  return parts
}
