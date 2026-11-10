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
 * Практические уроки lessons/practice-NN.json:
 *
 *   - number идут подряд с 1, afterLesson — по порядку курса;
 *   - afterLesson — урок того же уровня, и его файл есть;
 *   - planLesson — номер практики внутри уровня по порядку.
 *
 * Номер в имени файла сверяет сам parse.ts. Заодно проверяются допматериалы
 * extras/*.json (scripts/extras.ts): у каждого есть урок, формат и лимиты
 * соблюдены. Код выхода 1, если есть ошибки.
 */
import { deriveLesson } from '../src/features/lessons/derive.ts'
import { loadExtras } from './extras.ts'
import { LEVEL_RANGES, loadLessons, loadPractices } from './lessons.ts'

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

const { lessons: practices, errors: practiceErrors } = loadPractices(deriveLesson)
errors.push(...practiceErrors)

const lessonNumbers = new Set(lessons.map(({ lesson }) => lesson.number))
const practicesInLevel = new Map<string, number>()
let previousAfter = 0
for (const [index, { file, lesson: practice }] of practices.entries()) {
  const after = practice.afterLesson ?? 0
  const range = LEVEL_RANGES[practice.level]
  if (practice.number !== index + 1) {
    errors.push(`${file}: практики нумеруются подряд с 1, а перед ней их ${index}`)
  }
  if (!range || after < range.first || after > range.last) {
    errors.push(`${file}: afterLesson = ${after} — это не урок уровня ${practice.level}`)
  } else if (!lessonNumbers.has(after)) {
    errors.push(`${file}: afterLesson = ${after}, а файла урока ${after} нет — словарь не проверить`)
  }
  if (after < previousAfter) {
    errors.push(`${file}: стоит после урока ${after}, а предыдущая практика — после ${previousAfter}`)
  }
  previousAfter = after

  const planLesson = (practicesInLevel.get(practice.level) ?? 0) + 1
  practicesInLevel.set(practice.level, planLesson)
  if (practice.planLesson !== planLesson) {
    errors.push(
      `${file}: planLesson = ${practice.planLesson}, а это практика ${planLesson} уровня ${practice.level}`,
    )
  }
}

const { extras, errors: extraErrors } = loadExtras(lessons.map(({ lesson }) => lesson))
errors.push(...extraErrors)

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`)
  console.error(`\nОшибок: ${errors.length}`)
  process.exit(1)
}
console.log(
  `✓ Уроков: ${lessons.length}, практик: ${practices.length}, доп. материалов: ${extras.length}, ошибок нет`,
)
