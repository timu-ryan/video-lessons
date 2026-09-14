import { useEffect, useMemo, useRef, useState } from 'react'
import { playPhrase, stopAudio } from '../audio/audio'
import type { DeckState, PresenterMessage } from '../presenter/channel'
import { openChannel, readStartedAt, writeStartedAt } from '../presenter/channel'
import { useSettings } from '../settings/useSettings'
import { ProgressBar } from './ProgressBar'
import { SafeZone } from './SafeZone'
import { SlideView } from './SlideView'
import { Stage } from './Stage'
import { presenterHash } from './route'
import { pauseMs, phraseAtStep } from './steps'
import type { Lesson } from './types'
import { toggleFullscreen, useHotkeys } from './useHotkeys'
import { useDeckNav } from './useDeckNav'
import { useIdleCursor } from './useIdleCursor'

/** Основной экран — тот, что пишется в OBS. Никакого интерфейса в кадре. */
export function Deck({ lesson }: { lesson: Lesson }) {
  const { settings, toggle } = useSettings()
  const nav = useDeckNav(lesson)
  useIdleCursor(1500)

  /** Отметка начала записи: переживает перезагрузку, сбрасывается из окна докладчика. */
  const [startedAt, setStartedAt] = useState<number>(readStartedAt)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const options = useMemo(
    () => ({
      transcription: settings.transcription,
      translation: settings.translation,
      speakers: lesson.speakers,
    }),
    [settings.transcription, settings.translation, lesson.speakers],
  )

  const { slide, step, next, prev, first, last } = nav

  // --- клавиатура ---------------------------------------------------------
  useHotkeys({
    next,
    prev,
    first,
    last,
    transcription: () => toggle('transcription'),
    translation: () => toggle('translation'),
    safeZone: () => toggle('safeZone'),
    progress: () => toggle('progress'),
    fullscreen: toggleFullscreen,
    audio: () => {
      const audioId = phraseAtStep(slide, step)?.audioId
      if (audioId) playPhrase(lesson.audioDir, audioId)
    },
    presenter: () => {
      window.open(
        `${window.location.pathname}${presenterHash(lesson.id)}`,
        'video-lessons-presenter',
        'width=1280,height=860',
      )
    },
  })

  // --- практика: пауза, затем автопоказ ответа и озвучка -------------------
  useEffect(() => {
    if (slide.type !== 'practice' || step !== 0) return
    const timer = window.setTimeout(next, pauseMs(slide))
    return () => window.clearTimeout(timer)
  }, [slide, step, next])

  useEffect(() => {
    if (slide.type === 'practice' && step === 1 && slide.phrase.audioId) {
      playPhrase(lesson.audioDir, slide.phrase.audioId)
    }
  }, [slide, step, lesson.audioDir])

  useEffect(() => stopAudio, [])

  // --- синхронизация с окном докладчика ------------------------------------
  const state: DeckState = {
    lessonId: lesson.id,
    slideIndex: nav.slideIndex,
    step: nav.step,
    transcription: settings.transcription,
    translation: settings.translation,
    startedAt,
  }
  const stateRef = useRef(state)
  const navRef = useRef({ next, prev, first, last })

  useEffect(() => {
    stateRef.current = state
    navRef.current = { next, prev, first, last }
  })

  useEffect(() => {
    const channel = openChannel()
    channelRef.current = channel
    if (!channel) return

    const onMessage = (event: MessageEvent<PresenterMessage>) => {
      const message = event.data
      if (message.kind === 'nav') {
        navRef.current[message.action]()
      } else if (message.kind === 'hello') {
        channel.postMessage({ kind: 'state', state: stateRef.current } satisfies PresenterMessage)
      } else if (message.kind === 'reset-timer') {
        const now = Date.now()
        writeStartedAt(now)
        // Новое состояние разошлётся эффектом ниже — он следит за startedAt.
        setStartedAt(now)
      }
    }

    channel.addEventListener('message', onMessage)
    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    channelRef.current?.postMessage({
      kind: 'state',
      state: stateRef.current,
    } satisfies PresenterMessage)
  }, [lesson.id, nav.slideIndex, nav.step, settings.transcription, settings.translation, startedAt])

  return (
    <Stage>
      {/* key перезапускает анимации появления при смене слайда */}
      <div key={slide.id} style={{ position: 'absolute', inset: 0 }} className="anim-fade">
        <SlideView slide={slide} step={step} options={options} />
      </div>
      {settings.progress ? <ProgressBar value={nav.progress} /> : null}
      {settings.safeZone ? <SafeZone /> : null}
    </Stage>
  )
}
