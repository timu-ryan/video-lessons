import type { Slide } from './types'
import type { ViewOptions } from './views/options'
import { CompareView } from './views/CompareView'
import { ConjugationView } from './views/ConjugationView'
import { DialogueView } from './views/DialogueView'
import { FinalView } from './views/FinalView'
import { PracticeView } from './views/PracticeView'
import { RuleView } from './views/RuleView'
import { SectionView } from './views/SectionView'
import { TableView } from './views/TableView'
import { TitleView } from './views/TitleView'

/** Единственное место, где тип слайда превращается в компонент. */
export function SlideView({
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
    case 'compare':
      return <CompareView slide={slide} step={step} options={options} />
    case 'practice':
      return <PracticeView slide={slide} step={step} options={options} />
    case 'dialogue':
      return <DialogueView slide={slide} step={step} options={options} />
    case 'final':
      return <FinalView slide={slide} step={step} />
  }
}
