import type { Slide } from './types'
import type { ViewOptions } from './views/options'
import { DialogueView } from './views/DialogueView'
import { FinalView } from './views/FinalView'
import { MistakeView } from './views/MistakeView'
import { PracticeView } from './views/PracticeView'
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
    case 'practice':
      return <PracticeView slide={slide} step={step} options={options} />
    case 'dialogue':
      return <DialogueView slide={slide} step={step} options={options} />
    case 'mistake':
      return <MistakeView slide={slide} step={step} />
    case 'final':
      return <FinalView slide={slide} step={step} />
  }
}
