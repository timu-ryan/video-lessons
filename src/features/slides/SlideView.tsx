import { LessonProgress } from './LessonProgress'
import type { Lesson, Slide } from './types'
import type { ViewOptions } from './views/options'
import { CompareView } from './views/CompareView'
import { ConjugationCompareView } from './views/ConjugationCompareView'
import { ConjugationView } from './views/ConjugationView'
import { DialogueView } from './views/DialogueView'
import { FinalView } from './views/FinalView'
import { PracticeView } from './views/PracticeView'
import { RuleView } from './views/RuleView'
import { SectionView } from './views/SectionView'
import { TableView } from './views/TableView'
import { TextView } from './views/TextView'
import { TitleView } from './views/TitleView'

export function SlideView({
  lesson,
  slideIndex,
  step,
  options,
  animate = false,
}: {
  lesson: Lesson
  slideIndex: number
  step: number
  options: ViewOptions
  animate?: boolean
}) {
  const slide = lesson.slides[slideIndex]
  if (!slide) return null

  return (
    <>
      {/* При переходе анимируется только содержимое слайда. */}
      <div
        key={slide.id}
        className={animate ? 'anim-fade' : undefined}
        style={{ position: 'absolute', inset: 0 }}
      >
        <SlideContent slide={slide} step={step} options={options} />
      </div>
      {slideIndex > 0 && slide.type !== 'title' ? (
        <LessonProgress lesson={lesson} slideIndex={slideIndex} />
      ) : null}
    </>
  )
}

/** Единственное место, где тип слайда превращается в компонент. */
function SlideContent({
  slide,
  step,
  options,
}: {
  slide: Slide
  step: number
  options: ViewOptions
}) {
  switch (slide.type) {
    case 'title':
      return <TitleView slide={slide} />
    case 'section':
      return <SectionView slide={slide} />
    case 'table':
      return <TableView slide={slide} step={step} options={options} />
    case 'rule':
      return <RuleView slide={slide} step={step} options={options} />
    case 'conjugation':
      return <ConjugationView slide={slide} step={step} options={options} />
    case 'conjugationCompare':
      return <ConjugationCompareView slide={slide} step={step} options={options} />
    case 'compare':
      return <CompareView slide={slide} step={step} options={options} />
    case 'practice':
      return <PracticeView slide={slide} step={step} options={options} />
    case 'dialogue':
      return <DialogueView slide={slide} step={step} options={options} />
    case 'text':
      return <TextView slide={slide} step={step} options={options} />
    case 'final':
      return <FinalView slide={slide} step={step} />
  }
}
