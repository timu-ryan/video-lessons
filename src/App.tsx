import { useEffect, useState } from 'react'
import { HomeScreen } from './features/home/HomeScreen'
import { getLesson } from './features/lessons/registry'
import { PresenterApp } from './features/presenter/PresenterApp'
import { Deck } from './features/slides/Deck'
import { parseHash, sameScreen, type Route } from './features/slides/route'

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => {
      setRoute((current) => {
        const next = parseHash(window.location.hash)
        return sameScreen(next, current) ? current : next
      })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route.kind === 'home') return <HomeScreen />

  const lesson = getLesson(route.lessonId)

  return route.kind === 'presenter' ? (
    <PresenterApp lesson={lesson} />
  ) : (
    <Deck key={lesson.id} lesson={lesson} />
  )
}
