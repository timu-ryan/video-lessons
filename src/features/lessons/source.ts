/**
 * Форма файла урока — то, что лежит в lessons/lesson-NN.json.
 *
 * Правило одно: в файле нет ничего, что можно вычислить. Нумерация практики
 * и ошибок, разбивка раздела на «1/2», название раздела на каждом слайде,
 * оглавление на титуле, длительность паузы — всё это считает derive.ts
 * по порядку слайдов. Вставка фразы в середину урока ничего не ломает.
 *
 * ────────────────────────────────────────────────────────────────────────
 * КОНВЕНЦИЯ ТРАНСКРИПЦИИ (поле `ipa`)
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
export const SCHEMA_VERSION = 1

export interface PhraseSource {
  es: string
  ru: string
  ipa?: string
  /** Имя аудиофайла без расширения. Одно соглашение на все типы слайдов. */
  audioId?: string
}

export interface DialogueLineSource extends PhraseSource {
  /** Ключ из `speakers` урока. */
  speaker: string
}

export interface SlideSourceBase {
  /** Необязателен: если не задан, собирается из типа и номера слайда. */
  id?: string
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

export interface TableSlideSource extends SlideSourceBase {
  type: 'table'
  title: string
  /** Переопределение подписей колонок, можно частичное. */
  headers?: { es?: string; ru?: string }
  rows: PhraseSource[]
}

export interface PracticeSlideSource extends SlideSourceBase {
  type: 'practice'
  /** Имя группы из `practiceGroups` урока — оттуда же берётся пауза. */
  group: string
  phrase: PhraseSource
}

export interface DialogueSlideSource extends SlideSourceBase {
  type: 'dialogue'
  title: string
  lines: DialogueLineSource[]
}

export interface MistakeSlideSource extends SlideSourceBase {
  type: 'mistake'
  kind: 'pronunciation' | 'grammar' | 'false-friend' | 'usage'
  wrong: string
  when?: string
  right: string
  note: string
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
  | PracticeSlideSource
  | DialogueSlideSource
  | MistakeSlideSource
  | FinalSlideSource

export interface PracticeGroupSource {
  name: string
  /** Пауза перед ответом, мс. */
  pauseMs: number
}

export interface LessonSource {
  schemaVersion: number
  /** Номер урока; он же в имени файла. Отдельного `id` нет. */
  number: number
  title: string
  /** Название курса — на титульный слайд. */
  course: string
  audioDir: string
  /** Ключ → имя персонажа. Цвет назначает рендерер. */
  speakers: Record<string, string>
  /** Подписи колонок таблиц по умолчанию. */
  tableHeaders: { es: string; ru: string }
  practiceGroups: PracticeGroupSource[]
  slides: SlideSource[]
}
