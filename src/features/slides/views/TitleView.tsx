import { FULL_COL_W, SAFE_COL_W } from '../canvas'
import type { TitleSlide } from '../types'
import { SlideRoot } from './parts'
import { FS } from './typography'

export function TitleView({ slide }: { slide: TitleSlide }) {
  return (
    <SlideRoot style={{ justifyContent: 'center', paddingBottom: 120 }}>
      <div
        style={{
          fontSize: FS.meta,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}
      >
        {slide.course}
      </div>

      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 28,
        }}
      >
        <span
          style={{
            fontSize: 46,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'var(--bg)',
            background: 'var(--accent)',
            borderRadius: 18,
            padding: '14px 30px',
          }}
        >
          {slide.lessonLabel}
        </span>
      </div>

      <h1
        style={{
          margin: '36px 0 0',
          width: FULL_COL_W,
          fontSize: 108,
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
        }}
      >
        {slide.topic}
      </h1>

      {slide.agenda ? (
        <div
          style={{
            marginTop: 52,
            width: SAFE_COL_W,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {slide.agenda.map((item) => (
            <span
              key={item}
              style={{
                fontSize: FS.meta,
                fontWeight: 600,
                color: 'var(--text-2)',
                background: 'var(--bg-panel)',
                border: '2px solid var(--rule)',
                borderRadius: 999,
                padding: '12px 26px',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </SlideRoot>
  )
}
