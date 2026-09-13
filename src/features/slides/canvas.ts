/**
 * Все слайды рисуются в фиксированном холсте 1920×1080 и масштабируются
 * целиком. Любой размер в компонентах — это пиксели ЭТОГО холста, а не
 * экрана, поэтому «56px» на телефоне остаётся теми же 56px из макета.
 */
export const CANVAS_W = 1920
export const CANVAS_H = 1080

/** Правый нижний угол под камеру: туда не заезжает ни один элемент. */
export const CAMERA_W = 520
export const CAMERA_H = 380

/** Запас вокруг камеры — контент останавливаем чуть раньше её границы. */
export const CAMERA_MARGIN = 32

/** Левая граница «запретной» колонки и верхняя граница «запретной» полосы. */
export const SAFE_X = CANVAS_W - CAMERA_W - CAMERA_MARGIN // 1368
export const SAFE_Y = CANVAS_H - CAMERA_H - CAMERA_MARGIN // 668

/** Поля холста. */
export const PAD_X = 96
export const PAD_TOP = 64

/**
 * Ширина колонки контента, безопасная на ЛЮБОЙ высоте слайда:
 * от левого поля до начала камерной колонки.
 */
export const SAFE_COL_W = SAFE_X - PAD_X // 1272

/** Ширина, доступная только выше камерной полосы (шапки, титулы). */
export const FULL_COL_W = CANVAS_W - PAD_X * 2 // 1728
