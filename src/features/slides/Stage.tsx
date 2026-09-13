import { useEffect, useState, type ReactNode } from 'react'
import { CANVAS_H, CANVAS_W } from './canvas'

interface StageProps {
  children: ReactNode
  /** Меньше 1 — для миниатюр в окне докладчика. */
  fixedScale?: number
  className?: string
}

/**
 * Холст 1920×1080, вписанный в окно с сохранением пропорций (letterbox).
 * Внутри все размеры — пиксели холста.
 */
const fitScale = () => Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H)

export function Stage({ children, fixedScale, className }: StageProps) {
  const [windowScale, setWindowScale] = useState(fitScale)

  useEffect(() => {
    const onResize = () => setWindowScale(fitScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scale = fixedScale ?? windowScale

  return (
    <div
      className={className}
      style={{
        width: fixedScale === undefined ? '100%' : CANVAS_W * fixedScale,
        height: fixedScale === undefined ? '100%' : CANVAS_H * fixedScale,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Центрируем трансформом, а не раскладкой: элемент 1920×1080 больше
          контейнера, и grid-центрирование прижало бы его к краю. */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
          background: 'var(--bg)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}
