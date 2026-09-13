import { CAMERA_W } from './canvas'

/**
 * Единственный элемент интерфейса, допустимый в кадре: тонкая полоска
 * прогресса урока. Обрывается до начала камерной зоны. Клавиша B.
 */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 1920 - CAMERA_W,
        height: 6,
        background: 'color-mix(in srgb, var(--rule) 60%, transparent)',
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: `${Math.round(value * 100)}%`,
          height: '100%',
          background: 'var(--accent)',
          transition: 'width 200ms ease-out',
        }}
      />
    </div>
  )
}
