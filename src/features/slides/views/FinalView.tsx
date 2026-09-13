import { SAFE_COL_W } from '../canvas'
import type { FinalSlide } from '../types'
import { Reveal, SlideRoot } from './parts'
import { FS } from './typography'

export function FinalView({ slide, step }: { slide: FinalSlide; step: number }) {
  return (
    <SlideRoot>
      <h1
        style={{
          margin: 0,
          width: SAFE_COL_W,
          fontSize: FS.sectionTitle,
          fontWeight: 800,
          lineHeight: 1.06,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
        }}
      >
        {slide.title}
      </h1>

      <div
        style={{
          marginTop: 40,
          width: SAFE_COL_W,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {slide.bullets.map((bullet, index) => (
          <Reveal
            key={bullet}
            shown={index <= step - 1}
            delayIndex={index}
            style={{ display: 'flex', gap: 22, alignItems: 'baseline' }}
          >
            <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--ok)' }}>✓</span>
            <span
              style={{
                fontSize: FS.ru,
                fontWeight: 600,
                lineHeight: 1.25,
                color: 'var(--text)',
              }}
            >
              {bullet}
            </span>
          </Reveal>
        ))}
      </div>

      <div
        style={{
          marginTop: 'auto',
          width: SAFE_COL_W,
          background: 'var(--bg-panel)',
          border: '2px solid var(--rule)',
          borderRadius: 28,
          padding: '30px 40px',
        }}
      >
        <div
          style={{
            fontSize: FS.meta,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}
        >
          {slide.nextTitle}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: FS.ru,
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--text)',
          }}
        >
          {slide.nextText}
        </div>
      </div>

      {slide.outro ? (
        <div
          style={{
            marginTop: 28,
            width: SAFE_COL_W,
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--accent)',
          }}
        >
          {slide.outro}
        </div>
      ) : null}
    </SlideRoot>
  )
}
