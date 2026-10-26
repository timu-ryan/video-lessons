import { useEffect, useMemo, useRef, useState } from 'react'
import { nextTheme, THEME_NAMES, THEMES, type ThemeName } from '../settings/palettes'
import { applyTheme, readSettings } from '../settings/useSettings'
import { SlideView } from '../slides/SlideView'
import { Stage } from '../slides/Stage'
import { slideLabel, stepCount } from '../slides/steps'
import type { Lesson } from '../slides/types'
import { useHotkeys } from '../slides/useHotkeys'
import type { DeckState, NavAction, PresenterMessage } from './channel'
import { formatElapsed, openChannel, readStartedAt } from './channel'

const THUMB_SCALE = 0.29

/**
 * Второе окно: его не записывают. Здесь можно и нужно показывать интерфейс —
 * текущий и следующий слайд, текст «что говоришь», таймер.
 */
export function PresenterApp({ lesson }: { lesson: Lesson }) {
  const [state, setState] = useState<DeckState>(() => ({
    lessonId: lesson.id,
    slideIndex: 0,
    step: 0,
    transcription: true,
    translation: true,
    theme: readSettings().theme,
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

  // Миниатюры слайдов — в той же палитре, что и основное окно
  useEffect(() => applyTheme(state.theme), [state.theme])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

  const send = (action: NavAction) => {
    channelRef.current?.postMessage({ kind: 'nav', action } satisfies PresenterMessage)
  }

  const pickTheme = (theme: ThemeName) => {
    channelRef.current?.postMessage({ kind: 'theme', theme } satisfies PresenterMessage)
  }

  useHotkeys({
    next: () => send('next'),
    prev: () => send('prev'),
    first: () => send('first'),
    last: () => send('last'),
    theme: () => pickTheme(nextTheme(state.theme)),
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
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>
          Слайд {state.slideIndex + 1}
          <span style={{ color: 'var(--text-3)' }}> / {lesson.slides.length}</span>
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-3)' }}>
          шаг {state.step + 1} / {stepCount(slide)}
        </div>
        <ThemePicker current={state.theme} onPick={pickTheme} />
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

      <footer style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
        → / Space / PageDown — вперёд · ← / PageUp — назад · Home / End — первый / последний ·
        T — транскрипция · R — перевод · F — полный экран · G — зона камеры ·
        B — полоска прогресса · C — палитра · P — это окно
      </footer>
    </div>
  )
}

/**
 * Выбор палитры. Каждая кнопка — со своим data-theme, поэтому рисуется
 * в собственной палитре: видно, что выбираешь. Применяет основное окно.
 */
function ThemePicker({
  current,
  onPick,
}: {
  current: ThemeName
  onPick: (theme: ThemeName) => void
}) {
  return (
    <div role="radiogroup" aria-label="Палитра" style={{ display: 'flex', gap: 6 }}>
      {THEME_NAMES.map((name) => {
        const active = name === current
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={active}
            data-theme={name}
            onClick={() => onPick(name)}
            style={{
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text)',
              background: 'var(--bg)',
              border: '2px solid var(--rule)',
              borderRadius: 8,
              padding: '5px 10px 5px 6px',
              cursor: 'pointer',
              // Активная палитра — она же палитра окна, так что --text виден на его фоне
              outline: active ? '2px solid var(--text)' : 'none',
              outlineOffset: 2,
            }}
          >
            <span style={{ display: 'flex', borderRadius: 3, overflow: 'hidden' }}>
              {['var(--text)', 'var(--accent)', 'var(--bar-2)'].map((color) => (
                <span key={color} style={{ width: 8, height: 16, background: color }} />
              ))}
            </span>
            {THEMES[name].label}
          </button>
        )
      })}
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
