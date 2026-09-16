import { lessonList } from '../lessons/registry'
import { useSettings } from '../settings/useSettings'
import { SlideView } from '../slides/SlideView'
import { Stage } from '../slides/Stage'
import { deckHash, presenterHash } from '../slides/route'
import type { Lesson, TitleSlide } from '../slides/types'

/** Миниатюра титульного слайда: 1920×1080 → 384×216. */
const THUMB_SCALE = 0.2

/**
 * Список уроков — то, что открывается по пустому адресу. Единственный экран,
 * который никогда не попадает в кадр, поэтому здесь можно показывать интерфейс.
 */
export function HomeScreen() {
  // Вызов ради темы: она выставляется атрибутом data-theme на <html>.
  useSettings()

  const course = titleOf(lessonList[0])?.course

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontSize: 15,
      }}
    >
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '56px 24px 72px' }}>
        <header style={{ marginBottom: 36 }}>
          {course ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              {course}
            </div>
          ) : null}
          <h1
            style={{ margin: '12px 0 0', fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            Уроки
          </h1>
          <p style={{ margin: '10px 0 0', color: 'var(--text-3)' }}>
            {lessonList.length} {plural(lessonList.length, 'урок', 'урока', 'уроков')} в папке
            lessons/
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {lessonList.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>

        <footer style={{ marginTop: 40, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>
          В уроке: → / Space — вперёд · ← — назад · Home / End — первый / последний слайд ·
          T — транскрипция · R — перевод · A — аудио · F — полный экран · G — зона камеры ·
          B — полоска прогресса · P — окно докладчика · Esc — назад к этому списку.
        </footer>
      </div>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const title = titleOf(lesson)
  const sections = lesson.slides.flatMap((slide) => (slide.type === 'section' ? [slide.title] : []))
  const options = { transcription: true, translation: true, speakers: lesson.speakers }

  return (
    <article
      className="lesson-card"
      style={{
        background: 'var(--bg-panel)',
        border: '2px solid var(--rule)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <a
        href={deckHash(lesson.id, 0, 0)}
        style={{
          display: 'flex',
          gap: 22,
          alignItems: 'flex-start',
          padding: 18,
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            flex: 'none',
            width: 1920 * THUMB_SCALE,
            height: 1080 * THUMB_SCALE,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--rule)',
          }}
        >
          {title ? (
            <Stage fixedScale={THUMB_SCALE}>
              <SlideView slide={title} step={0} options={options} />
            </Stage>
          ) : null}
        </div>

        <div style={{ minWidth: 0, paddingTop: 4 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            Урок {lesson.number} · {lesson.level}, урок {lesson.planLesson}
          </div>
          <h2
            style={{
              margin: '8px 0 0',
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            {lesson.title}
          </h2>
          <div style={{ marginTop: 8, color: 'var(--text-3)' }}>
            {lesson.slides.length}{' '}
            {plural(lesson.slides.length, 'слайд', 'слайда', 'слайдов')}
            {sections.length > 0
              ? ` · ${sections.length} ${plural(sections.length, 'раздел', 'раздела', 'разделов')}`
              : ''}
          </div>

          {sections.length > 0 ? (
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sections.map((section, index) => (
                <span
                  key={`${index}-${section}`}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    background: 'var(--bg-panel-alt)',
                    border: '1px solid var(--rule)',
                    borderRadius: 999,
                    padding: '5px 12px',
                  }}
                >
                  {section}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </a>

      {/* Кнопка — соседом ссылки, а не внутри: интерактивное в интерактивном не вкладывают. */}
      <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            window.open(
              `${window.location.pathname}${presenterHash(lesson.id)}`,
              'video-lessons-presenter',
              'width=1280,height=860',
            )
          }}
          style={{
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-2)',
            background: 'var(--bg)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            padding: '7px 13px',
            cursor: 'pointer',
          }}
        >
          Окно докладчика
        </button>
      </div>
    </article>
  )
}

function titleOf(lesson: Lesson | undefined): TitleSlide | undefined {
  return lesson?.slides.find((slide) => slide.type === 'title')
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
