import { useEffect, useState } from 'react'
import { getLesson } from './features/lessons/registry'
import { PresenterApp } from './features/presenter/PresenterApp'
import { Deck } from './features/slides/Deck'
import { parseHash, type Route } from './features/slides/route'

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => {
      setRoute((current) => {
        const next = parseHash(window.location.hash)
        // Позицию внутри урока ведёт useDeckNav — здесь важен только режим.
        return next.kind === current.kind && next.lessonId === current.lessonId ? current : next
      })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const lesson = getLesson(route.lessonId)

  return route.kind === 'presenter' ? (
    <PresenterApp lesson={lesson} />
  ) : (
    <Deck key={lesson.id} lesson={lesson} />
  )
}
