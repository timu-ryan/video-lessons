/**
 * Палитры оформления — единственное место, где живут цвета. Ключ палитры
 * один на всё: слайды, окно докладчика и список уроков (настройка theme,
 * клавиша C) и PDF-конспекты (`--theme=…` или HANDOUTS.theme
 * в scripts/handouts.config.ts).
 *
 * screen — CSS-переменные приложения, print — конспектов. Компоненты
 * и стили конспектов знают только имена переменных, поэтому новая палитра —
 * это одна запись в THEMES.
 */

type ScreenVar =
  | 'bg' // фон слайда
  | 'bg-panel' // карточки, плашки
  | 'bg-panel-alt' // подложка: дорожка паузы, теги
  | 'rule' // линии, разделители
  | 'text' // заголовки и текст
  | 'text-2' // перевод
  | 'text-3' // транскрипция, служебное
  | 'es' // испанский текст: строки таблиц, примеры, реплики
  | 'accent' // акцент текстом: ответ практики, подписи, окончания
  | 'accent-2' // второй акцент: правая колонка сравнения, группа практики
  | 'accent-soft' // плашки формулы, номер раздела
  | 'mark' // выделенное **…**
  | 'mark-bg' // подсветка под выделенным
  | 'mark-bg-ok' // она же в верной колонке сравнения
  | 'mark-bg-bad' // и в неверной — чтобы ошибка не выглядела как образец
  | 'bar' // черта под заголовком, полоска прогресса
  | 'bar-2' // полоска паузы на практике
  | 'badge' // плашка «Урок N»
  | 'on-badge' // текст на ней
  | 'speaker-a'
  | 'speaker-b'
  | 'speaker-c'
  | 'ok'
  | 'bad'
  | 'bad-soft'
  | 'shadow'

type PrintVar =
  | 'text' // основной текст
  | 'text-2' // подписи, пояснения
  | 'text-3' // служебное: транскрипция, номера, шапки таблиц, подвал
  | 'ru' // перевод
  | 'es' // испанский
  | 'heading' // заголовки разделов
  | 'accent' // ссылки, метки
  | 'mark' // выделенное **…**
  | 'mark-bg' // подсветка под ним
  | 'mark-bg-ok' // она же в верной колонке сравнения
  | 'mark-bg-bad' // и в неверной
  | 'mark-line' // подчёркивание под ним
  | 'bar' // черта под шапкой, полосы слева у блоков
  | 'chip' // плашки формулы
  | 'note' // фон правила и заметок
  | 'rule' // линии таблиц, рамки
  | 'rule-strong' // линия под шапкой таблицы, пунктир
  | 'ok'
  | 'bad'

export type ScreenPalette = Record<ScreenVar, string>
export type PrintPalette = Record<PrintVar, string>

interface Theme {
  /** Название в окне докладчика. */
  label: string
  screen: ScreenPalette
  /** Нет у тёмной: тёмный конспект не печатают. */
  print?: PrintPalette
}

/** Песочная: тёплый фон, терракотовый и шафрановый акценты. */
const SAND: Theme = {
  label: 'Песок',
  screen: {
    bg: '#faf6f0',
    'bg-panel': '#f3ece2',
    'bg-panel-alt': '#ede4d8',
    rule: '#ddd0be',
    text: '#1a1512',
    'text-2': '#5c5249',
    'text-3': '#8a7f73',
    es: 'var(--text)',
    accent: '#b4471f',
    'accent-2': '#b07a12',
    'accent-soft': '#f0e0d3',
    mark: 'var(--accent)',
    'mark-bg': 'transparent',
    'mark-bg-ok': 'transparent',
    'mark-bg-bad': 'transparent',
    bar: 'var(--accent)',
    'bar-2': 'var(--accent-2)',
    badge: 'var(--accent)',
    'on-badge': 'var(--bg)',
    'speaker-a': '#b4471f',
    'speaker-b': '#1f6b6b',
    'speaker-c': '#6b4a8a',
    ok: '#2f6b3f',
    bad: '#a5231d',
    'bad-soft': '#f6e2e0',
    shadow: '0 8px 40px rgb(26 21 18 / 0.07)',
  },
  print: {
    text: '#1a1a1a',
    'text-2': '#555',
    'text-3': '#777',
    ru: '#444',
    es: 'var(--text)',
    heading: '#b8452e',
    accent: '#b8452e',
    mark: '#b8452e',
    'mark-bg': 'transparent',
    'mark-bg-ok': 'transparent',
    'mark-bg-bad': 'transparent',
    'mark-line': '#b8452e',
    bar: '#b8452e',
    chip: '#f3dcd5',
    note: '#faf0ec',
    rule: '#ddd',
    'rule-strong': '#999',
    ok: '#2e7d32',
    bad: '#b3261e',
  },
}

const NIGHT: Theme = {
  label: 'Ночь',
  screen: {
    bg: '#14100e',
    'bg-panel': '#1e1815',
    'bg-panel-alt': '#241d19',
    rule: '#3a2f28',
    text: '#f5efe8',
    'text-2': '#c3b6aa',
    'text-3': '#8e837a',
    es: 'var(--text)',
    accent: '#e2643c',
    'accent-2': '#e8b04b',
    'accent-soft': '#33231b',
    mark: 'var(--accent)',
    'mark-bg': 'transparent',
    'mark-bg-ok': 'transparent',
    'mark-bg-bad': 'transparent',
    bar: 'var(--accent)',
    'bar-2': 'var(--accent-2)',
    badge: 'var(--accent)',
    'on-badge': 'var(--bg)',
    'speaker-a': '#e2643c',
    'speaker-b': '#5fb3b3',
    'speaker-c': '#b492d8',
    ok: '#6dc088',
    bad: '#e8756c',
    'bad-soft': '#2e1c1a',
    shadow: '0 8px 40px rgb(0 0 0 / 0.45)',
  },
}

// --- кандидаты: смотрим на слайдах, выбираем одну, остальные удаляем -------

/**
 * Vino y oro: бордо и золото — затемнённые красный и жёлтый флага. Испанский —
 * Vino, перевод — приглушённый, черты — Oro, грамматика подсвечена Oro claro.
 * Ошибки красные, поэтому отличаются не только цветом: ✗ и зачёркивание.
 */
const VINO_COLORS = {
  fondo: '#F7F6F6', // фон обложек, слайдов, сайта — нейтральный, без желтизны
  superficie: '#FFFFFF', // карточки, плашки с фразами, фон PDF
  base: '#EFE6E8', // подложка: панель за фото, блоки с правилами
  linea: '#DCD6D8', // обводки, разделители
  texto: '#2A1E22', // заголовки и текст (14.9:1)
  apagado: '#6E6367', // метка серии, подписи, перевод (5.3:1)
  vino: '#7D2933', // счётчик, кнопки, испанский текст (8.7:1)
  vinoOscuro: '#5E1F27', // наведение, акцентные заголовки
  oro: '#E5BE55', // подчёркивания, плитка, маркеры; текстом на светлом — нельзя
  oroClaro: '#F7E8BE', // подсветка грамматики, фон заметок
  oroOscuro: '#7A5A0E', // золото текстом (5.9:1)
  ok: '#2E7D5B',
  okSoft: '#E4F2EA',
  bad: '#C62828',
  badSoft: '#FBE4E4',
} as const

const V = VINO_COLORS

const VINO: Theme = {
  label: 'Vino y oro',
  screen: {
    bg: V.fondo,
    'bg-panel': V.superficie,
    'bg-panel-alt': V.base,
    rule: V.linea,
    text: V.texto,
    'text-2': V.apagado,
    'text-3': V.apagado,
    es: V.vino,
    accent: V.vino,
    'accent-2': V.oroOscuro,
    'accent-soft': V.base,
    mark: V.vino,
    'mark-bg': V.oroClaro,
    'mark-bg-ok': V.okSoft,
    'mark-bg-bad': V.badSoft,
    bar: V.oro,
    'bar-2': V.oro,
    badge: V.vino,
    'on-badge': V.superficie,
    'speaker-a': V.vino,
    'speaker-b': V.oroOscuro,
    'speaker-c': V.apagado,
    ok: V.ok,
    bad: V.bad,
    'bad-soft': V.badSoft,
    shadow: '0 8px 40px rgb(42 30 34 / 0.07)',
  },
  print: {
    text: V.texto,
    'text-2': V.apagado,
    'text-3': V.apagado,
    ru: V.apagado,
    es: V.vino,
    heading: V.vinoOscuro,
    accent: V.vino,
    mark: V.vino,
    'mark-bg': V.oroClaro,
    'mark-bg-ok': V.okSoft,
    'mark-bg-bad': V.badSoft,
    'mark-line': V.oro,
    bar: V.oro,
    chip: V.oroClaro,
    note: V.oroClaro,
    rule: V.linea,
    // Между линией и приглушённым текстом: отдельного цвета в палитре нет
    'rule-strong': `color-mix(in srgb, ${V.linea}, ${V.apagado})`,
    ok: V.ok,
    bad: V.bad,
  },
}

/**
 * Sorolla: валенсийское море и солнце — лазурь и бирюза на тёплом белом.
 * Текстом только холодные цвета, солнце — жёлтой полоской паузы. «Верно» —
 * основным синим: на слайде с ошибкой два цвета, а не три.
 */
const SOROLLA = {
  label: 'Sorolla',
  screen: {
    bg: '#FFFCF6',
    'bg-panel': '#FFFFFF',
    'bg-panel-alt': '#F3EDE1',
    rule: '#E6DDCB',
    text: '#10202E',
    'text-2': '#4F5A63',
    'text-3': '#858B8F',
    es: 'var(--text)',
    accent: '#0077C8',
    'accent-2': '#00796B',
    'accent-soft': '#DDEFFC',
    mark: 'var(--accent)',
    'mark-bg': 'transparent',
    'mark-bg-ok': 'transparent',
    'mark-bg-bad': 'transparent',
    bar: '#00A6D6',
    'bar-2': '#F5A524',
    badge: 'var(--accent)',
    'on-badge': '#FFFFFF',
    'speaker-a': '#0077C8',
    'speaker-b': '#00796B',
    'speaker-c': '#6D4CC2',
    ok: 'var(--accent)',
    bad: '#C0392B',
    'bad-soft': '#FBE3DF',
    shadow: '0 8px 40px rgb(16 32 46 / 0.07)',
  },
  print: {
    text: '#10202E',
    'text-2': '#4F5A63',
    'text-3': '#6B7177',
    ru: '#3F4A52',
    es: 'var(--text)',
    heading: '#0077C8',
    accent: '#0077C8',
    mark: '#0069B0',
    'mark-bg': 'transparent',
    'mark-bg-ok': 'transparent',
    'mark-bg-bad': 'transparent',
    'mark-line': '#00A6D6',
    bar: '#00A6D6',
    chip: '#DDEFFC',
    note: '#FFF6E3',
    rule: '#E3DCCB',
    'rule-strong': '#A69E8C',
    ok: 'var(--accent)',
    bad: '#C0392B',
  },
} satisfies Theme

/** Sorolla 2: та же палитра, синий чуть темнее. */
const SOROLLA_2: Theme = {
  label: 'Sorolla 2',
  screen: {
    ...SOROLLA.screen,
    accent: '#0062A8',
    'accent-soft': '#D9E9F7',
    bar: '#0090C4',
    'speaker-a': '#0062A8',
  },
  print: {
    ...SOROLLA.print,
    heading: '#0062A8',
    accent: '#0062A8',
    mark: '#005A9C',
    'mark-line': '#0090C4',
    bar: '#0090C4',
  },
}

/** Sorolla 3: синий ещё темнее. */
const SOROLLA_3: Theme = {
  label: 'Sorolla 3',
  screen: {
    ...SOROLLA.screen,
    accent: '#00548F',
    'accent-soft': '#D6E5F3',
    bar: '#0080B8',
    'speaker-a': '#00548F',
  },
  print: {
    ...SOROLLA.print,
    heading: '#00548F',
    accent: '#00548F',
    mark: '#004E85',
    'mark-line': '#0080B8',
    bar: '#0080B8',
  },
}

export const THEMES = {
  sand: SAND,
  sorolla: SOROLLA,
  sorolla2: SOROLLA_2,
  sorolla3: SOROLLA_3,
  vino: VINO,
  night: NIGHT,
} satisfies Record<string, Theme>

export type ThemeName = keyof typeof THEMES

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[]

export const DEFAULT_THEME: ThemeName = 'sand'

export const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && Object.hasOwn(THEMES, value)

/** Следующая палитра по кругу — для клавиши C. */
export const nextTheme = (theme: ThemeName): ThemeName =>
  THEME_NAMES[(THEME_NAMES.indexOf(theme) + 1) % THEME_NAMES.length] as ThemeName

/** `--bg: #…; --text: #…;` — тело CSS-правила. */
export const cssVars = (palette: ScreenPalette | PrintPalette): string =>
  Object.entries(palette)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(' ')

/**
 * Таблица стилей всех экранных палитр: активная выбирается атрибутом
 * data-theme на <html>, без атрибута действует палитра по умолчанию.
 */
export function screenCss(): string {
  const rules = THEME_NAMES.map(
    (name) => `[data-theme='${name}'] { ${cssVars(THEMES[name].screen)} }`,
  )
  return [`:root { ${cssVars(THEMES[DEFAULT_THEME].screen)} }`, ...rules].join('\n')
}
