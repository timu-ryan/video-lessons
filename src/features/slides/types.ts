/** Типы контента урока. Компоненты знают только эти типы, но не сам урок. */

/** Испанская единица. `id` — имя аудиофайла: public/audio/<audioDir>/<id>.mp3 */
export interface Phrase {
  id: string
  /** Испанский — переносится из сценария дословно. */
  es: string
  /** Транскрипция русскими буквами, с ударением. */
  tr: string
  /** Перевод. */
  ru: string
}

export interface SlideBase {
  id: string
  /** Блоки «ГОВОРИШЬ» из сценария. На слайд не выводятся — только в окно докладчика. */
  notes?: string[]
}

/** Титульный слайд урока. */
export interface TitleSlide extends SlideBase {
  type: 'title'
  course: string
  lessonLabel: string
  topic: string
  agenda?: string[]
}

/** Переходный слайд-заголовок раздела. */
export interface SectionSlide extends SlideBase {
  type: 'section'
  number: string
  title: string
  /** Короткая подпись под заголовком (например, инструкция к блоку практики). */
  hint?: string
}

/** Таблица фраз: строки открываются по одной. Не более 5 строк. */
export interface TableSlide extends SlideBase {
  type: 'table'
  section?: string
  title: string
  /** [1, 2] → «1/2» в углу, когда раздел разрезан на несколько слайдов. */
  part?: [number, number]
  headers: [string, string, string]
  rows: Phrase[]
}

/** Практика: русская фраза → таймер паузы → испанский вариант + аудио. */
export interface PracticeSlide extends SlideBase {
  type: 'practice'
  /** «Разминка», «Две фразы подряд», «Посложнее» — метка в углу. */
  group: string
  index: number
  total: number
  ru: string
  answer: Phrase
  /** Длительность паузы, мс. По умолчанию 4000. */
  pauseMs?: number
}

export interface DialogueLine {
  speaker: string
  es: string
  ru: string
  audioId?: string
}

/** Диалог: реплики появляются построчно. */
export interface DialogueSlide extends SlideBase {
  type: 'dialogue'
  section?: string
  title: string
  part?: [number, number]
  lines: DialogueLine[]
}

/** Разбор ошибки: неверно (✗, зачёркнуто) → верно (✓) → пояснение. */
export interface MistakeSlide extends SlideBase {
  type: 'mistake'
  section?: string
  index: number
  total: number
  wrong: string
  /** Условие, при котором это ошибка («если вы девушка», «в 7 вечера»). */
  when?: string
  right: string
  note: string
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
  | PracticeSlide
  | DialogueSlide
  | MistakeSlide
  | FinalSlide

export type SlideType = Slide['type']

export interface Speaker {
  name: string
  /** CSS-цвет реплик персонажа. */
  color: string
}

export interface Lesson {
  id: string
  number: number
  title: string
  /** Папка с озвучкой: public/audio/<audioDir>/ */
  audioDir: string
  speakers: Record<string, Speaker>
  slides: Slide[]
}
