import { SAFE_COL_W } from '../canvas'
import type { CompareItem, CompareSide, CompareSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Ipa, Marked, Reveal, SlideRoot } from './parts'
import { FS } from './typography'

const GAP = 56

/**
 * Подача колонки. Цвет не единственный носитель смысла: у неверной ещё ✗
 * и зачёркивание, у верной — ✓. Равноправные колонки различаются только цветом
 * подписи — оценки в них нет.
 */
function toneStyle(side: CompareSide, position: 'left' | 'right') {
  switch (side.tone) {
    case 'wrong':
      return { accent: 'var(--bad)', text: 'var(--text-2)', icon: '✗ ', strike: true }
    case 'right':
      return { accent: 'var(--ok)', text: 'var(--text)', icon: '✓ ', strike: false }
    default:
      return {
        accent: position === 'left' ? 'var(--accent)' : 'var(--accent-2)',
        text: 'var(--text)',
        icon: '',
        strike: false,
      }
  }
}

/** Сравнение в две колонки: подписи сразу, пункты — строка за шаг. */
export function CompareView({
  slide,
  step,
  options,
}: {
  slide: CompareSlide
  step: number
  options: ViewOptions
}) {
  const rows = Math.max(slide.left.items.length, slide.right.items.length)
  const sides = [
    { side: slide.left, tone: toneStyle(slide.left, 'left') },
    { side: slide.right, tone: toneStyle(slide.right, 'right') },
  ]

  return (
    <SlideRoot>
      <CompactHeader title={slide.title} section={slide.section} />

      <div
        style={{
          marginTop: 36,
          width: SAFE_COL_W,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: GAP,
        }}
      >
        {sides.map(({ side, tone }, index) => (
          <div
            key={index}
            style={{
              paddingBottom: 12,
              borderBottom: `4px solid ${tone.accent}`,
              fontSize: FS.ru,
              fontWeight: 800,
              lineHeight: 1.15,
              color: tone.accent,
            }}
          >
            {tone.icon}
            {side.label}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 8,
          width: SAFE_COL_W,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {Array.from({ length: rows }, (_, row) => (
          <Reveal
            key={row}
            shown={row <= step}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: GAP,
              alignItems: 'baseline',
              padding: '10px 0',
            }}
          >
            {sides.map(({ side, tone }, index) => {
              const item = side.items[row]
              return item ? (
                <Cell key={index} item={item} tone={tone} options={options} />
              ) : (
                <div key={index} />
              )
            })}
          </Reveal>
        ))}
      </div>
    </SlideRoot>
  )
}

function Cell({
  item,
  tone,
  options,
}: {
  item: CompareItem
  tone: ReturnType<typeof toneStyle>
  options: ViewOptions
}) {
  return (
    <div>
      <div
        style={{
          fontSize: FS.dialogueEs,
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          color: tone.text,
          textDecoration: tone.strike ? 'line-through' : 'none',
          textDecorationColor: tone.strike ? 'var(--bad)' : undefined,
          textDecorationThickness: tone.strike ? 5 : undefined,
        }}
      >
        <Marked text={item.es} color={tone.accent} />
      </div>
      {options.transcription && item.ipa ? <Ipa>{item.ipa}</Ipa> : null}
      {options.translation && item.ru ? (
        <div
          style={{
            marginTop: 4,
            fontSize: FS.ruSmall,
            fontWeight: 500,
            lineHeight: 1.2,
            color: 'var(--text-3)',
          }}
        >
          <Marked text={item.ru} />
        </div>
      ) : null}
    </div>
  )
}
