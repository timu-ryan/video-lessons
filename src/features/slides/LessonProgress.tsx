import { useLayoutEffect, useRef } from 'react'
import { lessons } from '../lessons/registry'
import { LEVELS, type Level } from '../lessons/source'
import { PAD_TOP, SAFE_X, SAFE_Y } from './canvas'
import type { Lesson } from './types'
import './LessonProgress.css'

/** Количество обычных уроков по docs/course-plan.md. */
const LESSON_TOTALS: Partial<Record<Level, number>> = { A0: 14, A1: 26, A2: 25, B1: 20 }

export function LessonProgress({ lesson, slideIndex }: { lesson: Lesson; slideIndex: number }) {
  const { sections, level } = lesson
  const levelIndex = LEVELS.indexOf(level)
  const practice = lesson.kind === 'practice'
  const previousLesson = lesson.afterLesson === undefined ? undefined : lessons[lesson.afterLesson]
  const linkedNumber = previousLesson?.level === level ? previousLesson.planLesson : undefined
  const lessonNumber = practice ? linkedNumber : lesson.planLesson
  const total = LESSON_TOTALS[level]
  const progress = total && lessonNumber ? Math.min(1, lessonNumber / total) : 0
  const counter = practice ? `Практика ${lesson.planLesson}` : `Урок ${lesson.planLesson}`
  const denominator = !practice && total && lesson.planLesson <= total ? `/${total}` : ''

  const activeSection = lesson.slides[slideIndex]?.type === 'final'
    ? sections.length
    : sections.findLastIndex((section) => section.slideIndex <= slideIndex)
  const listRef = useRef<HTMLOListElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const active = list.children[activeSection]
    if (!(active instanceof HTMLElement)) {
      list.scrollTop = activeSection < 0 ? 0 : list.scrollHeight
      return
    }

    const minTop = active.offsetTop + active.offsetHeight - list.clientHeight
    list.scrollTop = Math.min(active.offsetTop, Math.max(minTop, list.scrollTop))
  }, [activeSection, sections])

  return (
    <aside
      aria-label="Прогресс по курсу и уроку"
      className="lesson-progress"
      style={{
        top: PAD_TOP,
        left: SAFE_X + 72,
        right: 72,
        maxHeight: SAFE_Y - PAD_TOP,
      }}
    >
      <ol className="lesson-progress-levels" role="list" aria-label="Уровни курса">
        {LEVELS.map((item, index) => {
          const current = index === levelIndex
          const fill = current ? progress : Number(index < levelIndex)
          return (
            <li key={item} aria-current={current ? 'step' : undefined}>
              <span>{item}</span>
              <span className="lesson-progress-track" aria-hidden="true">
                <span style={{ width: `${fill * 100}%` }} />
              </span>
            </li>
          )
        })}
      </ol>
      <div className="lesson-progress-counter">
        {counter}
        {denominator}
      </div>
      {sections.length > 0 ? (
        <ol
          ref={listRef}
          className="lesson-progress-sections"
          role="list"
          aria-label="Разделы урока"
        >
          {sections.map((section, index) => {
            const current = index === activeSection
            const done = index < activeSection
            return (
              <li
                key={section.slideIndex}
                aria-current={current ? 'step' : undefined}
                data-done={done || undefined}
              >
                <span className="lesson-progress-marker" aria-hidden="true" />
                <span aria-label={done ? `${section.title}, пройдено` : undefined}>
                  {section.title}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}
    </aside>
  )
}
