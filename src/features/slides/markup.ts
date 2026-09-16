/**
 * Выделение нового прямо в строке: "Quiero **aprender** español.".
 * Звёздочки парные, вложенности нет — парность проверяет parse.ts при загрузке.
 */

export interface MarkedPart {
  text: string
  marked: boolean
}

const MARK = '**'

/** "Quiero **aprender** español." → Quiero · aprender (выделено) · español. */
export function splitMarks(text: string): MarkedPart[] {
  return text
    .split(MARK)
    .map((part, index) => ({ text: part, marked: index % 2 === 1 }))
    .filter((part) => part.text !== '')
}

/** Строка без разметки — для подписей, длины фразы, окна докладчика. */
export function plainText(text: string): string {
  return text.split(MARK).join('')
}

/** Нечётное число `**` значит, что выделение не закрыто. */
export function hasUnclosedMark(text: string): boolean {
  return (text.split(MARK).length - 1) % 2 === 1
}
