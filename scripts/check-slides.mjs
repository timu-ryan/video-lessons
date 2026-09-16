/**
 * Проверка вёрстки слайдов: прогоняет каждый слайд и каждый шаг урока
 * в холсте 1920×1080 и проверяет три вещи, которые нельзя ловить на глаз:
 *
 *   1. ничего не заезжает в зону камеры (правый нижний угол 520×380);
 *   2. нет текста мельче 32px — видео смотрят с телефона;
 *   3. ничего не вылезает за пределы холста.
 *
 * Запуск: сначала `npm run dev`, потом `npm run check:slides`.
 * Флаги: --shots — сложить скриншоты слайдов в .shots/
 *        --url=http://localhost:5173 — другой адрес dev-сервера
 *        --lesson=10 — какой урок проверять (по умолчанию — первый в lessons/)
 */
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'

const arg = (name, fallback) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`))
  return found ? found.slice(name.length + 3) : fallback
}

const BASE = arg('url', 'http://localhost:5173')
const firstLesson = () =>
  readdirSync('lessons')
    .flatMap((name) => /^lesson-(\d+)\.json$/.exec(name)?.[1] ?? [])
    .map(Number)
    .sort((a, b) => a - b)[0]
const LESSON = arg('lesson', String(firstLesson()))
const SHOTS = process.argv.includes('--shots')
const OUT = '.shots'

// Зона камеры в координатах холста.
const CAM = { x: 1920 - 520, y: 1080 - 380 }
const MIN_FONT = 32

// Проверяем во всех сочетаниях клавиш T и R: раскладка от них меняется.
const MODES = {
  'транскрипция + перевод': { transcription: true, translation: true },
  'только транскрипция': { transcription: true, translation: false },
  'без транскрипции и перевода': { transcription: false, translation: false },
}

if (SHOTS) mkdirSync(OUT, { recursive: true })

let failed = checkIpa()

/**
 * Запись в поле `ipa` — фонемная (см. features/lessons/source.ts): смычные
 * b, d, g пишутся одинаково везде. Аппроксиманты β ð ɣ и боковое ʎ — признак
 * того, что генератор сполз к более узкой записи; в файле их быть не должно.
 */
function checkIpa() {
  const FORBIDDEN = 'βðɣʎ'
  const problems = []

  for (const name of readdirSync('lessons').filter((f) => f.endsWith('.json'))) {
    const lesson = JSON.parse(readFileSync(`lessons/${name}`, 'utf8'))
    for (const [index, slide] of lesson.slides.entries()) {
      const phrases = [
        ...(slide.rows ?? []),
        ...(slide.lines ?? []),
        ...(slide.examples ?? []),
        ...(slide.left?.items ?? []),
        ...(slide.right?.items ?? []),
        ...(slide.phrase ? [slide.phrase] : []),
      ]
      for (const phrase of phrases) {
        if (!phrase.ipa) continue
        const found = [...phrase.ipa].filter((c) => FORBIDDEN.includes(c))
        if (found.length > 0) {
          problems.push(
            `${name}, слайд ${index}: «${phrase.ipa}» — запись не фонемная (${[...new Set(found)].join(' ')})`,
          )
        }
      }
    }
  }

  console.log(`\n▸ транскрипция: ${problems.length === 0 ? '✓ конвенция соблюдена' : `✗ нарушений: ${problems.length}`}`)
  for (const p of problems) console.log('    ' + p)
  return problems.length
}

const browser = await chromium.launch()

for (const [modeName, mode] of Object.entries(MODES)) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const problems = []
  page.on('pageerror', (e) => problems.push(`ошибка страницы: ${e.message}`))
  await page.addInitScript((settings) => {
    localStorage.setItem(
      'video-lessons.settings.v1',
      JSON.stringify({ ...settings, safeZone: false, progress: true, theme: 'sand' }),
    )
  }, mode)

  await page.goto(`${BASE}/#/lesson/${LESSON}/0/0`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)

  const steps = await page.evaluate(async (lessonId) => {
    const { getLesson } = await import('/src/features/lessons/registry.ts')
    const { stepCount } = await import('/src/features/slides/steps.ts')
    return getLesson(lessonId).slides.map(stepCount)
  }, LESSON)

  let smallest = { size: Infinity, text: '', where: '' }

  for (let i = 0; i < steps.length; i++) {
    for (let s = 0; s < steps[i]; s++) {
      await page.evaluate(
        ([lessonId, i, s]) => {
          window.location.hash = `#/lesson/${lessonId}/${i}/${s}`
        },
        [LESSON, i, s],
      )
      await page.waitForTimeout(120)

      const boxes = await page.evaluate(() => {
        const canvas = document.querySelector('#root div > div')
        const base = (canvas ?? document.body).getBoundingClientRect()

        // Скрытые шаги занимают место, но текстом на экране не являются.
        const visible = (el) => {
          let node = el
          let opacity = 1
          while (node && node !== document.body) {
            const style = getComputedStyle(node)
            if (style.visibility === 'hidden' || style.display === 'none') return false
            if (node.getAttribute('aria-hidden') === 'true') return false
            opacity *= Number.parseFloat(style.opacity)
            node = node.parentElement
          }
          return opacity >= 0.05
        }

        const out = []
        for (const el of (canvas ?? document.body).querySelectorAll('*')) {
          const hasText = [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
          )
          if (!hasText || !visible(el)) continue
          const r = el.getBoundingClientRect()
          out.push({
            text: el.textContent.trim().slice(0, 50),
            fontSize: Number.parseFloat(getComputedStyle(el).fontSize),
            left: Math.round(r.left - base.left),
            top: Math.round(r.top - base.top),
            right: Math.round(r.right - base.left),
            bottom: Math.round(r.bottom - base.top),
          })
        }
        return { out, w: base.width, h: base.height }
      })

      if (Math.round(boxes.w) !== 1920 || Math.round(boxes.h) !== 1080) {
        problems.push(`слайд ${i}: холст ${boxes.w}×${boxes.h}, ожидался 1920×1080`)
      }

      for (const b of boxes.out) {
        if (b.fontSize < smallest.size) {
          smallest = { size: b.fontSize, text: b.text, where: `${i}/${s}` }
        }
        if (b.fontSize < MIN_FONT) {
          problems.push(`слайд ${i}/${s}: шрифт ${b.fontSize}px < ${MIN_FONT}px — «${b.text}»`)
        }
        if (b.right > CAM.x && b.bottom > CAM.y) {
          problems.push(`слайд ${i}/${s}: заезд в зону камеры — «${b.text}»`)
        }
        if (b.left < 0 || b.top < 0 || b.right > 1920 || b.bottom > 1080) {
          problems.push(
            `слайд ${i}/${s}: выход за холст [${b.left},${b.top},${b.right},${b.bottom}] — «${b.text}»`,
          )
        }
      }

      if (SHOTS && s === steps[i] - 1) {
        await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.png` })
      }
    }
  }

  const states = steps.reduce((a, b) => a + b, 0)
  console.log(`\n▸ ${modeName}: слайдов ${steps.length}, состояний ${states}`)
  console.log(`  самый мелкий текст: ${smallest.size}px — «${smallest.text}» (${smallest.where})`)
  if (problems.length === 0) {
    console.log('  ✓ нарушений нет')
  } else {
    failed += problems.length
    console.log(`  ✗ нарушений: ${problems.length}`)
    for (const p of problems.slice(0, 30)) console.log('    ' + p)
  }

  await page.close()
}

await browser.close()
process.exit(failed === 0 ? 0 : 1)
