import { useEffect } from 'react'

/** Курсор исчезает через `delay` мс бездействия — в кадре его быть не должно. */
export function useIdleCursor(delay = 1500): void {
  useEffect(() => {
    let timer = 0

    const hide = () => document.body.classList.add('cursor-hidden')
    const bump = () => {
      document.body.classList.remove('cursor-hidden')
      window.clearTimeout(timer)
      timer = window.setTimeout(hide, delay)
    }

    timer = window.setTimeout(hide, delay)
    window.addEventListener('mousemove', bump)
    window.addEventListener('mousedown', bump)
    window.addEventListener('wheel', bump, { passive: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('mousedown', bump)
      window.removeEventListener('wheel', bump)
      document.body.classList.remove('cursor-hidden')
    }
  }, [delay])
}
