import { SAFE_COL_W } from '../canvas'
import type { SectionSlide } from '../types'
import { SlideRoot } from './parts'
import { FS } from './typography'

export function SectionView({ slide }: { slide: SectionSlide }) {
  return (
    <SlideRoot style={{ justifyContent: 'center', paddingBottom: 120 }}>
      <div
        style={{
          fontSize: 220,
          fontWeight: 800,
          lineHeight: 0.9,
          letterSpacing: '-0.04em',
          color: 'var(--accent-soft)',
        }}
      >
        {slide.number}
      </div>

      <h1
        style={{
          margin: '-24px 0 0',
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

      {slide.hint ? (
        <p
          style={{
            margin: '32px 0 0',
            width: SAFE_COL_W,
            fontSize: FS.ru,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--text-2)',
          }}
        >
          {slide.hint}
        </p>
      ) : null}
    </SlideRoot>
  )
}
