import { useEffect, useMemo, useRef, useState } from 'react'
import { probeAudio } from '../audio/audio'
import { SlideView } from '../slides/SlideView'
import { Stage } from '../slides/Stage'
import { slideLabel, slidePhrases, stepCount } from '../slides/steps'
import type { Lesson } from '../slides/types'
import { useHotkeys } from '../slides/useHotkeys'
import type { DeckState, NavAction, PresenterMessage } from './channel'
import { formatElapsed, openChannel, readStartedAt } from './channel'

const THUMB_SCALE = 0.29

/**
 * Второе окно: его не записывают. Здесь можно и нужно показывать интерфейс —
 * текущий и следующий слайд, текст «что говоришь», таймер, наличие озвучки.
 */
export function PresenterApp({ lesson }: { lesson: Lesson }) {
  const [state, setState] = useState<DeckState>(() => ({
    lessonId: lesson.id,
    slideIndex: 0,
    step: 0,
    transcription: true,
    translation: true,
    startedAt: readStartedAt(),
  }))
  const [now, setNow] = useState(() => Date.now())
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const channel = openChannel()
    channelRef.current = channel
    if (!channel) return
    const onMessage = (event: MessageEvent<PresenterMessage>) => {
      if (event.data.kind === 'state') setState(event.data.state)
    }
    channel.addEventListener('message', onMessage)
    channel.postMessage({ kind: 'hello' } satisfies PresenterMessage)
    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

  const send = (action: NavAction) => {
    channelRef.current?.postMessage({ kind: 'nav', action } satisfies PresenterMessage)
  }

  useHotkeys({
    next: () => send('next'),
    prev: () => send('prev'),
    first: () => send('first'),
    last: () => send('last'),
  })

  const slide = lesson.slides[Math.min(state.slideIndex, lesson.slides.length - 1)]
  const nextSlide = lesson.slides[state.slideIndex + 1]
  const options = useMemo(
    () => ({
      transcription: state.transcription,
      translation: state.translation,
      speakers: lesson.speakers,
    }),
    [state.transcription, state.translation, lesson.speakers],
  )

  if (!slide) return null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontSize: 15,
        overflowY: 'auto',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>
          Слайд {state.slideIndex + 1}
          <span style={{ color: 'var(--text-3)' }}> / {lesson.slides.length}</span>
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-3)' }}>
          шаг {state.step + 1} / {stepCount(slide)}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 15, color: 'var(--text-3)' }}>
          {state.transcription ? 'T: транскрипция вкл' : 'T: транскрипция выкл'} ·{' '}
          {state.translation ? 'R: перевод вкл' : 'R: перевод выкл'}
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--accent)',
          }}
        >
          {formatElapsed(now - state.startedAt)}
        </div>
        <button
          type="button"
          onClick={() =>
            channelRef.current?.postMessage({ kind: 'reset-timer' } satisfies PresenterMessage)
          }
          style={{
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-2)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Сбросить
        </button>
      </header>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div>
          <Caption>Сейчас — {slideLabel(slide)}</Caption>
          <Frame>
            <Stage fixedScale={THUMB_SCALE}>
              <SlideView slide={slide} step={state.step} options={options} />
            </Stage>
          </Frame>
        </div>
        <div style={{ opacity: 0.75 }}>
          <Caption>Дальше{nextSlide ? ` — ${slideLabel(nextSlide)}` : ''}</Caption>
          <Frame>
            {nextSlide ? (
              <Stage fixedScale={THUMB_SCALE}>
                <SlideView slide={nextSlide} step={0} options={options} />
              </Stage>
            ) : (
              <div
                style={{
                  width: 1920 * THUMB_SCALE,
                  height: 1080 * THUMB_SCALE,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-3)',
                }}
              >
                конец урока
              </div>
            )}
          </Frame>
        </div>
      </div>

      <section
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          padding: '18px 22px',
        }}
      >
        <Caption>Что говоришь</Caption>
        {slide.notes?.length ? (
          slide.notes.map((note, index) => (
            <p
              key={index}
              style={{ margin: '10px 0 0', fontSize: 19, lineHeight: 1.5, fontWeight: 500 }}
            >
              {note}
            </p>
          ))
        ) : (
          <p style={{ margin: '10px 0 0', color: 'var(--text-3)' }}>— заметок нет —</p>
        )}
      </section>

      <AudioStatus lesson={lesson} slideId={slide.id} ids={slidePhrases(slide).map((p) => p.id)} />

      <footer style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
        → / Space / PageDown — вперёд · ← / PageUp — назад · Home / End — первый / последний ·
        T — транскрипция · R — перевод · A — аудио · F — полный экран · G — зона камеры ·
        B — полоска прогресса · P — это окно
      </footer>
    </div>
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-3)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 1920 * THUMB_SCALE,
        height: 1080 * THUMB_SCALE,
        border: '1px solid var(--rule)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {children}
    </div>
  )
}

/** Есть ли озвучка для фраз слайда — чтобы не удивляться тишине на записи. */
function AudioStatus({
  lesson,
  slideId,
  ids,
}: {
  lesson: Lesson
  slideId: string
  ids: string[]
}) {
  const [found, setFound] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let alive = true
    setFound({})
    void Promise.all(
      ids.map(async (id) => [id, await probeAudio(lesson.audioDir, id)] as const),
    ).then((pairs) => {
      if (alive) setFound(Object.fromEntries(pairs))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId, lesson.audioDir])

  if (ids.length === 0) return null

  return (
    <section style={{ fontSize: 14 }}>
      <Caption>Озвучка ({lesson.audioDir})</Caption>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ids.map((id) => {
          const ok = found[id]
          return (
            <span
              key={id}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontWeight: 600,
                border: '1px solid var(--rule)',
                background: ok ? 'var(--ok-soft)' : 'var(--bg-panel)',
                color: ok ? 'var(--ok)' : 'var(--text-3)',
              }}
            >
              {ok ? '♪' : '·'} {id}
            </span>
          )
        })}
      </div>
    </section>
  )
}
