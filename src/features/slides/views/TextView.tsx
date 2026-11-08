import { SAFE_COL_W } from '../canvas'
import type { TextSlide } from '../types'
import type { ViewOptions } from './options'
import { CompactHeader, Marked, SlideRoot } from './parts'

/**
 * Испанский абзац мельче, чем строка таблицы (FS.tableEs): здесь читают текст,
 * а не одно слово. Межстрочный интервал шире обычного — абзац, а не список.
 */
const ES_SIZE = 46
/** Перевод — подстрочник, а не второй текст: заметно мельче, но не ниже 32px. */
const RU_SIZE = 36
const LINE_HEIGHT = 1.34

/**
 * Связный текст: испанский абзацем, под чертой — перевод абзацем.
 * Предложения открываются по одному на шаг, одновременно в обоих абзацах.
 * Скрытое предложение занимает своё место, поэтому текст не перетекает.
 */
export function TextView({
  slide,
  step,
  options,
}: {
  slide: TextSlide
  step: number
  options: ViewOptions
}) {
  return (
    <SlideRoot>
      <CompactHeader title={slide.title} section={slide.section} part={slide.part} />

      <p
        style={{
          margin: '36px 0 0',
          width: SAFE_COL_W,
          fontSize: ES_SIZE,
          fontWeight: 650,
          lineHeight: LINE_HEIGHT,
          letterSpacing: '-0.005em',
          color: 'var(--es)',
        }}
      >
        <Sentences texts={slide.sentences.map((s) => s.es)} step={step} />
      </p>

      {options.translation ? (
        <p
          style={{
            margin: '28px 0 0',
            paddingTop: 24,
            width: SAFE_COL_W,
            borderTop: '2px solid var(--rule)',
            fontSize: RU_SIZE,
            fontWeight: 500,
            lineHeight: LINE_HEIGHT,
            color: 'var(--text-3)',
          }}
        >
          <Sentences texts={slide.sentences.map((s) => s.ru)} step={step} />
        </p>
      ) : null}
    </SlideRoot>
  )
}

function Sentences({ texts, step }: { texts: string[]; step: number }) {
  return texts.map((text, index) => {
    const shown = index <= step
    return (
      <span
        key={index}
        className={shown ? 'anim-fade' : undefined}
        aria-hidden={!shown}
        style={{ opacity: shown ? 1 : 0 }}
      >
        <Marked text={text} />
        {index < texts.length - 1 ? ' ' : null}
      </span>
    )
  })
}
