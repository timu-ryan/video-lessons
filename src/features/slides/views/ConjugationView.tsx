import { SAFE_COL_W } from '../canvas'
import type { ConjugationSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Ipa, Reveal, SlideRoot } from './parts'
import { FS } from './typography'

/** «nosotros / nosotras» переносится на две строки — это дешевле, чем отнять ширину у формы. */
const PRONOUN_COL = 340
const RU_COL = 420

/** Спряжение: строки открываются по одной, окончание подсвечено. */
export function ConjugationView({
  slide,
  step,
  options,
}: {
  slide: ConjugationSlide
  step: number
  options: ViewOptions
}) {
  const columns = options.translation
    ? `${PRONOUN_COL}px minmax(0, 1fr) ${RU_COL}px`
    : `${PRONOUN_COL}px minmax(0, 1fr)`

  return (
    <SlideRoot>
      <CompactHeader title={`${slide.verb} — ${slide.ru}`} section={slide.section} />

      <div
        style={{
          marginTop: 18,
          width: SAFE_COL_W,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {slide.rows.map((row, index) => (
          <Reveal
            key={`${row.pronoun}-${row.es}`}
            shown={index <= step}
            style={{
              display: 'grid',
              gridTemplateColumns: columns,
              gap: 32,
              alignItems: 'baseline',
              padding: '8px 0',
              borderTop: index === 0 ? 'none' : '2px solid var(--rule)',
            }}
          >
            <div
              style={{
                fontSize: FS.ruSmall,
                fontWeight: 700,
                lineHeight: 1.15,
                color: 'var(--text-3)',
              }}
            >
              {row.pronoun}
            </div>

            <div>
              <div
                style={{
                  fontSize: FS.tableEs,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                  color: 'var(--text)',
                }}
              >
                {row.stem}
                <span style={{ color: 'var(--accent)' }}>{row.ending}</span>
              </div>
              {options.transcription && row.ipa ? <Ipa>{row.ipa}</Ipa> : null}
            </div>

            {options.translation ? (
              <div
                style={{
                  fontSize: FS.ruSmall,
                  fontWeight: 600,
                  lineHeight: 1.18,
                  color: 'var(--text-2)',
                }}
              >
                {row.ru}
              </div>
            ) : null}
          </Reveal>
        ))}
      </div>
    </SlideRoot>
  )
}
