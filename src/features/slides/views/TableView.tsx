import { SAFE_COL_W } from '../canvas'
import type { TableSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Reveal, SlideRoot } from './parts'
import { FS } from './typography'

/** Колонка перевода. Остаток ширины уходит испанскому — он главный. */
const RU_COL = 520

export function TableView({
  slide,
  step,
  options,
}: {
  slide: TableSlide
  step: number
  options: ViewOptions
}) {
  const columns = options.translation ? `minmax(0, 1fr) ${RU_COL}px` : 'minmax(0, 1fr)'
  const esHeader = options.transcription
    ? `${slide.headers[0]} · ${slide.headers[1]}`
    : slide.headers[0]

  return (
    <SlideRoot>
      <CompactHeader title={slide.title} section={slide.section} part={slide.part} />

      <div
        style={{
          marginTop: 22,
          width: SAFE_COL_W,
          display: 'grid',
          gridTemplateColumns: columns,
          gap: 32,
          fontSize: FS.meta,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
        }}
      >
        <span>{esHeader}</span>
        {options.translation ? <span>{slide.headers[2]}</span> : null}
      </div>

      <div
        style={{
          marginTop: 6,
          width: SAFE_COL_W,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {slide.rows.map((row, index) => (
          <Reveal
            key={row.id}
            shown={index <= step}
            style={{
              display: 'grid',
              gridTemplateColumns: columns,
              gap: 32,
              alignItems: 'baseline',
              padding: '10px 0',
              borderTop: index === 0 ? 'none' : '2px solid var(--rule)',
            }}
          >
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
                {row.es}
              </div>
              {options.transcription ? (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: FS.tr,
                    fontWeight: 500,
                    lineHeight: 1.15,
                    color: 'var(--text-3)',
                  }}
                >
                  {row.tr}
                </div>
              ) : null}
            </div>

            {options.translation ? (
              <div
                style={{
                  fontSize: FS.ru,
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
