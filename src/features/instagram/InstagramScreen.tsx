import { useEffect, useMemo, useRef, useState } from 'react'
import { lessonList } from '../lessons/registry'
import { isThemeName, THEMES, THEME_NAMES } from '../settings/palettes'
import { plainText } from '../slides/markup'
import { homeHash, instagramHash, instagramTopicHash } from '../slides/route'
import { CARD_HEIGHT, CARD_WIDTH, cardFilename, drawCard, loadCardFonts } from './card-canvas'
import { CardOverflow, downloadFile, exportCard, exportCarousel } from './download'
import {
  CARD_LABELS,
  MAX_CARDS,
  cardRowLimit,
  carouselSlug,
  carouselStamp,
  carouselTemplates,
  createDraft,
  defaultCaption,
  lessonLabel,
  loadDraft,
  newCard,
  newId,
  saveDraft,
  type Card,
  type CardKind,
  type CardRow,
  type CarouselLesson,
  type CarouselSource,
  type CarouselTopic,
  type Draft,
} from './draft'
import { loadTopics, presetTopics, saveTopic } from './topics'
import './instagram.css'

const lessons = lessonList.filter((lesson): lesson is CarouselLesson => Boolean(lesson.summary))
const cardKinds = Object.keys(CARD_LABELS) as CardKind[]

export function InstagramScreen({ lessonId, topicId }: { lessonId?: string; topicId?: string }) {
  const [myTopics, setMyTopics] = useState(loadTopics)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [topicSaved, setTopicSaved] = useState(true)
  const lesson = lessons.find((item) => item.id === lessonId)
    ?? lessons.find((item) => item.level === 'A0' && item.planLesson === 3)
    ?? lessons[0]
  const source = topicId ? [...presetTopics, ...myTopics].find((topic) => topic.id === topicId) : lesson
  const selected = source?.kind === 'topic'
    ? instagramTopicHash(source.id)
    : source ? instagramHash(source.id) : ''

  function createTopic() {
    const name = title.trim()
    if (!name) return
    const topic: CarouselTopic = { kind: 'topic', id: `custom-${newId()}`, title: name }
    setMyTopics([...myTopics, topic])
    setTopicSaved(saveTopic(topic))
    setTitle('')
    setCreating(false)
    window.location.hash = instagramTopicHash(topic.id)
  }

  return (
    <main className="instagram">
      <div className="ig-shell">
        <header className="ig-header">
          <div>
            <a className="ig-back" href={homeHash()}>← Уроки</a>
            <h1>Карусели для Instagram</h1>
          </div>
          <div className="ig-source">
            <label htmlFor="ig-source-select">Урок или тема</label>
            <div className="ig-source-actions">
              <select
                id="ig-source-select"
                value={selected}
                onChange={(event) => { window.location.hash = event.target.value }}
              >
                {!source && <option value="" disabled>Выбери урок или тему</option>}
                {lessons.length > 0 && (
                  <optgroup label="Уроки">
                    {lessons.map((item) => (
                      <option key={item.id} value={instagramHash(item.id)}>{lessonLabel(item)}. {item.title}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Готовые темы">
                  {presetTopics.map((topic) => (
                    <option key={topic.id} value={instagramTopicHash(topic.id)}>{topic.title}</option>
                  ))}
                </optgroup>
                {myTopics.length > 0 && (
                  <optgroup label="Мои темы">
                    {myTopics.map((topic) => (
                      <option key={topic.id} value={instagramTopicHash(topic.id)}>{topic.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button type="button" aria-expanded={creating} onClick={() => setCreating(!creating)}>
                {creating ? 'Отмена' : '+ Своя тема'}
              </button>
            </div>
          </div>
        </header>
        {creating && (
          <form className="ig-panel ig-new-topic" onSubmit={(event) => {
            event.preventDefault()
            createTopic()
          }}>
            <label>
              Название темы
              <input type="text" required maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <button className="ig-primary" type="submit" disabled={!title.trim()}>Создать карусель</button>
          </form>
        )}
        {!topicSaved && <p className="ig-message ig-error" role="status">Браузер не сохранил новую тему. Скачай файлы перед уходом со страницы.</p>}
        {source
          ? <CarouselEditor key={selected} source={source} />
          : <p>{topicId ? 'Тема недоступна в этом браузере. Выбери другую или создай свою.' : 'Выбери готовую тему или создай свою.'}</p>}
      </div>
    </main>
  )
}

function CarouselEditor({ source }: { source: CarouselSource }) {
  const templates = useMemo(() => carouselTemplates(source), [source])
  const [draft, setDraft] = useState(() => loadDraft(source, templates) ?? createDraft(source, templates))
  const [activeId, setActiveId] = useState(draft.cards[0]?.id)
  const [nextKind, setNextKind] = useState<CardKind>(source.kind === 'topic' ? 'variations' : 'mistake')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ text: string; error?: boolean }>()
  const [captionStatus, setCaptionStatus] = useState('')
  const [saved, setSaved] = useState(true)
  const [preview, setPreview] = useState<{ card: Card; error?: string }>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const caption = useRef<HTMLTextAreaElement>(null)

  const index = Math.max(0, draft.cards.findIndex((card) => card.id === activeId))
  const card = draft.cards[index]!
  const coverCard = draft.cards.find((item) => item.kind === 'cover')
  const count = draft.cards.length
  const theme = draft.theme
  const coverStyle = draft.coverStyle
  const previewError = preview?.card === card ? preview.error : undefined

  useEffect(() => {
    let active = true
    async function render() {
      try {
        await loadCardFonts([card])
        if (!active || !canvas.current) return
        const fits = drawCard(canvas.current, card, carouselStamp(source), index, count, theme, coverStyle)
        setPreview({ card, error: fits ? undefined : new CardOverflow(index).message })
      } catch {
        if (active) setPreview({ card, error: 'Не удалось отрисовать карточку. Обнови страницу и попробуй ещё раз.' })
      }
    }
    void render()
    return () => { active = false }
  }, [card, count, index, source, theme, coverStyle])

  function selectCard(cardIndex: number) {
    const item = draft.cards[cardIndex]
    if (item) setActiveId(item.id)
  }

  function updateDraft(next: Draft) {
    setDraft(next)
    setSaved(saveDraft(source, next))
    setStatus(undefined)
    setCaptionStatus('')
  }

  function editCard(changes: Partial<Card>) {
    const { title } = changes
    const followCover = card.kind === 'cover' && title !== undefined
      && draft.caption === defaultCaption(source, card.title)
    updateDraft({
      ...draft,
      cards: draft.cards.map((item) => item.id === card.id ? { ...item, ...changes } : item),
      caption: followCover ? defaultCaption(source, title) : draft.caption,
    })
  }

  function editRow(rowIndex: number, changes: Partial<CardRow>) {
    editCard({ rows: card.rows.map((row, i) => i === rowIndex ? { ...row, ...changes } : row) })
  }

  function addCard() {
    const added = newCard(templates[nextKind])
    updateDraft({ ...draft, cards: [...draft.cards, added] })
    setActiveId(added.id)
  }

  function moveCard(direction: -1 | 1) {
    const cards = [...draft.cards]
    cards.splice(index, 1)
    cards.splice(index + direction, 0, card)
    updateDraft({ ...draft, cards })
  }

  function removeCard() {
    const cards = draft.cards.filter((item) => item.id !== card.id)
    updateDraft({ ...draft, cards })
    setActiveId(cards[Math.min(index, cards.length - 1)]?.id)
  }

  async function download(all: boolean) {
    setBusy(true)
    setStatus(undefined)
    try {
      const blob = all ? await exportCarousel(source, draft) : await exportCard(source, draft, index)
      const name = all ? `instagram-${carouselSlug(source)}.zip` : cardFilename(index)
      downloadFile(blob, name)
      setStatus({ text: `Готово к скачиванию — ${name}` })
    } catch (error) {
      if (error instanceof CardOverflow) selectCard(error.index)
      setStatus({ text: error instanceof Error ? error.message : 'Не удалось скачать файлы.', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(draft.caption)
      setCaptionStatus('Подпись скопирована.')
    } catch {
      caption.current?.focus()
      caption.current?.select()
      setCaptionStatus('Текст выделен. Скопируй его или скачай файл.')
    }
  }

  return (
    <div className="ig-workspace">
      <section className="ig-preview" aria-label="Предпросмотр">
        <div className="ig-preview-heading">
          <span>Предпросмотр</span>
          <span>{CARD_WIDTH} × {CARD_HEIGHT} px</span>
        </div>
        <div className="ig-palette">
          <label htmlFor="ig-palette-select">Палитра</label>
          <span
            className="ig-palette-swatch"
            style={{ background: THEMES[theme].screen.accent }}
            aria-hidden="true"
          />
          <select
            id="ig-palette-select"
            value={theme}
            disabled={busy}
            onChange={(event) => {
              const value = event.target.value
              if (isThemeName(value)) updateDraft({ ...draft, theme: value })
            }}
          >
            {THEME_NAMES.map((name) => <option key={name} value={name}>{THEMES[name].label}</option>)}
          </select>
        </div>
        {coverCard && (
          <div className="ig-cover-style">
            <label htmlFor="ig-cover-style-select">Фон обложки</label>
            <select
              id="ig-cover-style-select"
              value={coverStyle}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value
                if (value !== 'filled' && value !== 'accent') return
                updateDraft({ ...draft, coverStyle: value })
                setActiveId(coverCard.id)
              }}
            >
              <option value="filled">Акцентный фон</option>
              <option value="accent">Нейтральный фон</option>
            </select>
          </div>
        )}
        <canvas
          ref={canvas}
          className="ig-card-preview"
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          role="img"
          aria-label={plainText([card.title, ...card.rows.flatMap((row) => [row.label, row.text, row.note]), card.detail].filter(Boolean).join('. '))}
        />
        <div className="ig-preview-nav">
          <button type="button" aria-label="Предыдущая карточка" disabled={index === 0 || busy} onClick={() => selectCard(index - 1)}>←</button>
          <span>Карточка {index + 1} из {count}</span>
          <button type="button" aria-label="Следующая карточка" disabled={index === count - 1 || busy} onClick={() => selectCard(index + 1)}>→</button>
        </div>
        {previewError && <p className="ig-message ig-error" role="alert">{previewError}</p>}
        <div className="ig-actions ig-downloads">
          <button type="button" className="ig-primary" disabled={busy} onClick={() => void download(true)}>
            {busy ? 'Готовлю файлы…' : 'Скачать карусель ZIP'}
          </button>
          <button type="button" disabled={busy || Boolean(previewError)} onClick={() => void download(false)}>
            Скачать {cardFilename(index)}
          </button>
        </div>
        {status && <p className={`ig-message${status.error ? ' ig-error' : ''}`} role="status">{status.text}</p>}
      </section>

      <div className="ig-edit">
        <section className="ig-panel" aria-labelledby="ig-cards-heading">
          <div className="ig-panel-heading">
            <h2 id="ig-cards-heading">Карточки</h2>
            <span>{count} / {MAX_CARDS}</span>
          </div>
          <ol className="ig-card-list" aria-label="Порядок карточек">
            {draft.cards.map((item, itemIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="ig-card-tab"
                  aria-current={item.id === card.id ? 'true' : undefined}
                  disabled={busy}
                  onClick={() => selectCard(itemIndex)}
                >
                  <span>{String(itemIndex + 1).padStart(2, '0')}</span> {CARD_LABELS[item.kind]}
                </button>
              </li>
            ))}
          </ol>
          <div className="ig-actions ig-card-actions">
            <button type="button" disabled={index === 0 || busy} onClick={() => moveCard(-1)}>← Раньше</button>
            <button type="button" disabled={index === count - 1 || busy} onClick={() => moveCard(1)}>Позже →</button>
            <button type="button" disabled={count === 1 || busy} onClick={removeCard}>Удалить карточку</button>
          </div>

          <fieldset disabled={busy} className="ig-fields">
            <legend>{CARD_LABELS[card.kind]}</legend>
            <label>
              <span id="ig-card-title-label">Заголовок</span>
              <textarea aria-labelledby="ig-card-title-label" rows={2} value={card.title} onChange={(event) => editCard({ title: event.target.value })} />
            </label>
            <label>
              <span id="ig-card-detail-label">Пояснение</span>
              <textarea aria-labelledby="ig-card-detail-label" rows={2} value={card.detail} onChange={(event) => editCard({ detail: event.target.value })} />
            </label>
            {card.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="ig-row-editor">
                <div className="ig-row-header">
                  <label>
                    {card.kind === 'answer' ? 'Задание по-русски' : card.kind === 'conjugation' ? 'Местоимение' : card.kind === 'comparison' ? 'Название колонки' : 'Метка блока'} {rowIndex + 1}
                    <input type="text" value={row.label} onChange={(event) => editRow(rowIndex, { label: event.target.value })} />
                  </label>
                  <button
                    type="button"
                    aria-label={`Удалить блок ${rowIndex + 1}`}
                    onClick={() => editCard({ rows: card.rows.filter((_, i) => i !== rowIndex) })}
                  >Удалить блок</button>
                </div>
                <label>
                  <span id={`ig-row-text-${rowIndex}`}>
                    {card.kind === 'answer' ? 'Ответ по-испански' : card.kind === 'question' ? 'Задание по-русски' : card.kind === 'conjugation' ? 'Форма глагола' : 'Текст блока'} {rowIndex + 1}
                  </span>
                  <textarea aria-labelledby={`ig-row-text-${rowIndex}`} rows={2} value={row.text} onChange={(event) => editRow(rowIndex, { text: event.target.value })} />
                </label>
                <label>
                  <span id={`ig-row-note-${rowIndex}`}>
                    {card.kind === 'answer' ? 'Другие варианты ответа' : 'Перевод или подсказка'}
                  </span>
                  <textarea aria-labelledby={`ig-row-note-${rowIndex}`} rows={2} value={row.note} onChange={(event) => editRow(rowIndex, { note: event.target.value })} />
                </label>
              </div>
            ))}
            <button
              type="button"
              disabled={card.rows.length >= cardRowLimit(card.kind)}
              onClick={() => editCard({ rows: [...card.rows, { text: '', note: '', label: '' }] })}
            >+ Добавить блок текста</button>
            <p className="ig-hint">Две звёздочки с каждой стороны выделяют фразу. Например, **quiero**.</p>
          </fieldset>

          <div className="ig-add">
            <label>
              <span id="ig-new-kind-label">Тип новой карточки</span>
              <select aria-labelledby="ig-new-kind-label" value={nextKind} disabled={count >= MAX_CARDS || busy} onChange={(event) => setNextKind(event.target.value as CardKind)}>
                {cardKinds.map((kind) => <option key={kind} value={kind}>{CARD_LABELS[kind]}</option>)}
              </select>
            </label>
            <button type="button" disabled={count >= MAX_CARDS || busy} onClick={addCard}>+ Добавить карточку</button>
          </div>
        </section>

        <section className="ig-panel" aria-labelledby="ig-export-heading">
          <div className="ig-panel-heading">
            <h2 id="ig-export-heading">Публикация</h2>
          </div>
          <label>
            <span id="ig-caption-label">Подпись к посту</span>
            <textarea
              ref={caption}
              aria-labelledby="ig-caption-label"
              value={draft.caption}
              disabled={busy}
              rows={5}
              onChange={(event) => updateDraft({ ...draft, caption: event.target.value })}
            />
          </label>
          <div className="ig-actions ig-caption-actions">
            <button type="button" disabled={busy || !draft.caption} onClick={() => void copyCaption()}>Скопировать подпись</button>
            <button type="button" disabled={busy} onClick={() => downloadFile(new Blob([draft.caption], { type: 'text/plain;charset=utf-8' }), 'caption.txt')}>Скачать TXT</button>
          </div>
          <p className="ig-hint">В архиве — PNG по порядку и подпись к публикации.</p>
          {!saved && <p className="ig-message ig-error" role="status">Браузер не сохранил черновик. Скачай файлы перед уходом со страницы.</p>}
          {captionStatus && <p className="ig-message" role="status">{captionStatus}</p>}
        </section>
      </div>
    </div>
  )
}
