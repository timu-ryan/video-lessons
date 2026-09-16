import { SAFE_COL_W } from '../canvas'
import type { RuleSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Ipa, Marked, Reveal, SlideRoot } from './parts'
import { FS } from './typography'

const OPERATOR = '+'

/**
 * Элемент формулы на кириллице — место, куда что-то подставляют («инфинитив»),
 * поэтому рисуется пустой рамкой. Испанский — готовое слово, залитая плашка.
 */
const isSlot = (token: string) => /\p{Script=Cyrillic}/u.test(token)

/** Правило: формула и пояснение сразу, примеры — по одному на шаг. */
export function RuleView({
  slide,
  step,
  options,
}: {
  slide: RuleSlide
  step: number
  options: ViewOptions
}) {
  return (
    <SlideRoot>
      <CompactHeader title={slide.title} section={slide.section} />

      <div
        style={{
          marginTop: 44,
          width: SAFE_COL_W,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 22,
        }}
      >
        {slide.pattern.map((token, index) =>
          token === OPERATOR ? (
            <span key={index} style={{ fontSize: 64, fontWeight: 800, color: 'var(--text-3)' }}>
              {token}
            </span>
          ) : (
            <span
              key={index}
              style={{
                fontSize: 60,
                fontWeight: 800,
                lineHeight: 1.1,
                padding: '10px 30px',
                borderRadius: 20,
                ...(isSlot(token)
                  ? { border: '4px dashed var(--rule)', color: 'var(--text-2)' }
                  : { border: '4px solid transparent', background: 'var(--accent-soft)', color: 'var(--accent)' }),
              }}
            >
              {token}
            </span>
          ),
        )}
      </div>

      {slide.text ? (
        <p
          style={{
            margin: '30px 0 0',
            width: SAFE_COL_W,
            fontSize: FS.ru,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-2)',
          }}
        >
          {slide.text}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 24,
          width: SAFE_COL_W,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {slide.examples.map((example, index) => (
          <Reveal
            key={example.es}
            shown={index < step}
            style={{
              padding: '10px 0',
              borderTop: index === 0 ? 'none' : '2px solid var(--rule)',
            }}
          >
            <div
              style={{
                fontSize: FS.tableEs,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'var(--text)',
              }}
            >
              <Marked text={example.es} />
            </div>
            {options.transcription && example.ipa ? <Ipa>{example.ipa}</Ipa> : null}
            {options.translation ? (
              <div
                style={{
                  marginTop: 4,
                  fontSize: FS.ruSmall,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: 'var(--text-3)',
                }}
              >
                <Marked text={example.ru} />
              </div>
            ) : null}
          </Reveal>
        ))}
      </div>
    </SlideRoot>
  )
}
