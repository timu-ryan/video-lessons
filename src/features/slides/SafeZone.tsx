import { CAMERA_H, CAMERA_W } from './canvas'

/** Рамка зоны под камеру. Включается клавишей G, только для проверки. */
export function SafeZone() {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: CAMERA_W,
        height: CAMERA_H,
        border: '4px dashed color-mix(in srgb, var(--accent) 55%, transparent)',
        background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <span style={{ fontSize: 36, color: 'var(--accent)', letterSpacing: '0.08em' }}>
        КАМЕРА 520×380
      </span>
    </div>
  )
}
