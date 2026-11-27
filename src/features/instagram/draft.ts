import { isObject } from '../lessons/parse'
import type { SummarySource } from '../lessons/source'
import { isThemeName, type ThemeName } from '../settings/palettes'
import { plainText } from '../slides/markup'
import type { Lesson, Phrase, PracticePhrase } from '../slides/types'

export const CARD_LABELS = {
  cover: 'Обложка',
  rule: 'Правило',
  examples: 'Примеры',
  question: 'Задание',
  answer: 'Ответ',
  mistake: 'Типичная ошибка',
  dialogue: 'Мини-диалог',
  conjugation: 'Спряжение',
  comparison: 'Сравнение',
  variations: 'Варианты фразы',
} as const

export type CardKind = keyof typeof CARD_LABELS

export interface CardRow {
  text: string
  note: string
  label: string
}

export interface CardContent {
  kind: CardKind
  title: string
  detail: string
  rows: CardRow[]
}

export interface Card extends CardContent {
  id: string
}

export type CoverStyle = 'filled' | 'accent'

export interface Draft {
  cards: Card[]
  caption: string
  theme: ThemeName
  coverStyle: CoverStyle
}

export type CarouselLesson = Lesson & { summary: SummarySource }
export interface CarouselTopic {
  kind: 'topic'
  id: string
  title: string
  cards?: CardContent[]
  retiredCards?: CardContent[]
  previousCards?: CardContent[]
}

export type CarouselSource = CarouselLesson | CarouselTopic
type CardTemplates = Record<CardKind, CardContent>
export const MAX_CARDS = 10
const DEFAULT_THEME: ThemeName = 'vino'

export function cardRowLimit(kind: CardKind): number {
  if (kind === 'conjugation') return 6
  if (kind === 'variations') return 5
  if (kind === 'comparison') return 2
  return 4
}

export function lessonLabel(lesson: CarouselLesson): string {
  return `${lesson.level} · Урок ${lesson.planLesson}`
}

export function carouselStamp(source: CarouselSource): string {
  return source.kind === 'topic' ? 'Español con Tim' : lessonLabel(source)
}

export function carouselSlug(source: CarouselSource): string {
  if (source.kind === 'topic') {
    const slug = source.title.toLowerCase().normalize('NFC')
      .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '')
    return slug || source.id
  }
  return `${source.level.toLowerCase()}-${String(source.planLesson).padStart(2, '0')}`
}

function sentence(text: string): string {
  return plainText(text).trim().replace(/[.!?…]+$/u, '')
}

function phraseRow({ es, ru }: Phrase, label = ''): CardRow {
  return { text: es, note: ru, label }
}

function questionRow(exercise: PracticePhrase): CardRow {
  return { text: exercise.ru, note: exercise.hint ?? '', label: '' }
}

function answerRow(exercise: PracticePhrase, legacy: boolean): CardRow {
  const alternatives = exercise.alternatives ?? []
  return {
    text: exercise.es,
    note: alternatives.length
      ? `${!legacy && alternatives.length > 1 ? 'Ещё варианты' : 'Ещё вариант'}: ${alternatives.join(legacy ? ' / ' : '\n')}`
      : '',
    label: legacy ? '' : exercise.hint ? `${exercise.ru} (${exercise.hint})` : exercise.ru,
  }
}

function buildLessonCards(lesson: CarouselLesson, legacy: boolean): CardTemplates {
  const { phrases, mistake, practice } = lesson.summary
  const { wrong, right } = mistake
  const isInfinitive = lesson.level === 'A0' && lesson.planLesson === 3
  const isHundreds = lesson.level === 'A1' && lesson.planLesson === 2
  const rule = lesson.slides.find((slide) =>
    slide.type === 'rule' && slide.pattern[0] === 'ciento',
  )
  const dialogue = lesson.slides.find((slide) => slide.type === 'dialogue')
  const conjugation = lesson.slides.find((slide) => slide.type === 'conjugation')
  const comparison = lesson.slides.find((slide) =>
    slide.type === 'compare' && !slide.left.tone && !slide.right.tone,
  )
  const exercise = (isHundreds ? practice.find((phrase) => phrase.es.includes('Ciento un euros')) : undefined)
    ?? practice[0]
  const hundredPractice = isHundreds && lesson.slides.find((slide) =>
    slide.type === 'practice' && plainText(slide.phrase.es) === 'Solo tengo cien euros.',
  )
  const exercises = [
    exercise,
    ...(!legacy ? [
      hundredPractice && hundredPractice.type === 'practice'
        ? hundredPractice.phrase
        : practice.find((item) => item !== exercise),
    ] : []),
  ].filter((item) => item !== undefined)
  let examples = phrases.slice(0, 2)
  if (isInfinitive) {
    examples = ['Quiero comer.', 'Puedo nadar.', 'Necesito descansar.'].flatMap((text) =>
      phrases.find((phrase) => plainText(phrase.es) === text) ?? [],
    )
  }
  if (isHundreds) {
    examples = phrases.filter((phrase) => /\bcien(?:to)?\b/u.test(plainText(phrase.es))).slice(0, 2)
  }
  const ruleText = isInfinitive
    ? 'Первый глагол показывает лицо. Второй стоит в инфинитиве.'
    : isHundreds ? 'Ровно 100 — cien. От 101 до 199 — ciento + остаток.' : lesson.summary.rule
  const formula = isInfinitive
    ? '**quiero / puedo / necesito** + инфинитив'
    : isHundreds && rule?.type === 'rule' ? rule.pattern.join(' ') : ''
  const ruleExample = (isHundreds && rule?.type === 'rule' ? rule.examples[1] : undefined)
    ?? examples[0] ?? phrases[0]
  const ruleRows: CardRow[] = legacy
    ? (formula ? [{ text: formula, note: '', label: '' }] : [])
    : [
      { text: formula || ruleText, note: formula ? ruleText : '', label: '' },
      ...(ruleExample ? [phraseRow(ruleExample, 'Пример')] : []),
    ]

  return {
    cover: {
      kind: 'cover',
      title: isHundreds
        ? 'Почему 100 евро — cien euros, а 101 — ciento un euros?'
        : isInfinitive
          ? 'Quiero hablo или quiero hablar?'
          : `Как сказать «${sentence(examples[0]?.ru ?? lesson.title)}»?`,
      detail: isInfinitive ? 'Как сказать «Я хочу говорить по-испански»?' : lesson.title,
      rows: [],
    },
    rule: {
      kind: 'rule',
      title: isHundreds ? 'Сто и чуть больше' : 'Как это устроено',
      detail: legacy ? ruleText : '',
      rows: ruleRows,
    },
    examples: {
      kind: 'examples',
      title: 'Примеры в речи',
      detail: '',
      rows: examples.map((phrase) => phraseRow(phrase)),
    },
    question: {
      kind: 'question',
      title: 'Как сказать по-испански?',
      detail: '',
      rows: exercises.map(questionRow),
    },
    answer: {
      kind: 'answer',
      title: legacy ? 'Сверь ответ' : 'Сверь ответы',
      detail: legacy && isInfinitive ? '**Quiero** показывает лицо. **Descansar** стоит в инфинитиве.' : '',
      rows: exercises.map((item) => answerRow(item, legacy)),
    },
    mistake: {
      kind: 'mistake',
      title: 'Типичная ошибка',
      detail: '',
      rows: [
        { label: wrong.label ?? 'Неверно', text: wrong.es, note: wrong.ru ?? '' },
        { label: right.label ?? 'Верно', text: right.es, note: right.ru ?? '' },
      ],
    },
    dialogue: {
      kind: 'dialogue',
      title: dialogue?.title ?? 'Мини-диалог',
      detail: '',
      rows: dialogue?.lines.slice(0, 2).map(({ speaker, es, ru }) => ({
        label: lesson.speakers[speaker]?.name ?? speaker,
        text: es,
        note: ru,
      })) ?? [],
    },
    conjugation: {
      kind: 'conjugation',
      title: conjugation?.verb ?? 'Спряжение глагола',
      detail: conjugation?.ru ?? '',
      rows: conjugation?.rows.map(({ pronoun, stem, ending }) => ({
        label: pronoun,
        text: `${stem}**${ending}**`,
        note: '',
      })) ?? [],
    },
    comparison: {
      kind: 'comparison',
      title: comparison?.type === 'compare' ? comparison.title : 'В чём разница?',
      detail: '',
      rows: comparison?.type === 'compare'
        ? [comparison.left, comparison.right].map(({ label, items }) => ({
          label, text: items[0]?.es ?? '', note: items[0]?.ru ?? '',
        })) : [],
    },
    variations: {
      kind: 'variations',
      title: 'Другие фразы по теме',
      detail: '',
      rows: phrases.slice(0, 3).map((phrase) => phraseRow(phrase)),
    },
  }
}

export function lessonCards(lesson: CarouselLesson): CardTemplates {
  return buildLessonCards(lesson, false)
}

export function carouselTemplates(source: CarouselSource): CardTemplates {
  if (source.kind !== 'topic') return lessonCards(source)
  const kinds = Object.keys(CARD_LABELS) as CardKind[]
  return Object.fromEntries(kinds.map((kind) => [
    kind,
    source.cards?.find((card) => card.kind === kind) ?? {
      kind,
      title: kind === 'cover' ? source.title : CARD_LABELS[kind],
      detail: '',
      rows: [],
    },
  ])) as CardTemplates
}

export function newId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

export function newCard(content: CardContent): Card {
  return { ...content, id: newId() }
}

export function createDraft(source: CarouselSource, templates: CardTemplates): Draft {
  const extra = templates.conjugation.rows.length ? templates.conjugation : templates.comparison
  const initial = source.kind === 'topic' ? source.cards ?? [templates.cover] : [
    templates.cover,
    templates.rule,
    ...(extra.rows.length ? [extra] : []),
    templates.examples,
    templates.question,
    templates.answer,
  ]
  return {
    cards: initial.map(newCard),
    caption: defaultCaption(source, templates.cover.title),
    theme: DEFAULT_THEME,
    coverStyle: 'filled',
  }
}

export function defaultCaption(source: CarouselSource, coverTitle: string): string {
  return [
    plainText(coverTitle).trim(),
    ...(source.kind === 'topic'
      ? ['Сохрани карточки, чтобы повторить фразы позже.']
      : [
        'Листай карточки, попробуй ответить и проверь себя.',
        `Упражнения и конспект — на сайте по ссылке в профиле. ${source.level}, урок ${source.planLesson}.`,
      ]),
    '#испанский #испанскийснуля #урокииспанского',
  ].filter(Boolean).join('\n\n')
}

function storageKey(source: CarouselSource): string {
  return `video-lessons:instagram:v1:${source.kind === 'topic' ? 'topic:' : ''}${source.id}`
}

function isRow(value: unknown): value is CardRow {
  return isObject(value) && typeof value.label === 'string'
    && typeof value.text === 'string' && typeof value.note === 'string'
}

function isCard(value: unknown): value is Card {
  if (!isObject(value) || typeof value.kind !== 'string' || !Object.hasOwn(CARD_LABELS, value.kind)) return false
  return typeof value.id === 'string'
    && typeof value.title === 'string' && typeof value.detail === 'string'
    && Array.isArray(value.rows) && value.rows.length <= cardRowLimit(value.kind as CardKind) && value.rows.every(isRow)
}

function readDraft(raw: unknown): (Omit<Draft, 'theme' | 'coverStyle'> & {
  theme?: ThemeName
  coverStyle?: CoverStyle
}) | undefined {
  if (!isObject(raw) || typeof raw.caption !== 'string' || !Array.isArray(raw.cards)) return
  const { caption, cards } = raw
  if (cards.length < 1 || cards.length > MAX_CARDS || !cards.every(isCard)) return
  if (new Set(cards.map((card) => card.id)).size !== cards.length) return
  return {
    caption,
    cards,
    theme: typeof raw.theme === 'string' && isThemeName(raw.theme) ? raw.theme : undefined,
    coverStyle: raw.coverStyle === 'accent' || raw.coverStyle === 'filled' ? raw.coverStyle : undefined,
  }
}

function sameContent(card: Card, template: CardContent): boolean {
  return card.title === template.title && card.detail === template.detail
    && card.rows.length === template.rows.length
    && card.rows.every((row, i) => {
      const original = template.rows[i]
      return original && row.text === original.text && row.note === original.note && row.label === original.label
    })
}

function isPracticeCard(card: Card): boolean {
  return card.kind === 'question' || card.kind === 'answer'
}

function updateTopicCards(source: CarouselTopic, cards: Card[], templates: CardTemplates, oldCover: boolean): Card[] {
  const retired = source.retiredCards
  if (oldCover && retired) {
    const kept = cards.filter((card) => !retired.some((template) =>
      card.kind === template.kind && sameContent(card, template),
    ))
    if (kept.length) {
      const moved = (card: Card) => retired.some((template) => card.kind === template.kind)
      cards = [...kept.filter((card) => !moved(card)), ...kept.filter(moved)]
    }
  }

  const previous = source.previousCards
  if (!previous) return cards
  const matches = (card: Card) => previous.some((template) =>
    card.kind === template.kind && sameContent(card, template),
  )
  const practice = cards.filter(isPracticeCard)
  const updatePractice = practice.length === 2 && practice[0]?.kind !== practice[1]?.kind && practice.every(matches)
  return cards.map((card, index) => {
    const updateNote = index === 1 && card.kind === 'examples' && cards.at(-1)?.kind === 'conjugation' && matches(card)
    return updateNote || (updatePractice && isPracticeCard(card))
      ? { ...templates[card.kind], id: card.id }
      : card
  })
}

export function loadDraft(source: CarouselSource, templates: CardTemplates): Draft | undefined {
  try {
    const raw = localStorage.getItem(storageKey(source))
    const saved = raw === null ? undefined : readDraft(JSON.parse(raw))
    if (!saved) return
    const draft: Draft = { ...saved, theme: saved.theme ?? DEFAULT_THEME, coverStyle: saved.coverStyle ?? 'filled' }
    if (source.kind === 'topic') {
      return { ...draft, cards: updateTopicCards(source, saved.cards, templates, !saved.coverStyle) }
    }
    if (saved.theme) return draft

    // Обновляем старые шаблоны. Вопросы и ответы проверяем вместе, чтобы не разорвать пару.
    const original = buildLessonCards(source, true)
    const exercisesUntouched = saved.cards.every((card) =>
      (card.kind !== 'question' && card.kind !== 'answer') || sameContent(card, original[card.kind]),
    )
    const cards = saved.cards.map((card) => {
      const upgrade = card.kind === 'rule'
        ? sameContent(card, original.rule)
        : exercisesUntouched && (card.kind === 'question' || card.kind === 'answer')
      return upgrade ? { ...templates[card.kind], id: card.id } : card
    })
    return { ...draft, cards }
  } catch {
    return
  }
}

export function saveDraft(source: CarouselSource, draft: Draft): boolean {
  try {
    localStorage.setItem(storageKey(source), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}
