import { SAFE_COL_W } from '../canvas'
import { plainText } from '../markup'
import { pauseMs } from '../steps'
import type { PracticeSlide } from '../types'
import type { ViewOptions } from './options'
import { Eyebrow, Marked, SlideRoot } from './parts'
import { FS } from './typography'

/** Длинная фраза набирается меньшим кеглем, но не мельче 110px. */
function answerSize(es: string): number {
  const text = plainText(es)
  if (text.length <= 22) return FS.hero
  if (text.length <= 34) return FS.heroMid
  return FS.heroSmall
}

export function PracticeView({
  slide,
  step,
  options,
}: {
  slide: PracticeSlide
  step: number
  options: ViewOptions
}) {
  const revealed = step >= 1
  const duration = pauseMs(slide)

  return (
    <SlideRoot>
      <Eyebrow left={`Практика ${slide.index}/${slide.total}`} right={slide.group} />

      <div
        style={{
          marginTop: 28,
          width: SAFE_COL_W,
          minHeight: 200,
          fontSize: FS.prompt,
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: '-0.015em',
          color: 'var(--text)',
        }}
      >
        <Marked text={slide.phrase.ru} />
        {slide.phrase.hint ? (
          <div
            style={{
              marginTop: 10,
              fontSize: FS.ru,
              fontWeight: 600,
              letterSpacing: 0,
              color: 'var(--text-3)',
            }}
          >
            ({slide.phrase.hint})
          </div>
        ) : null}
      </div>

      {/* Полоска паузы: пока она бежит, зритель говорит вслух. */}
      <div
        style={{
          marginTop: 12,
          width: 900,
          height: 14,
          borderRadius: 7,
          background: 'var(--bg-panel-alt)',
          overflow: 'hidden',
          opacity: revealed ? 0 : 1,
          transition: 'opacity 200ms ease-out',
        }}
      >
        <div
          key={`${slide.id}-bar`}
          style={{
            height: '100%',
            borderRadius: 7,
            background: 'var(--accent-2)',
            transformOrigin: 'left center',
            animation: revealed ? undefined : `pause-bar ${duration}ms linear forwards`,
            transform: revealed ? 'scaleX(1)' : undefined,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: FS.meta,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: 'var(--text-3)',
          opacity: revealed ? 0 : 1,
          transition: 'opacity 200ms ease-out',
        }}
      >
        Скажите вслух
      </div>

      <div
        style={{
          flex: 1,
          width: SAFE_COL_W,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          className={revealed ? 'anim-rise' : undefined}
          style={{ opacity: revealed ? 1 : 0 }}
          aria-hidden={!revealed}
        >
          <div
            style={{
              fontSize: answerSize(slide.phrase.es),
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: 'var(--accent)',
            }}
          >
            {/* Ответ и так акцентного цвета — выделенное внутри него шафрановое. */}
            <Marked text={slide.phrase.es} color="var(--accent-2)" />
          </div>
          {options.transcription && slide.phrase.ipa ? (
            <div
              style={{
                marginTop: 14,
                fontFamily: 'var(--font-ipa)',
                fontSize: FS.ru,
                fontWeight: 500,
                lineHeight: 1.2,
                color: 'var(--text-3)',
              }}
            >
              {slide.phrase.ipa}
            </div>
          ) : null}
          {slide.phrase.alternatives?.map((alternative) => (
            <div
              key={alternative}
              style={{
                marginTop: 12,
                fontSize: FS.ru,
                fontWeight: 600,
                lineHeight: 1.2,
                color: 'var(--text-2)',
              }}
            >
              <span style={{ color: 'var(--text-3)' }}>или </span>
              <Marked text={alternative} />
            </div>
          ))}
        </div>
      </div>
    </SlideRoot>
  )
}
