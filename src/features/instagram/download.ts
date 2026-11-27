import { cardFilename, drawCard, loadCardFonts } from './card-canvas'
import { carouselStamp, type CarouselSource, type Draft } from './draft'

interface ArchiveFile {
  name: string
  data: ArrayBuffer
}

export class CardOverflow extends Error {
  index: number

  constructor(index: number) {
    super(`Текст не помещается на карточке ${index + 1}. Разбей его на две карточки или сократи.`)
    this.index = index
  }
}

export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function renderPng({ cards, theme, coverStyle }: Draft, source: CarouselSource, index: number): Promise<Blob> {
  const card = cards[index]
  if (!card) throw new Error('Карточка не найдена.')
  const canvas = document.createElement('canvas')
  if (!drawCard(canvas, card, carouselStamp(source), index, cards.length, theme, coverStyle)) throw new CardOverflow(index)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Браузер не смог создать PNG.'))
    }, 'image/png')
  })
}

export async function exportCard(source: CarouselSource, draft: Draft, index: number): Promise<Blob> {
  const card = draft.cards[index]
  if (!card) throw new Error('Карточка не найдена.')
  await loadCardFonts([card])
  return renderPng(draft, source, index)
}

export async function exportCarousel(source: CarouselSource, draft: Draft): Promise<Blob> {
  await loadCardFonts(draft.cards)
  const files: ArchiveFile[] = []
  for (let index = 0; index < draft.cards.length; index++) {
    const png = await renderPng(draft, source, index)
    files.push({ name: cardFilename(index), data: await png.arrayBuffer() })
  }
  files.push({ name: 'caption.txt', data: await new Blob([draft.caption]).arrayBuffer() })
  return storedZip(files)
}

function crc32(data: ArrayBuffer): number {
  let crc = 0xffffffff
  for (const byte of new Uint8Array(data)) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** ZIP без сжатия: PNG уже сжаты, имена файлов в архиве ASCII. */
function storedZip(files: ArchiveFile[]): Blob {
  const payload: BlobPart[] = []
  const directory: ArrayBuffer[] = []
  let offset = 0
  let directorySize = 0
  for (const { name, data } of files) {
    const filename = new TextEncoder().encode(name)
    const size = data.byteLength
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30 + filename.length))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(12, 33, true) // 1 января 1980, начало диапазона ZIP
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true)
    local.setUint32(22, size, true)
    local.setUint16(26, filename.length, true)
    new Uint8Array(local.buffer, 30).set(filename)
    payload.push(local.buffer, data)

    const entry = new DataView(new ArrayBuffer(46 + filename.length))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(14, 33, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, size, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, filename.length, true)
    entry.setUint32(42, offset, true)
    new Uint8Array(entry.buffer, 46).set(filename)
    directory.push(entry.buffer)
    directorySize += entry.byteLength
    offset += local.byteLength + size
  }

  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true)
  return new Blob([...payload, ...directory, end.buffer], { type: 'application/zip' })
}
