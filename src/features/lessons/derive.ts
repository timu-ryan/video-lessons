import type {
  DialogueSlide,
  Lesson,
  MistakeKind,
  Slide,
  Speaker,
  TableSlide,
} from '../slides/types'
import type { LessonSource, SlideSource } from './source'

/**
 * Достраивает урок до того, что ждут компоненты: нумерация практики и ошибок,
 * «1/2» у разрезанных разделов, название раздела на каждом слайде, оглавление
 * на титуле, пауза из группы практики, цвета говорящих.
 *
 * Всё это в файле урока не хранится — иначе вставка одной фразы в середину
 * заставляла бы перенумеровывать весь файл вручную. Здесь — единственное место,
 * где эти значения появляются.
 */

/** Цвета реплик раздаются по порядку говорящих; переменные живут в index.css. */
const SPEAKER_COLORS = ['var(--speaker-a)', 'var(--speaker-b)', 'var(--speaker-c)']

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
    mistake: count(source.slides, 'mistake'),
  }

  const seen = { section: 0, practice: 0, mistake: 0 }
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

      case 'practice': {
        seen.practice += 1
        return {
          ...base,
          type: 'practice',
          group: raw.group,
          index: seen.practice,
          total: totals.practice,
          phrase: raw.phrase,
          // Группа проверена в parse.ts, поэтому значение здесь всегда есть.
          pauseMs: pauseByGroup.get(raw.group) as number,
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

      case 'mistake': {
        seen.mistake += 1
        return {
          ...base,
          type: 'mistake',
          kind: raw.kind as MistakeKind,
          index: seen.mistake,
          total: totals.mistake,
          section,
          wrong: raw.wrong,
          when: raw.when,
          right: raw.right,
          note: raw.note,
        }
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
    title: source.title,
    audioDir: source.audioDir,
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
