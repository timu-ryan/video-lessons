import type { CSSProperties, ReactNode } from 'react'
import { CANVAS_H, CANVAS_W, PAD_TOP, PAD_X, SAFE_COL_W } from '../canvas'
import { FS } from './typography'

export function SlideRoot({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: CANVAS_W,
        height: CANVAS_H,
        padding: `${PAD_TOP}px ${PAD_X}px 72px`,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Служебная строка над заголовком: раздел слева, «1/2» справа. */
export function Eyebrow({ left, right }: { left?: string; right?: string }) {
  return (
    <div
      className="flex items-baseline justify-between"
      style={{
        width: SAFE_COL_W,
        fontSize: FS.meta,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-3)',
      }}
    >
      <span>{left ?? ''}</span>
      {right ? <span style={{ color: 'var(--accent-2)' }}>{right}</span> : null}
    </div>
  )
}

/**
 * Компактная шапка для слайдов с построчным контентом: название слева,
 * раздел и «1/2» справа. Экономит ~120px высоты по сравнению с крупным
 * заголовком — эта высота нужна строкам таблицы.
 */
export function CompactHeader({
  title,
  section,
  part,
}: {
  title: string
  section?: string
  part?: [number, number]
}) {
  const right = [section, part ? `${part[0]}/${part[1]}` : undefined].filter(Boolean).join(' · ')

  return (
    <>
      <div
        className="flex items-baseline justify-between"
        style={{ width: SAFE_COL_W, gap: 32 }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>
        {right ? (
          <div
            style={{
              fontSize: FS.meta,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              whiteSpace: 'nowrap',
            }}
          >
            {right}
          </div>
        ) : null}
      </div>
      <div
        style={{
          width: SAFE_COL_W,
          height: 4,
          marginTop: 14,
          background: 'var(--accent)',
          flex: 'none',
        }}
      />
    </>
  )
}

export function SlideTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        margin: '14px 0 0',
        width: SAFE_COL_W,
        fontSize: FS.slideTitle,
        fontWeight: 800,
        lineHeight: 1.06,
        letterSpacing: '-0.015em',
        color: 'var(--text)',
      }}
    >
      {children}
    </h1>
  )
}

/** Тонкая акцентная черта под заголовком. */
export function Rule() {
  return (
    <div
      style={{
        width: 132,
        height: 8,
        marginTop: 20,
        borderRadius: 4,
        background: 'var(--accent)',
        flex: 'none',
      }}
    />
  )
}

/**
 * Обёртка для контента, который появляется по шагам. Скрытые элементы
 * занимают своё место, поэтому уже показанные строки не «прыгают».
 */
export function Reveal({
  shown,
  children,
  style,
  delayIndex = 0,
}: {
  shown: boolean
  children: ReactNode
  style?: CSSProperties
  delayIndex?: number
}) {
  return (
    <div
      className={shown ? 'anim-rise' : undefined}
      aria-hidden={!shown}
      style={{
        opacity: shown ? 1 : 0,
        animationDelay: shown ? `${Math.min(delayIndex, 2) * 40}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
