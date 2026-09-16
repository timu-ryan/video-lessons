/**
 * Типы контента урока — то, что получают компоненты. Это НЕ форма JSON:
 * в файле урока нет ни нумерации, ни разбивки на части, ни названия раздела
 * на каждом слайде. Всё это считается при загрузке (features/lessons/derive.ts),
 * а форму самого файла описывает features/lessons/source.ts.
 *
 * Компоненты знают только эти типы, но не сам урок.
 */

/** Испанская единица: строка таблицы, задание практики, реплика диалога. */
export interface Phrase {
  /** Испанский — переносится из сценария дословно. Может содержать **выделение**. */
  es: string
  /** Перевод. */
  ru: string
  /** Транскрипция в МФА (IPA). Конвенция записи — в features/lessons/source.ts. */
  ipa?: string
}

export interface SlideBase {
  /** Ключ React; если в файле не задан — собирается из типа и номера слайда. */
  id: string
  /** Блоки «ГОВОРИШЬ» из сценария. На слайд не выводятся — только в окно докладчика. */
  notes?: string[]
}

/** Раздел, в который попал слайд: «3 · Знакомство». Считается по порядку слайдов. */
export interface SectionRef {
  section?: string
}

/** Титульный слайд урока. Всё содержимое приходит из метаданных урока. */
export interface TitleSlide extends SlideBase {
  type: 'title'
  course: string
  lessonLabel: string
  topic: string
  agenda?: string[]
}

/** Переходный слайд-заголовок раздела. Номер — по порядку среди разделов. */
export interface SectionSlide extends SlideBase {
  type: 'section'
  number: string
  title: string
  /** Короткая подпись под заголовком (например, инструкция к блоку практики). */
  hint?: string
}

/** Таблица фраз: строки открываются по одной. Не более 5 строк. */
export interface TableSlide extends SlideBase, SectionRef {
  type: 'table'
  title: string
  /** [1, 2] → «1/2» в углу, когда раздел разрезан на несколько слайдов. */
  part?: [number, number]
  /** Подписи колонок: испанская и перевод. Подпись транскрипции — у вьюхи. */
  headers: { es: string; ru: string }
  rows: Phrase[]
}

/** Правило: формула конструкции, пояснение, примеры по одному. */
export interface RuleSlide extends SlideBase, SectionRef {
  type: 'rule'
  title: string
  /** ["quiero", "+", "инфинитив"]: "+" — знак, остальное — плашки. */
  pattern: string[]
  text?: string
  examples: Phrase[]
}

/** Строка спряжения. `es` = stem + ending — собирается при загрузке. */
export interface ConjugationRow extends Phrase {
  pronoun: string
  stem: string
  ending: string
}

/** Спряжение: до 6 строк, открываются по одной, окончания подсвечены. */
export interface ConjugationSlide extends SlideBase, SectionRef {
  type: 'conjugation'
  verb: string
  ru: string
  rows: ConjugationRow[]
}

/** Пункт сравнения: у неверного варианта перевода может не быть. */
export interface CompareItem {
  es: string
  ru?: string
  ipa?: string
}

export interface CompareSide {
  label: string
  /** wrong — ✗ и зачёркивание, right — ✓, без tone — нейтрально. */
  tone?: 'wrong' | 'right'
  items: CompareItem[]
}

/** Сравнение в две колонки; пункты — парами по строкам, строка за шаг. */
export interface CompareSlide extends SlideBase, SectionRef {
  type: 'compare'
  title: string
  left: CompareSide
  right: CompareSide
}

export interface PracticePhrase extends Phrase {
  /** Уточнение к заданию: «вежливо». */
  hint?: string
  /** Другие правильные ответы. */
  alternatives?: string[]
}

/** Практика: русская фраза → таймер паузы → испанский вариант. */
export interface PracticeSlide extends SlideBase {
  type: 'practice'
  /** «Разминка», «Две фразы подряд», «Посложнее» — метка в углу. */
  group: string
  index: number
  total: number
  /** Одна фраза: `ru` (+ `hint`) — задание, `es`, `alternatives` и `ipa` — ответ. */
  phrase: PracticePhrase
  /** Длительность паузы, мс: слайд → группа → по длине фразы. */
  pauseMs: number
}

export interface DialogueLine extends Phrase {
  speaker: string
}

/** Диалог: реплики появляются построчно. */
export interface DialogueSlide extends SlideBase, SectionRef {
  type: 'dialogue'
  title: string
  part?: [number, number]
  lines: DialogueLine[]
}

/** Финальная заставка. */
export interface FinalSlide extends SlideBase {
  type: 'final'
  title: string
  bullets: string[]
  nextTitle: string
  nextText: string
  outro?: string
}

export type Slide =
  | TitleSlide
  | SectionSlide
  | TableSlide
  | RuleSlide
  | ConjugationSlide
  | CompareSlide
  | PracticeSlide
  | DialogueSlide
  | FinalSlide

export type SlideType = Slide['type']

export interface Speaker {
  name: string
  /** CSS-цвет реплик — назначается по порядку, в файле урока его нет. */
  color: string
}

export interface Lesson {
  /** Строковый номер: ключ реестра и часть адреса `#/lesson/1/0/0`. */
  id: string
  /** Сквозной номер в курсе. */
  number: number
  level: string
  /** Номер внутри уровня — как в плане курса. */
  planLesson: number
  title: string
  speakers: Record<string, Speaker>
  slides: Slide[]
}
