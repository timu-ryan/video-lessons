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
  /** Испанский — переносится из сценария дословно. */
  es: string
  /** Перевод. */
  ru: string
  /** Транскрипция в МФА (IPA). Конвенция записи — в features/lessons/source.ts. */
  ipa?: string
  /** Имя аудиофайла: public/audio/<audioDir>/<audioId>.mp3 */
  audioId?: string
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

/** Практика: русская фраза → таймер паузы → испанский вариант + аудио. */
export interface PracticeSlide extends SlideBase {
  type: 'practice'
  /** «Разминка», «Две фразы подряд», «Посложнее» — метка в углу. */
  group: string
  index: number
  total: number
  /** Одна фраза: `ru` — задание, `es` и `ipa` — ответ. */
  phrase: Phrase
  /** Длительность паузы, мс — из группы практики. */
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

/**
 * Что именно неверно. Вьюха подаёт каждый вид по-своему: транскрипцию
 * набирает шрифтом МФА, у ложного друга в `right` стоит значение, а не фраза.
 */
export type MistakeKind = 'pronunciation' | 'grammar' | 'false-friend' | 'usage'

/** Разбор ошибки: неверно (✗, зачёркнуто) → верно (✓) → пояснение. */
export interface MistakeSlide extends SlideBase, SectionRef {
  type: 'mistake'
  kind: MistakeKind
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
  /** CSS-цвет реплик — назначается по порядку, в файле урока его нет. */
  color: string
}

export interface Lesson {
  /** Строковый номер: ключ реестра и часть адреса `#/lesson/1/0/0`. */
  id: string
  number: number
  title: string
  /** Папка с озвучкой: public/audio/<audioDir>/ */
  audioDir: string
  speakers: Record<string, Speaker>
  slides: Slide[]
}
