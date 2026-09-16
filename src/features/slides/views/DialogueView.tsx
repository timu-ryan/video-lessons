import { SAFE_COL_W } from '../canvas'
import type { DialogueSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Marked, Reveal, SlideRoot } from './parts'
import { FS } from './typography'

const NAME_COL = 230

export function DialogueView({
  slide,
  step,
  options,
}: {
  slide: DialogueSlide
  step: number
  options: ViewOptions
}) {
  return (
    <SlideRoot>
      <CompactHeader title={slide.title} section={slide.section} part={slide.part} />

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
        {slide.lines.map((line, index) => {
          const speaker = options.speakers[line.speaker]
          return (
            <Reveal
              key={`${slide.id}-${index}`}
              shown={index <= step}
              style={{
                display: 'grid',
                gridTemplateColumns: `${NAME_COL}px 1fr`,
                gap: 24,
                alignItems: 'baseline',
                padding: '10px 0',
              }}
            >
              <div
                style={{
                  fontSize: FS.ru,
                  fontWeight: 800,
                  color: speaker?.color ?? 'var(--text-3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {speaker?.name ?? line.speaker}
              </div>
              <div>
                <div
                  style={{
                    fontSize: FS.dialogueEs,
                    fontWeight: 700,
                    lineHeight: 1.12,
                    color: 'var(--text)',
                  }}
                >
                  <Marked text={line.es} />
                </div>
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
                    <Marked text={line.ru} />
                  </div>
                ) : null}
              </div>
            </Reveal>
          )
        })}
      </div>
    </SlideRoot>
  )
}
