/**
 * Проверка всех lessons/*.json: `npm run lessons:validate`.
 *
 * Урок загружается ровно так же, как в приложении (parse.ts → derive.ts),
 * поэтому ошибка здесь = урок не откроется. Сверх этого проверяется
 * нумерация, которую приложение не знает:
 *
 *   - number попадает в диапазон своего уровня (A0 — 1–14, A1 — 15–39,
 *     A2 — 40–64, B1 — 65–84);
 *   - planLesson = number − начало уровня + 1;
 *   - пара level + planLesson не повторяется.
 *
 * Номер в имени файла сверяет сам parse.ts. Код выхода 1, если есть ошибки.
 */
import { deriveLesson } from '../src/features/lessons/derive.ts'
import { LEVEL_RANGES, loadLessons } from './lessons.ts'

const { lessons, errors } = loadLessons(deriveLesson)

const byPlan = new Map<string, string>()
for (const { file, lesson } of lessons) {
  const range = LEVEL_RANGES[lesson.level]
  if (!range) {
    errors.push(`${file}: для уровня ${lesson.level} в плане курса нет уроков`)
  } else if (lesson.number < range.first || lesson.number > range.last) {
    errors.push(
      `${file}: number = ${lesson.number}, а уроки ${lesson.level} — ${range.first}–${range.last}`,
    )
  } else {
    const planLesson = lesson.number - range.first + 1
    if (lesson.planLesson !== planLesson) {
      errors.push(
        `${file}: planLesson = ${lesson.planLesson}, а урок ${lesson.number} — это ${lesson.level}, урок ${planLesson}`,
      )
    }
  }

  const key = `${lesson.level}-${lesson.planLesson}`
  const other = byPlan.get(key)
  if (other !== undefined) {
    errors.push(`${file}: ${lesson.level}, урок ${lesson.planLesson} — уже есть в ${other}`)
  } else {
    byPlan.set(key, file)
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error(`\nОшибок: ${errors.length}`)
  process.exit(1)
}
console.log(`✓ Уроков: ${lessons.length}, ошибок нет`)
