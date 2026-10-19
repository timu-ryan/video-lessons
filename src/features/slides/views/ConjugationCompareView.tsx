import { SAFE_COL_W } from '../canvas'
import type { ConjugationCompareSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Ipa, Reveal, SlideRoot } from './parts'
import { FS } from './typography'

/** Как в ConjugationView: «nosotros / nosotras» переносится, формам нужна ширина. */
const PRONOUN_COL = 340
const GAP = 32

/** Колонки глаголов различаются цветом окончаний — как равноправные колонки сравнения. */
const VERB_COLORS = ['var(--accent)', 'var(--accent-2)']

/**
 * Спряжение двух глаголов рядом: шапка с инфинитивами сразу, строки — по одной.
 * Перевода у строк нет: лицо видно по местоимению, перевод глагола — в шапке.
 */
export function ConjugationCompareView({
  slide,
  step,
  options,
}: {
  slide: ConjugationCompareSlide
  step: number
  options: ViewOptions
}) {
  const columns = `${PRONOUN_COL}px repeat(${slide.verbs.length}, minmax(0, 1fr))`

  return (
    <SlideRoot>
      <CompactHeader title={slide.title} section={slide.section} />

      <div
        style={{
          marginTop: 28,
          width: SAFE_COL_W,
          display: 'grid',
          gridTemplateColumns: columns,
          gap: GAP,
          alignItems: 'end',
        }}
      >
        <div />
        {slide.verbs.map((verb, index) => (
          <div
            key={verb.verb}
            style={{
              paddingBottom: 10,
              borderBottom: `4px solid ${VERB_COLORS[index]}`,
              fontSize: FS.ru,
              fontWeight: 800,
              lineHeight: 1.15,
              color: VERB_COLORS[index],
            }}
          >
            {verb.verb}
            {options.translation ? (
              <span style={{ fontWeight: 600, color: 'var(--text-3)' }}> — {verb.ru}</span>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          width: SAFE_COL_W,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {slide.rows.map((row, index) => (
          <Reveal
            key={row.pronoun}
            shown={index <= step}
            style={{
              display: 'grid',
              gridTemplateColumns: columns,
              gap: GAP,
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

            {row.forms.map((form, column) => (
              <div key={column}>
                <div
                  style={{
                    fontSize: FS.tableEs,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                    color: 'var(--text)',
                  }}
                >
                  {form.stem}
                  <span style={{ color: VERB_COLORS[column] }}>{form.ending}</span>
                </div>
                {options.transcription && form.ipa ? <Ipa>{form.ipa}</Ipa> : null}
              </div>
            ))}
          </Reveal>
        ))}
      </div>
    </SlideRoot>
  )
}
