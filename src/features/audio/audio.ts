/**
 * Аудио урока. Файла может не быть — тогда ничего не происходит и на
 * основном экране (который пишется в OBS) не появляется никаких ошибок.
 */

export function audioUrl(audioDir: string, id: string): string {
  return `${import.meta.env.BASE_URL}audio/${audioDir}/${id}.mp3`
}

let current: HTMLAudioElement | null = null

/** Проиграть фразу, прервав предыдущую. Ошибки глотаем намеренно. */
export function playPhrase(audioDir: string, id: string): void {
  try {
    current?.pause()
    const el = new Audio(audioUrl(audioDir, id))
    current = el
    void el.play().catch(() => {
      /* нет файла или браузер не дал автоплей — тишина вместо ошибки */
    })
  } catch {
    /* тишина */
  }
}

export function stopAudio(): void {
  try {
    current?.pause()
  } catch {
    /* тишина */
  }
  current = null
}

const probes = new Map<string, Promise<boolean>>()

/**
 * Есть ли файл озвучки. Нужно только окну докладчика — на основном экране
 * наличие аудио не показывается. Dev-сервер на несуществующий путь может
 * отдать index.html, поэтому проверяем и тип содержимого.
 */
export function probeAudio(audioDir: string, id: string): Promise<boolean> {
  const url = audioUrl(audioDir, id)
  const cached = probes.get(url)
  if (cached) return cached
  const probe = fetch(url, { method: 'HEAD' })
    .then((res) => {
      if (!res.ok) return false
      const type = res.headers.get('content-type') ?? ''
      return !type.includes('text/html')
    })
    .catch(() => false)
  probes.set(url, probe)
  return probe
}
