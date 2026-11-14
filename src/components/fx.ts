// Small helpers for visualizer effects: element identity tracking (for swap animations)
// and a tiny WebAudio beeper (for the optional "sound of sorting").

/**
 * Give every array element a stable id across steps so the UI can animate it moving.
 * Unchanged slots keep their id; changed slots are matched to the nearest changed slot
 * in the previous step holding the same value. Values that appear from nowhere get new ids.
 */
export function trackIds(arrays: number[][]): number[][] {
  if (!arrays.length) return []
  let prevArr = arrays[0]
  let prevIds = prevArr.map((_, i) => i)
  let next = prevArr.length
  const out: number[][] = [prevIds]
  for (let k = 1; k < arrays.length; k++) {
    const arr = arrays[k]
    if (arr === prevArr || (arr.length === prevArr.length && arr.every((v, i) => v === prevArr[i]))) { out.push(prevIds); prevArr = arr; continue }
    const ids = new Array<number>(arr.length)
    const freePrev: number[] = []
    const changed: number[] = []
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === prevArr[i]) ids[i] = prevIds[i]
      else { changed.push(i); freePrev.push(i) }
    }
    const used = new Set<number>()
    for (const i of changed) {
      let best = -1, bestD = Infinity
      for (const j of freePrev) if (!used.has(j) && prevArr[j] === arr[i] && Math.abs(j - i) < bestD) { best = j; bestD = Math.abs(j - i) }
      if (best >= 0) { used.add(best); ids[i] = prevIds[best] } else ids[i] = next++
    }
    out.push(ids)
    prevArr = arr; prevIds = ids
  }
  return out
}

let audio: AudioContext | null = null

export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch { audio = null }
}

export function beep(freq: number, opts: { dur?: number; delay?: number; type?: OscillatorType; vol?: number } = {}) {
  if (!audio) return
  const { dur = .07, delay = 0, type = 'triangle', vol = .05 } = opts
  const t = audio.currentTime + delay
  const osc = audio.createOscillator(), gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + .006)
  gain.gain.exponentialRampToValueAtTime(.0001, t + dur)
  osc.connect(gain).connect(audio.destination)
  osc.start(t); osc.stop(t + dur + .02)
}

/** Map a value onto a pleasant beep range. */
export const pitch = (v: number, max: number) => 200 + (Math.max(0, v) / Math.max(1, max)) * 820

export function chime() {
  ;[523, 659, 784, 1047].forEach((f, i) => beep(f, { delay: i * .07, dur: .14, vol: .045 }))
}

export function readPref(key: string, fallback: boolean) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1' } catch { return fallback }
}
export function writePref(key: string, v: boolean) {
  try { localStorage.setItem(key, v ? '1' : '0') } catch { /* storage unavailable */ }
}
