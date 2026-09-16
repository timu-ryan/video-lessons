/**
 * Форма файла урока — то, что лежит в lessons/lesson-NN.json.
 *
 * Правило одно: в файле нет ничего, что можно вычислить. Нумерация практики
 * и ошибок, разбивка раздела на «1/2», название раздела на каждом слайде,
 * оглавление на титуле, длительность паузы — всё это считает derive.ts
 * по порядку слайдов. Вставка фразы в середину урока ничего не ломает.
 *
 * ────────────────────────────────────────────────────────────────────────
 * НУМЕРАЦИЯ
 *
 *   number      сквозной номер урока в курсе, 1–84; он же в имени файла
 *   level       уровень: A0, A1, A2, B1, B2
 *   planLesson  номер урока внутри уровня, как в плане курса («A1, урок 3»)
 *
 * Пара level + planLesson не повторяется между файлами — это проверяется
 * при загрузке.
 *
 * ────────────────────────────────────────────────────────────────────────
 * ВЫДЕЛЕНИЕ НОВОГО
 *
 * В полях `es` и `ru` (и в `alternatives`) новое выделяется прямо в строке:
 * "Quiero **aprender** español." Звёздочки парные, вложенности нет.
 * Презентация подсветит выделенное цветом.
 *
 * ────────────────────────────────────────────────────────────────────────
 * ЗАМЕТКИ (`notes`)
 *
 * Текст, который проговаривается за кадром, — дословно или близко к тому.
 * На слайд не выводится, только в окно докладчика. Объяснение словами живёт
 * здесь, рядом со слайдом, а не на слайде.
 *
 * ────────────────────────────────────────────────────────────────────────
 * КОНВЕНЦИЯ ТРАНСКРИПЦИИ (поле `ipa`)
 *
 * Обязательна: в строках таблиц `table` на любом уровне (это новые слова)
 * и во всех фразах уроков уровня A0 (это уроки про произношение). В остальных
 * местах — по желанию: орфография почти фонетическая, а транскрипция длинных
 * предложений ученику мало что даёт.
 *
 * Международный фонетический алфавит, кастильская норма, запись фонемная
 * (широкая) — без аллофонов:
 *
 *   ˈ       перед ударным слогом
 *   θ       c перед e, i и z: ˈgɾaθjas
 *   j       ll и y: ˈkomo te ˈjamas
 *   x       j и g перед e, i
 *   ɾ / r   одиночное r / начальное r и rr
 *   b d g   смычные ВЕЗДЕ, в том числе между гласными: enkanˈtado, ˈbibes
 *   .       только там, где зияние: ˈdi.as
 *
 * Смычные — сознательное упрощение: между гласными они звучат как
 * аппроксиманты (enkanˈtaðo, ˈbiβes), но для курса с нуля это лишний уровень
 * точности. Запрет на β ð ɣ ʎ проверяет `npm run check:slides`, чтобы новые
 * уроки не сползали к более узкой записи.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Версия формата. Растёт, когда меняется форма файла, а не содержание. */
export const SCHEMA_VERSION = 3

export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2'] as const
export type Level = (typeof LEVELS)[number]

export interface PhraseSource {
  es: string
  ru: string
  ipa?: string
}

export interface DialogueLineSource extends PhraseSource {
  /** Ключ из `speakers` урока. */
  speaker: string
}

export interface SlideSourceBase {
  /** Необязателен: если не задан, собирается из типа и номера слайда. */
  id?: string
  /** Текст за кадром — см. шапку файла. */
  notes?: string[]
}

/** Титул: курс, урок и тема берутся из метаданных, оглавление — из разделов. */
export interface TitleSlideSource extends SlideSourceBase {
  type: 'title'
  /** Переопределение оглавления. По умолчанию — названия всех разделов урока. */
  agenda?: string[]
}

export interface SectionSlideSource extends SlideSourceBase {
  type: 'section'
  title: string
  hint?: string
}

/** Таблица новых слов и фраз. Не более 5 строк, `ipa` обязательна. */
export interface TableSlideSource extends SlideSourceBase {
  type: 'table'
  title: string
  /** Переопределение подписей колонок, можно частичное. */
  headers?: { es?: string; ru?: string }
  rows: PhraseSource[]
}

/**
 * Правило: формула конструкции и примеры.
 *
 *   "pattern": ["quiero", "+", "инфинитив"]
 *
 * "+" рисуется как знак, испанское слово — залитой плашкой, элемент на кириллице
 * («инфинитив») — пустой рамкой, местом для подстановки. Примеров не больше 3.
 */
export interface RuleSlideSource extends SlideSourceBase {
  type: 'rule'
  title: string
  pattern: string[]
  /** Одна-две строки пояснения под формулой. */
  text?: string
  examples: PhraseSource[]
}

export interface ConjugationRowSource {
  /** «yo», «él / ella / usted». */
  pronoun: string
  /** Основа и окончание: habl + o. У неправильной формы основа может быть пустой. */
  stem: string
  /** Выделяется цветом. */
  ending: string
  ru: string
  ipa?: string
}

/** Спряжение: до 6 строк, окончания подсвечены. */
export interface ConjugationSlideSource extends SlideSourceBase {
  type: 'conjugation'
  /** Инфинитив: hablar. */
  verb: string
  /** Перевод инфинитива: говорить. */
  ru: string
  rows: ConjugationRowSource[]
}

/** Пункт колонки сравнения. `ru` не обязателен: у неверного варианта перевода нет. */
export interface CompareItemSource {
  es: string
  ru?: string
  ipa?: string
}

export interface CompareSideSource {
  /** «ser — какой вообще», «по-русски», «так не говорят». */
  label: string
  /**
   * `wrong` — колонка неверных вариантов: ✗ и зачёркивание;
   * `right` — ✓. Без tone колонки равноправны (ser / estar).
   */
  tone?: 'wrong' | 'right'
  items: CompareItemSource[]
}

/**
 * Сравнение в две колонки: ser / estar, perfecto / indefinido,
 * «по-русски / по-испански», неверно / верно. Пункты идут парами по строкам:
 * items[0] слева стоит напротив items[0] справа. Не более 3 строк.
 */
export interface CompareSlideSource extends SlideSourceBase {
  type: 'compare'
  title: string
  left: CompareSideSource
  right: CompareSideSource
}

export interface PracticePhraseSource extends PhraseSource {
  /** Уточнение к заданию, когда перевод неоднозначен: «вежливо», «девушке». */
  hint?: string
  /** Другие правильные ответы: «Yo hablo español» при es «Hablo español». Не больше 2. */
  alternatives?: string[]
}

export interface PracticeSlideSource extends SlideSourceBase {
  type: 'practice'
  /** Имя группы из `practiceGroups` урока. */
  group: string
  phrase: PracticePhraseSource
  /** Пауза именно этого задания, мс — главнее паузы группы. */
  pauseMs?: number
}

export interface DialogueSlideSource extends SlideSourceBase {
  type: 'dialogue'
  title: string
  lines: DialogueLineSource[]
}

export interface FinalSlideSource extends SlideSourceBase {
  type: 'final'
  title: string
  bullets: string[]
  nextTitle: string
  nextText: string
  outro?: string
}

export type SlideSource =
  | TitleSlideSource
  | SectionSlideSource
  | TableSlideSource
  | RuleSlideSource
  | ConjugationSlideSource
  | CompareSlideSource
  | PracticeSlideSource
  | DialogueSlideSource
  | FinalSlideSource

export interface PracticeGroupSource {
  name: string
  /**
   * Пауза перед ответом, мс. Если не задана — считается для каждого задания
   * по длине испанской фразы (derive.ts), и короткое «Trabajo mucho» не ждёт
   * столько же, сколько длинная фраза.
   */
  pauseMs?: number
}

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adj',
  'adv',
  'pron',
  'prep',
  'conj',
  'art',
  'num',
  'interj',
  'phrase',
] as const

export interface VocabularyEntrySource {
  /** Словарная форма: инфинитив, существительное с артиклем — «el año». */
  es: string
  ru: string
  pos: (typeof PARTS_OF_SPEECH)[number]
}

export interface LessonSource {
  schemaVersion: number
  /** Сквозной номер урока, 1–84; он же в имени файла. Отдельного `id` нет. */
  number: number
  level: Level
  /** Номер урока внутри уровня — как в плане курса. */
  planLesson: number
  title: string
  /** Название курса — на титульный слайд. */
  course: string
  /**
   * Слова, которые урок вводит впервые. На слайды не выводятся: из них
   * `npm run vocab:build` собирает docs/vocabulary.md.
   */
  newVocabulary?: VocabularyEntrySource[]
  /** Конструкции, которые урок вводит впервые: «quiero / puedo / necesito + инфинитив». */
  newGrammar?: string[]
  /** Ключ → имя персонажа. Цвет назначает рендерер. */
  speakers: Record<string, string>
  /** Подписи колонок таблиц по умолчанию. */
  tableHeaders: { es: string; ru: string }
  practiceGroups: PracticeGroupSource[]
  slides: SlideSource[]
}
