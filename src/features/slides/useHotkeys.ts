import { useEffect, useRef } from 'react'

export type HotkeyHandlers = Partial<Record<string, () => void>>

/**
 * Управление только с клавиатуры. PageUp/PageDown обязательны: их шлют
 * обычные презентационные кликеры.
 */
export function useHotkeys(handlers: HotkeyHandlers): void {
  const ref = useRef(handlers)

  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) {
        return
      }

      const action = resolve(event)
      if (!action) return
      const handler = ref.current[action]
      if (!handler) return
      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function resolve(event: KeyboardEvent): string | undefined {
  switch (event.key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
    case 'Spacebar':
      return 'next'
    case 'ArrowLeft':
    case 'PageUp':
      return 'prev'
    case 'ArrowDown':
      return 'next'
    case 'ArrowUp':
      return 'prev'
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    case 'Escape':
      return 'escape'
  }

  // Буквы — по физической клавише, чтобы работало и в русской раскладке.
  switch (event.code) {
    case 'KeyT':
      return 'transcription'
    case 'KeyR':
      return 'translation'
    case 'KeyF':
      return 'fullscreen'
    case 'KeyG':
      return 'safeZone'
    case 'KeyP':
      return 'presenter'
    case 'KeyB':
      return 'progress'
    default:
      return undefined
  }
}

export function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {})
  } else {
    void document.documentElement.requestFullscreen().catch(() => {})
  }
}
