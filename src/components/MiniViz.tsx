import { useEffect, useRef } from 'react'
import { generateSteps } from '../algorithms/sorting'
import type { Algorithm, Step as SortStep } from '../algorithms/sorting'
import { generateSearchSteps } from '../algorithms/searching'
import type { SearchAlgorithm, SearchStep } from '../algorithms/searching'
import { DEFAULT_GRAPH_TEXT, generateGraphSteps, parseGraph } from '../algorithms/graph'
import type { GraphAlgorithm, GraphStep } from '../algorithms/graph'
import { generateDPSteps } from '../algorithms/dp'
import type { DPAlgorithm, DPStep } from '../algorithms/dp'
import type { ModuleId } from '../algorithms/registry'

// A tiny dot-matrix "phosphor" display that loops a real run of each algorithm.
// Everything is painted into a coarse grid of square dots; lit dots fade out slowly
// (phosphor persistence) so motion leaves a short trail, like the 3D computer's screen.

const PITCH = 4            // css px between dot centres
const DOT = 2              // dot size in css px
const IDLE_MS = 420        // step interval while idle
const FAST_MS = 75         // step interval while hovered / selected
const HOLD = 7             // extra ticks to hold the final frame before looping

type Painter = { paint: (g: Grid, frame: number) => void; frames: number }
type Grid = { cols: number; rows: number; set: (x: number, y: number, lvl: number) => void }

const SORT_INPUT: Record<Algorithm, number[]> = {
  bubble: [6, 2, 9, 4, 7, 1, 8, 3, 10, 5],
  selection: [8, 3, 10, 1, 6, 9, 2, 7, 4, 5],
  insertion: [4, 9, 2, 7, 1, 10, 5, 8, 3, 6],
  merge: [7, 2, 10, 5, 1, 8, 3, 9, 6, 4]
}
const SEARCH_INPUT = [2, 5, 7, 11, 14, 18, 21, 25, 29, 33, 38, 42]

function rect(g: Grid, x: number, y: number, w: number, h: number, lvl: number) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g.set(i, j, lvl)
}
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, lvl: number, dotted = false) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let k = 0; k <= n; k++) if (!dotted || k % 2 === 0) g.set(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), lvl)
}
function disc(g: Grid, cx: number, cy: number, r: number, lvl: number, hollow = false) {
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const d = i * i + j * j
    if (d <= r * r + r * .8 && (!hollow || d >= (r - 1) * (r - 1) + .5)) g.set(cx + i, cy + j, lvl)
  }
}

function barsPainter(values: number[], levelOf: (i: number) => number, g: Grid, marker?: number) {
  const n = values.length, max = Math.max(...values, 1)
  const slot = Math.floor(g.cols / n), w = Math.max(1, slot - 1), x0 = Math.floor((g.cols - slot * n) / 2)
  const base = g.rows - (marker === undefined ? 1 : 3), hMax = base - 1
  values.forEach((v, i) => {
    const h = Math.max(1, Math.round(v / max * hMax)), lvl = levelOf(i)
    if (lvl > 0) rect(g, x0 + i * slot, base - h, w, h, lvl)
  })
  if (marker !== undefined && marker >= 0) {
    const cx = x0 + marker * slot + Math.floor(w / 2)
    g.set(cx, g.rows - 2, 4); g.set(cx - 1, g.rows - 1, 3); g.set(cx, g.rows - 1, 3); g.set(cx + 1, g.rows - 1, 3)
  }
}

function makePainter(id: ModuleId, category: string): Painter {
  if (category === 'sorting') {
    const steps: SortStep[] = generateSteps(SORT_INPUT[id as Algorithm], id as Algorithm)
    return {
      frames: steps.length,
      paint: (g, f) => {
        const s = steps[f]
        barsPainter(s.array, i => s.swapped.includes(i) ? 4 : s.comparing.includes(i) ? 3 : s.sorted.includes(i) ? 2 : 1, g)
      }
    }
  }
  if (category === 'searching') {
    const steps: SearchStep[] = generateSearchSteps(SEARCH_INPUT, 29, id as SearchAlgorithm)
    return {
      frames: steps.length,
      paint: (g, f) => {
        const s = steps[f]
        barsPainter(s.array, i => {
          if (s.found === i) return 4
          if (s.checking.includes(i)) return 4
          if (s.eliminated.includes(i)) return 0
          if (s.range && (i < s.range[0] || i > s.range[1])) return 0
          return s.range ? 2 : 1
        }, g, s.found ?? s.checking[0] ?? -1)
      }
    }
  }
  if (category === 'graph') {
    const { graph } = parseGraph(DEFAULT_GRAPH_TEXT)
    const steps: GraphStep[] = generateGraphSteps(graph, 'A', id as GraphAlgorithm)
    const key = (a: string, b: string) => a < b ? a + b : b + a
    return {
      frames: steps.length,
      paint: (g, f) => {
        const s = steps[f]
        const sx = (x: number) => Math.round(3 + (x - 70) / 540 * (g.cols - 7))
        const sy = (y: number) => Math.round(3 + (y - 40) / 245 * (g.rows - 7))
        const pos = new Map(graph.nodes.map(n => [n.id, [sx(n.x), sy(n.y)] as const]))
        const tree = new Set(s.treeEdges.map(([a, b]) => key(a, b)))
        const active = s.activeEdge ? key(...s.activeEdge) : ''
        for (const e of graph.edges) {
          const [x0, y0] = pos.get(e.a)!, [x1, y1] = pos.get(e.b)!, k = key(e.a, e.b)
          line(g, x0, y0, x1, y1, k === active ? 4 : tree.has(k) ? 2 : 1, k !== active && !tree.has(k))
        }
        for (const n of graph.nodes) {
          const [x, y] = pos.get(n.id)!
          if (s.current === n.id) { disc(g, x, y, 2, 4); disc(g, x, y, 4, 2, true) }
          else if (s.visited.includes(n.id)) disc(g, x, y, 2, 3)
          else if (s.frontier.includes(n.id)) disc(g, x, y, 2, 3, true)
          else disc(g, x, y, 1, 1)
        }
      }
    }
  }
  const steps: DPStep[] = generateDPSteps(id as DPAlgorithm, { n: 11, f0: 0, f1: 1, items: [{ w: 1, v: 1 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 7 }], capacity: 8, x: 'ABCBD', y: 'BDCAB' })
  return {
    frames: steps.length,
    paint: (g, f) => {
      const s = steps[f], R = s.table.length, C = s.table[0]?.length ?? 1
      const isDep = (r: number, c: number) => s.deps.some(([a, b]) => a === r && b === c)
      if (R === 1) {
        // 1D table: cells with a bar showing the value's size
        const vals = s.table[0]
        barsPainter(vals.map(v => v === null ? 0 : Math.max(1, v)), i => {
          if (s.active && s.active[1] === i) return 4
          if (isDep(0, i)) return 3
          return vals[i] === null ? 0 : 2
        }, g)
        return
      }
      const cw = Math.max(2, Math.floor((g.cols + 1) / C)), ch = Math.max(2, Math.floor((g.rows + 1) / R))
      const x0 = Math.floor((g.cols - (cw * C - 1)) / 2), y0 = Math.floor((g.rows - (ch * R - 1)) / 2)
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const active = s.active && s.active[0] === r && s.active[1] === c
        const v = s.table[r][c]
        const lvl = active ? 4 : isDep(r, c) ? 3 : v === null ? 0 : v > 0 ? 2 : 1
        if (lvl > 0) rect(g, x0 + c * cw, y0 + r * ch, cw - 1, ch - 1, lvl)
        else g.set(x0 + c * cw + Math.floor((cw - 1) / 2), y0 + r * ch + Math.floor((ch - 1) / 2), 1)
      }
    }
  }
}

// ---- one shared animation loop for every mini display ----
type Sub = (now: number) => void
const subs = new Set<Sub>()
let raf = 0, last = 0
function loop(now: number) {
  raf = subs.size ? requestAnimationFrame(loop) : 0
  if (now - last < 32) return          // ~30fps is plenty for phosphor fades
  last = now
  subs.forEach(fn => fn(now))
}
function subscribe(fn: Sub) {
  subs.add(fn)
  if (!raf) raf = requestAnimationFrame(loop)
  return () => { subs.delete(fn) }
}

const PALETTE = {
  dark: { off: 'rgba(165,230,109,.075)', lit: ['', 'rgba(165,230,109,.34)', 'rgba(165,230,109,.62)', '#a5e66d', '#eaffd6'], glow: 'rgba(190,255,150,.85)' },
  light: { off: 'rgba(47,106,29,.10)', lit: ['', 'rgba(47,106,29,.32)', 'rgba(47,106,29,.6)', '#2f6a1d', '#0d2f04'], glow: '' }
}
const LEVEL_ALPHA = [0, .34, .62, 1, 1]

export default function MiniViz({ id, category, fast, light }: { id: ModuleId; category: string; fast: boolean; light: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const fastRef = useRef(fast)
  const lightRef = useRef(light)
  fastRef.current = fast
  lightRef.current = light

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const painter = makePainter(id, category)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cols = 0, rows = 0, dpr = 1
    let target = new Uint8Array(0), shown = new Float32Array(0), hot = new Uint8Array(0)
    let frame = reduced ? Math.floor(painter.frames * .55) : 0, acc = 0, prev = performance.now(), visible = true, dirty = true

    const grid: Grid = {
      get cols() { return cols }, get rows() { return rows },
      set(x, y, lvl) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) return
        const k = y * cols + x
        if (lvl > target[k]) target[k] = lvl
      }
    }
    const fit = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (!w || !h) return
      dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      cols = Math.floor(w / PITCH); rows = Math.floor(h / PITCH)
      target = new Uint8Array(cols * rows); shown = new Float32Array(cols * rows); hot = new Uint8Array(cols * rows)
      dirty = true
    }
    const compose = () => {
      target.fill(0)
      painter.paint(grid, Math.min(frame, painter.frames - 1))
      dirty = false
    }
    const render = () => {
      const pal = lightRef.current ? PALETTE.light : PALETTE.dark
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ox = Math.floor((canvas.clientWidth - cols * PITCH) / 2) + (PITCH - DOT) / 2
      const oy = Math.floor((canvas.clientHeight - rows * PITCH) / 2) + (PITCH - DOT) / 2
      ctx.fillStyle = pal.off
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (shown[y * cols + x] < .05) ctx.fillRect(ox + x * PITCH, oy + y * PITCH, DOT, DOT)
      for (let k = 0; k < shown.length; k++) {
        const t = target[k]
        // phosphor: rise instantly, decay over a few frames
        const goal = LEVEL_ALPHA[t]
        shown[k] = goal >= shown[k] ? goal : shown[k] * .78
        if (t) hot[k] = t
        else if (shown[k] < .05) hot[k] = 0
        if (shown[k] < .05) continue
        const lvl = t || Math.max(1, hot[k] - 1)
        ctx.globalAlpha = t ? 1 : Math.min(1, shown[k] / LEVEL_ALPHA[Math.max(1, hot[k])])
        ctx.fillStyle = pal.lit[lvl]
        const x = k % cols, y = (k - x) / cols
        if (lvl === 4 && pal.glow) { ctx.shadowColor = pal.glow; ctx.shadowBlur = 6 } else ctx.shadowBlur = 0
        ctx.fillRect(ox + x * PITCH, oy + y * PITCH, DOT, DOT)
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
    }

    const ro = new ResizeObserver(fit); ro.observe(canvas); fit()
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }); io.observe(canvas)
    const unsub = subscribe(now => {
      if (!visible || document.hidden || !cols) { prev = now; return }
      if (!reduced) {
        acc += now - prev
        const interval = fastRef.current ? FAST_MS : IDLE_MS
        if (acc > interval * 4) acc = interval
        while (acc >= interval) { acc -= interval; frame = (frame + 1) % (painter.frames + HOLD); dirty = true }
      }
      prev = now
      if (dirty) compose()
      render()
    })
    return () => { unsub(); ro.disconnect(); io.disconnect() }
  }, [id, category])

  return <canvas ref={ref} className="mini-viz" aria-hidden="true" />
}
