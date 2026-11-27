import type { PracticePhrase } from '../slides/types'
import type { CardContent, CardRow, CarouselTopic } from './draft'

const TOPIC_PREFIX = 'video-lessons:instagram:topic-meta:'

function phrase(text: string, note = '', label = ''): CardRow {
  return { text, note, label }
}

function conjugation(title: string, forms: string[]): CardContent {
  const pronouns = ['yo', 'tú', 'él / ella / usted', 'nosotros / nosotras', 'vosotros / vosotras', 'ellos / ellas / ustedes']
  return {
    kind: 'conjugation',
    title,
    detail: 'Настоящее время',
    rows: forms.map((form, i) => phrase(form, '', pronouns[i])),
  }
}

const serConjugation = conjugation('ser', ['**soy**', '**eres**', '**es**', '**somos**', '**sois**', '**son**'])
const estarConjugation = conjugation('estar', ['est**oy**', 'est**ás**', 'est**á**', 'est**amos**', 'est**áis**', 'est**án**'])
const conjugationNote = 'Таблица спряжения — на последней карточке →'

function practice(title: string, items: PracticePhrase[]): CardContent[] {
  return [
    { kind: 'question', title, detail: '', rows: items.map(({ ru }) => phrase(ru)) },
    {
      kind: 'answer',
      title: 'Сверь ответы',
      detail: '',
      rows: items.map(({ es, ru, alternatives }) =>
        phrase(es, alternatives?.length ? `Ещё вариант: ${alternatives.join(' / ')}` : '', ru),
      ),
    },
  ]
}

const comparisonExercises: PracticePhrase[] = [
  { ru: 'Я из Мадрида.', es: '**Soy** de Madrid.' },
  { ru: 'Я сейчас в Мадриде.', es: 'Ahora **estoy** en Madrid.', alternatives: ['Estoy en Madrid ahora.'] },
  { ru: 'Ана врач.', es: 'Ana **es** médica.' },
  { ru: 'Мы дома.', es: '**Estamos** en casa.' },
]

const serExamples: CardContent = {
  kind: 'examples',
  title: 'Кто? Откуда? Какой?',
  detail: '',
  rows: [
    phrase('**Soy** profesora.', 'Я преподавательница.', 'Профессия'),
    phrase('**Somos** de Madrid.', 'Мы из Мадрида.', 'Происхождение'),
    phrase('Ana **es** simpática.', 'Ана приятная в общении.', 'Характеристика'),
  ],
}

const serExercises: PracticePhrase[] = [
  { ru: 'Я из Валенсии.', es: '**Soy** de Valencia.' },
  { ru: 'Они студенты.', es: '**Son** estudiantes.', alternatives: ['Ellos son estudiantes.'] },
  { ru: 'Мы преподаватели.', es: '**Somos** profesores.' },
  { ru: 'Ана очень приятная.', es: 'Ana **es** muy simpática.' },
]

const estarExamples: CardContent = {
  kind: 'examples',
  title: 'Где? Как себя чувствуешь?',
  detail: '',
  rows: [
    phrase('El libro **está** en la mesa.', 'Книга на столе.', 'Местоположение'),
    phrase('**Estoy** cansada.', 'Я устала.', 'Состояние'),
  ],
}

const estarExercises: PracticePhrase[] = [
  { ru: 'Мы дома.', es: '**Estamos** en casa.' },
  { ru: 'Она устала.', es: '**Está** cansada.', alternatives: ['Ella está cansada.'] },
  { ru: 'Книга на столе.', es: 'El libro **está** en la mesa.' },
  { ru: 'Ты сейчас в Валенсии.', es: 'Ahora **estás** en Valencia.' },
]

export const presetTopics: CarouselTopic[] = [
  {
    kind: 'topic',
    id: 'ser-estar',
    title: 'Ser и estar',
    retiredCards: [serConjugation, estarConjugation],
    previousCards: practice('Ser или estar?', comparisonExercises.slice(0, 2)),
    cards: [
      { kind: 'cover', title: 'Ser или estar?', detail: 'Зачем в испанском два глагола «быть»?', rows: [] },
      {
        kind: 'comparison',
        title: 'Кто он? Как он сейчас?',
        detail: '',
        rows: [
          phrase('Carlos **es** médico.', 'Карлос — врач.\nС ser называем профессию.', 'SER'),
          phrase('Carlos **está** cansado.', 'Карлос устал.\nС estar описываем состояние.', 'ESTAR'),
        ],
      },
      ...practice('Ser или estar?', comparisonExercises),
    ],
  },
  {
    kind: 'topic',
    id: 'ser',
    title: 'Ser — когда и как употреблять',
    previousCards: [serExamples, ...practice('Попробуй с ser', serExercises.slice(0, 2))],
    cards: [
      { kind: 'cover', title: 'Когда говорить ser?', detail: 'Как назвать профессию, сказать, откуда ты, и описать человека.', rows: [] },
      { ...serExamples, detail: conjugationNote },
      ...practice('Попробуй с ser', serExercises),
      serConjugation,
    ],
  },
  {
    kind: 'topic',
    id: 'estar',
    title: 'Estar — когда и как употреблять',
    previousCards: [estarExamples, ...practice('Попробуй с estar', estarExercises.slice(0, 2))],
    cards: [
      { kind: 'cover', title: 'Когда говорить estar?', detail: 'Как сказать, где ты находишься и как себя чувствуешь.', rows: [] },
      { ...estarExamples, detail: conjugationNote },
      ...practice('Попробуй с estar', estarExercises),
      estarConjugation,
    ],
  },
  {
    kind: 'topic',
    id: 'coffee',
    title: '5 способов заказать кофе',
    cards: [
      { kind: 'cover', title: '5 способов заказать кофе', detail: 'Фразы, которые можно сказать у стойки или за столиком.', rows: [] },
      {
        kind: 'variations',
        title: 'Как попросить кофе',
        detail: '',
        rows: [
          phrase('Un café, por favor.', 'Кофе, пожалуйста.'),
          phrase('Para mí, un café.', 'Мне кофе.'),
          phrase('Quisiera un café, por favor.', 'Я бы хотел(а) кофе, пожалуйста.'),
          phrase('¿Me pone un café, por favor?', 'Можно мне кофе, пожалуйста?'),
          phrase('¿Me trae un café, por favor?', 'Принесите мне кофе, пожалуйста.'),
        ],
      },
      {
        kind: 'dialogue',
        title: 'За столиком',
        detail: '',
        rows: [
          phrase('¿Qué va a tomar?', 'Что будете пить?', 'Официант'),
          phrase('Para mí, un café con leche, por favor.', 'Мне кофе с молоком, пожалуйста.', 'Гость'),
        ],
      },
    ],
  },
  {
    kind: 'topic',
    id: 'no-entiendo',
    title: 'Как ещё сказать «No entiendo»',
    cards: [
      { kind: 'cover', title: 'Как ещё сказать «No entiendo»?', detail: 'Три фразы, когда что-то осталось непонятным.', rows: [] },
      {
        kind: 'variations',
        title: 'Три варианта',
        detail: '',
        rows: [
          phrase('No lo entiendo.', 'Я этого не понимаю.'),
          phrase('No me queda claro.', 'Мне это неясно.'),
          phrase('No lo acabo de entender.', 'Я не до конца это понимаю.'),
        ],
      },
    ],
  },
]

export function loadTopics(): CarouselTopic[] {
  try {
    const topics: CarouselTopic[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(TOPIC_PREFIX)) continue
      const id = key.slice(TOPIC_PREFIX.length)
      const title = localStorage.getItem(key)
      if (/^custom-[a-z0-9-]+$/u.test(id) && title?.trim()) {
        topics.push({ kind: 'topic', id, title })
      }
    }
    return topics
  } catch {
    return []
  }
}

export function saveTopic(topic: CarouselTopic): boolean {
  try {
    localStorage.setItem(TOPIC_PREFIX + topic.id, topic.title)
    return true
  } catch {
    return false
  }
}
