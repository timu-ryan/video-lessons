import { SAFE_COL_W } from '../canvas'
import type { MistakeSlide } from '../types'
import { Eyebrow, SlideRoot } from './parts'
import { FS } from './typography'

/**
 * Цвет не единственный носитель смысла: у неверного варианта ещё иконка ✗
 * и зачёркивание, у верного — ✓.
 */
export function MistakeView({ slide, step }: { slide: MistakeSlide; step: number }) {
  return (
    <SlideRoot>
      <Eyebrow left={slide.section ?? 'Разбор ошибок'} right={`${slide.index}/${slide.total}`} />

      <div
        style={{
          marginTop: 40,
          width: SAFE_COL_W,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 36,
        }}
      >
        <Line
          shown
          icon="✗"
          tone="bad"
          text={slide.wrong}
          strike
          size={72}
          suffix={slide.when}
        />

        <Line shown={step >= 1} icon="✓" tone="ok" text={slide.right} size={80} />

        <p
          className={step >= 2 ? 'anim-fade' : undefined}
          aria-hidden={step < 2}
          style={{
            margin: 0,
            fontSize: FS.ru,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-2)',
            opacity: step >= 2 ? 1 : 0,
          }}
        >
          {slide.note}
        </p>
      </div>
    </SlideRoot>
  )
}

function Line({
  shown,
  icon,
  tone,
  text,
  size,
  strike = false,
  suffix,
}: {
  shown: boolean
  icon: string
  tone: 'bad' | 'ok'
  text: string
  size: number
  strike?: boolean
  suffix?: string
}) {
  const color = tone === 'bad' ? 'var(--bad)' : 'var(--ok)'
  const soft = tone === 'bad' ? 'var(--bad-soft)' : 'var(--ok-soft)'

  return (
    <div
      className={shown ? 'anim-rise' : undefined}
      aria-hidden={!shown}
      style={{
        display: 'grid',
        gridTemplateColumns: '96px 1fr',
        gap: 28,
        alignItems: 'start',
        opacity: shown ? 1 : 0,
      }}
    >
      <span
        style={{
          width: 96,
          height: 96,
          borderRadius: 999,
          background: soft,
          color,
          fontSize: 52,
          fontWeight: 800,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: size,
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: '-0.015em',
          color,
          textDecoration: strike ? 'line-through' : 'none',
          textDecorationThickness: strike ? 6 : undefined,
        }}
      >
        {text}
        {suffix ? (
          <span
            style={{
              fontSize: FS.ru,
              fontWeight: 600,
              color: 'var(--text-3)',
              textDecoration: 'none',
              display: 'block',
              marginTop: 8,
            }}
          >
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
  )
}
