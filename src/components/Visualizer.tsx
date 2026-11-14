import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Code2, Pause, Play, Plus, RotateCcw, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import { beep, chime, pitch, readPref, trackIds, unlockAudio, writePref } from './fx'
import Typewriter from './Typewriter'
import { generateSteps } from '../algorithms/sorting'
import type { Algorithm, Step as SortStep } from '../algorithms/sorting'
import { generateSearchSteps } from '../algorithms/searching'
import type { SearchAlgorithm, SearchStep } from '../algorithms/searching'
import { DEFAULT_GRAPH_TEXT, generateGraphSteps, parseGraph, randomGraphText } from '../algorithms/graph'
import type { Graph, GraphAlgorithm, GraphStep } from '../algorithms/graph'
import { DEFAULT_ITEMS, DP_LIMITS, generateDPSteps, randomItems, randomString } from '../algorithms/dp'
import type { DPAlgorithm, DPStep, Item } from '../algorithms/dp'
import { byCategory, categories } from '../algorithms/registry'
import type { ModuleDef } from '../algorithms/registry'

type T = (en: string, zh: string) => string
type AnyStep = { line: number; description: string }
const DEFAULT_ARRAY = '32, 24, 77, 35, 49, 64, 53, 89, 42'

export default function Visualizer({ mod, t, zh, onLibrary }: { mod: ModuleDef; t: T; zh: boolean; onLibrary: () => void }) {
  const [values, setValues] = useState(DEFAULT_ARRAY)
  const [target, setTarget] = useState('53')
  const [start, setStart] = useState('A')
  const [graphText, setGraphText] = useState(DEFAULT_GRAPH_TEXT)
  const [posOverride, setPosOverride] = useState<Record<string, { x: number; y: number }>>({})
  const [fibN, setFibN] = useState(12)
  const [f0, setF0] = useState('0')
  const [f1, setF1] = useState('1')
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS)
  const [capacity, setCapacity] = useState(7)
  const [strX, setStrX] = useState('ABCBDAB')
  const [strY, setStrY] = useState('BDCABA')
  const [speed, setSpeed] = useState(550)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [soundOn, setSoundOn] = useState(() => readPref('algolens-sound', false))

  const parsed = useMemo(() => values.split(',').map(v => Number(v.trim())).filter(v => values.trim() !== '' && Number.isFinite(v)), [values])
  const arr = parsed.length >= 2 ? parsed.slice(0, 100) : [5, 2]

  const { graph: parsedGraph, error: graphError } = useMemo(() => parseGraph(graphText), [graphText])
  const graph: Graph = useMemo(() => ({ ...parsedGraph, nodes: parsedGraph.nodes.map(n => posOverride[n.id] ? { ...n, ...posOverride[n.id] } : n) }), [parsedGraph, posOverride])
  const graphStart = parsedGraph.nodes.some(n => n.id === start) ? start : parsedGraph.nodes[0].id

  const steps: AnyStep[] = useMemo(() => {
    switch (mod.category) {
      case 'sorting': return generateSteps(arr, mod.id as Algorithm)
      case 'searching': return generateSearchSteps(arr, Number(target) || 0, mod.id as SearchAlgorithm)
      case 'graph': return generateGraphSteps(parsedGraph, graphStart, mod.id as GraphAlgorithm)
      case 'dp': return generateDPSteps(mod.id as DPAlgorithm, { n: fibN, f0: Number(f0) || 0, f1: Number(f1) || 0, items, capacity, x: strX.replace(/\s/g, ''), y: strY.replace(/\s/g, '') })
    }
  }, [mod, values, target, parsedGraph, graphStart, fibN, f0, f1, items, capacity, strX, strY]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = steps[Math.min(step, steps.length - 1)]
  const done = steps.length > 1 && step >= steps.length - 1
  const ids = useMemo(() => mod.category === 'sorting' ? trackIds((steps as SortStep[]).map(s => s.array)) : null, [steps, mod.category])
  const marks = useMemo(() => steps.map((st, i): string => {
    if (mod.category === 'sorting') return (st as SortStep).swapped.length ? 'swap' : ''
    if (mod.category === 'searching') return (st as SearchStep).found !== null ? 'find' : ''
    if (mod.category === 'graph') return i > 0 && (st as GraphStep).visited.length > (steps[i - 1] as GraphStep).visited.length ? 'visit' : ''
    return (st as DPStep).active && i > 0 && (st as DPStep).table.flat().filter(v => v !== null).length > (steps[i - 1] as DPStep).table.flat().filter(v => v !== null).length ? 'fill' : ''
  }), [steps, mod.category])
  const go = (next: number) => { setStep(Math.max(0, Math.min(steps.length - 1, next))); setPlaying(false) }
  const reset = () => { setStep(0); setPlaying(false) }
  const edit = <V,>(fn: (v: V) => void) => (v: V) => { fn(v); reset() }
  const setItem = (i: number, key: 'w' | 'v', v: string) => edit(setItems)(items.map((it, k) => k === i ? { ...it, [key]: Math.max(0, Math.min(99, Number(v) || 0)) } : it))

  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(() => setStep(s => {
      if (s >= steps.length - 1) { setPlaying(false); return s }
      return s + 1
    }), speed)
    return () => window.clearTimeout(id)
  }, [playing, step, speed, steps.length])

  // Keyboard: Space = run/pause, arrows = step, Home = reset.
  const playRef = useRef(() => {})
  playRef.current = () => { if (step >= steps.length - 1) setStep(0); setPlaying(p => !p) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Space') { e.preventDefault(); playRef.current() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); setStep(s => Math.max(0, s - 1)) }
      else if (e.key === 'Home') { e.preventDefault(); setPlaying(false); setStep(0) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.length])

  // Sound of sorting: beep per step, pitched by the values involved.
  useEffect(() => {
    if (!soundOn) return
    if (done) { chime(); return }
    if (mod.category === 'sorting' || mod.category === 'searching') {
      const st = current as SortStep & SearchStep
      const max = Math.max(1, ...st.array)
      const idx = mod.category === 'sorting' ? st.comparing : st.checking
      idx.forEach((i, k) => beep(pitch(st.array[i], max), { delay: k * .035, type: (st as SortStep).swapped?.length ? 'square' : 'triangle', vol: .04 }))
    } else if (mod.category === 'graph') {
      const st = current as GraphStep
      const k = st.current ? parsedGraph.nodes.findIndex(n => n.id === st.current) : -1
      if (k >= 0) beep(pitch(k + 1, parsedGraph.nodes.length + 1), { vol: .04 })
    } else {
      const st = current as DPStep
      if (st.active) { const v = st.table[st.active[0]][st.active[1]]; const max = Math.max(1, ...st.table.flat().map(x => x ?? 0)); beep(pitch(v ?? 0, max), { vol: .035 }) }
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggleSound = () => { const v = !soundOn; if (v) { unlockAudio(); beep(660, { vol: .04 }) } setSoundOn(v); writePref('algolens-sound', v) }

  const cat = categories.find(c => c.id === mod.category)!
  const catIndex = categories.indexOf(cat) + 1
  const modIndex = byCategory(mod.category).findIndex(m => m.id === mod.id) + 1
  const name = zh ? mod.zh : mod.en

  return <main className="workspace visualizer-page page-enter">
    <div className="crumb"><button onClick={onLibrary}>{t('LIBRARY', '演算法庫')}</button><span>/</span><button onClick={onLibrary}>{zh ? cat.zh : cat.en}</button><span>/</span><strong>{name.toUpperCase()}</strong></div>
    <div className="visualizer-heading"><div><div className="eyebrow">{zh ? cat.zh : cat.en} {t('MODULE', '模組')} / {String(catIndex).padStart(2, '0')}.{String(modIndex).padStart(2, '0')}</div><h1><Typewriter text={name} /></h1></div><button className="outline-button" onClick={onLibrary}><ArrowLeft size={13} /> {t('BACK TO LIBRARY', '返回演算法庫')}</button></div>
    <div className="control-strip">
      <div className="control-group"><button className="run-button" onClick={() => { if (step >= steps.length - 1) setStep(0); setPlaying(!playing) }}>{playing ? <Pause size={13} /> : <Play size={13} />} {playing ? t('PAUSE', '暫停') : t('RUN', '執行')}</button><button onClick={() => go(step - 1)}><SkipBack size={13} /> {t('PREV', '上一步')}</button><button onClick={() => go(step + 1)}><SkipForward size={13} /> {t('NEXT', '下一步')}</button><button onClick={reset}><RotateCcw size={13} /> {t('RESET', '重設')}</button></div>
      <label className="speed-control">{t('SPEED', '速度')} <input type="range" min="80" max="1200" step="40" value={1280 - speed} onChange={e => setSpeed(1280 - Number(e.target.value))} /></label>
      <button className={`sound-toggle ${soundOn ? 'on' : ''}`} onClick={toggleSound} aria-pressed={soundOn} title={t('Sound of sorting', '排序音效')}>{soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />} {t('SOUND', '音效')} {soundOn ? 'ON' : 'OFF'}</button>
      <span className="step-count">{t('STEP', '步驟')} {String(step + 1).padStart(3, '0')} / {String(steps.length).padStart(3, '0')}</span>
    </div>
    <Timeline step={step} total={steps.length} marks={marks} t={t} category={mod.category} onSeek={i => { setPlaying(false); setStep(i) }} />
    <div className="visual-grid">
      <section className="panel chart-panel" data-id={`RASTER_${mod.category === 'graph' ? 'GRAPH' : mod.category === 'dp' ? 'TABLE' : 'ARR'}`}>
        {done && <FinishStamp text={finishText(mod.category, current, t)} />}
        {mod.category === 'sorting' && <SortView s={current as SortStep} t={t} algo={mod.id as Algorithm} ids={ids?.[Math.min(step, steps.length - 1)]} done={done} />}
        {mod.category === 'searching' && <SearchView s={current as SearchStep} t={t} target={Number(target) || 0} algo={mod.id as SearchAlgorithm} />}
        {mod.category === 'graph' && <GraphView s={current as GraphStep} t={t} algo={mod.id as GraphAlgorithm} graph={graph} onMove={(id, p) => setPosOverride(o => ({ ...o, [id]: p }))} />}
        {mod.category === 'dp' && <DPView s={current as DPStep} t={t} />}
        <div className="execution-state"><span className="green">&gt; STATE</span><span key={step}>{current.description}</span></div>
      </section>
      <section className="panel code-panel" data-id="ROM_LISTING"><div className="panel-heading"><span><Code2 size={13} /> <Typewriter text={t('PSEUDOCODE', '偽程式碼')} speed={30} holdCursor={900} /></span><span className="panel-tag">{t('SYNCED', '同步中')}</span></div><div className="code-lines">{mod.pseudocode.map((line, i) => <div className={current.line === i ? 'code-line active-line' : 'code-line'} key={i}><span>{String(i + 1).padStart(2, '0')}</span><code>{line}</code></div>)}</div><div className="panel-foot">{t('EXECUTION TRACE / LINE', '執行紀錄 / 行')} {String(current.line + 1).padStart(2, '0')}</div></section>
      <section className="panel input-panel" data-id="IO_PORT"><div className="panel-heading"><span><Typewriter text={t('INPUT CONFIGURATION', '輸入設定')} speed={24} holdCursor={900} /></span><span className="panel-tag">{t('CUSTOM', '自訂')}</span></div>
        {(mod.category === 'sorting' || mod.category === 'searching') && <>
          <label className="field-label">{t('ARRAY VALUES', '陣列數值')} <small>{t('COMMA SEPARATED · MAX 100', '以逗號分隔 · 最多 100 個')}</small></label>
          <textarea value={values} onChange={e => edit(setValues)(e.target.value)} spellCheck={false} />
          <div className="input-actions"><button onClick={() => edit(setValues)(Array.from({ length: 10 }, () => Math.floor(Math.random() * 90) + 8).join(', '))}><Shuffle size={12} /> {t('RANDOMIZE', '隨機產生')}</button><button onClick={() => edit(setValues)(DEFAULT_ARRAY)}>{t('DEFAULT', '預設值')}</button></div>
          {mod.category === 'searching' && <><label className="field-label">{t('TARGET VALUE', '目標值')}</label><input className="text-input" value={target} onChange={e => edit(setTarget)(e.target.value)} inputMode="numeric" /><div className="input-actions"><button onClick={() => edit(setTarget)(String(arr[Math.floor(Math.random() * arr.length)]))}><Shuffle size={12} /> {t('PICK FROM ARRAY', '從陣列挑選')}</button><button onClick={() => edit(setTarget)(String(Math.max(...arr) + 1))}>{t('MISSING VALUE', '不存在的值')}</button></div></>}
        </>}
        {mod.category === 'graph' && <>
          <label className="field-label">{t('EDGES', '邊')} <small>{t('A-B:WEIGHT, … · MAX 12 NODES', 'A-B:權重, … · 最多 12 個節點')}</small></label>
          <textarea value={graphText} onChange={e => edit(setGraphText)(e.target.value)} spellCheck={false} />
          {graphError && <div className="input-error">! {graphError}</div>}
          <div className="input-actions"><button onClick={() => { edit(setGraphText)(randomGraphText()); setPosOverride({}) }}><Shuffle size={12} /> {t('RANDOM GRAPH', '隨機圖')}</button><button onClick={() => { edit(setGraphText)(DEFAULT_GRAPH_TEXT); setPosOverride({}) }}>{t('DEFAULT', '預設值')}</button><button onClick={() => setPosOverride({})}>{t('AUTO LAYOUT', '自動排列')}</button></div>
          <label className="field-label">{t('START NODE', '起始節點')} <small>{t('DRAG NODES TO MOVE THEM', '可拖曳節點')}</small></label>
          <div className="node-picker">{parsedGraph.nodes.map(n => n.id).sort().map(id => <button key={id} className={id === graphStart ? 'picked' : ''} onClick={() => edit(setStart)(id)}>{id}</button>)}</div>
        </>}
        {mod.id === 'fib' && <>
          <label className="field-label">n <small>2 – {DP_LIMITS.fibMax}</small><b className="field-value">{fibN}</b></label>
          <input className="range-input" type="range" min={2} max={DP_LIMITS.fibMax} value={fibN} onChange={e => edit(setFibN)(Number(e.target.value))} />
          <div className="pair-fields"><label>F[0]<input className="text-input" value={f0} onChange={e => edit(setF0)(e.target.value)} inputMode="numeric" /></label><label>F[1]<input className="text-input" value={f1} onChange={e => edit(setF1)(e.target.value)} inputMode="numeric" /></label></div>
          <div className="input-actions"><button onClick={() => { edit(setF0)('0'); setF1('1') }}>{t('FIBONACCI 0,1', '費氏 0,1')}</button><button onClick={() => { edit(setF0)('2'); setF1('1') }}>{t('LUCAS 2,1', '盧卡斯 2,1')}</button></div>
        </>}
        {mod.id === 'knapsack' && <>
          <label className="field-label">{t('ITEMS', '物品')} <small>{t('WEIGHT / VALUE', '重量 / 價值')} · {t('MAX', '最多')} {DP_LIMITS.items}</small></label>
          <div className="item-editor">
            <div className="item-row item-head"><span>#</span><span>{t('WEIGHT', '重量')}</span><span>{t('VALUE', '價值')}</span><span /></div>
            {items.map((it, i) => <div className="item-row" key={i}><span>{i + 1}</span><input type="number" min={1} max={99} value={it.w} onChange={e => setItem(i, 'w', e.target.value)} /><input type="number" min={0} max={99} value={it.v} onChange={e => setItem(i, 'v', e.target.value)} /><button aria-label="Remove item" disabled={items.length <= 1} onClick={() => edit(setItems)(items.filter((_, k) => k !== i))}><X size={13} /></button></div>)}
          </div>
          <div className="input-actions"><button disabled={items.length >= DP_LIMITS.items} onClick={() => edit(setItems)([...items, { w: 2, v: 3 }])}><Plus size={12} /> {t('ADD ITEM', '新增物品')}</button><button onClick={() => edit(setItems)(randomItems())}><Shuffle size={12} /> {t('RANDOMIZE', '隨機產生')}</button><button onClick={() => edit(setItems)(DEFAULT_ITEMS)}>{t('DEFAULT', '預設值')}</button></div>
          <label className="field-label">{t('CAPACITY', '容量')} <small>1 – {DP_LIMITS.capacity}</small><b className="field-value">{capacity}</b></label>
          <input className="range-input" type="range" min={1} max={DP_LIMITS.capacity} value={capacity} onChange={e => edit(setCapacity)(Number(e.target.value))} />
        </>}
        {mod.id === 'lcs' && <>
          <label className="field-label">{t('STRING X', '字串 X')} <small>{t('MAX', '最多')} {DP_LIMITS.str}</small></label><input className="text-input" value={strX} maxLength={DP_LIMITS.str} onChange={e => edit(setStrX)(e.target.value)} />
          <label className="field-label">{t('STRING Y', '字串 Y')} <small>{t('MAX', '最多')} {DP_LIMITS.str}</small></label><input className="text-input" value={strY} maxLength={DP_LIMITS.str} onChange={e => edit(setStrY)(e.target.value)} />
          <div className="input-actions"><button onClick={() => { edit(setStrX)(randomString(6 + Math.floor(Math.random() * 5))); setStrY(randomString(6 + Math.floor(Math.random() * 5))) }}><Shuffle size={12} /> {t('RANDOMIZE', '隨機產生')}</button><button onClick={() => { edit(setStrX)(strY); setStrY(strX) }}>{t('SWAP X / Y', '交換 X / Y')}</button><button onClick={() => { edit(setStrX)('ABCBDAB'); setStrY('BDCABA') }}>{t('DEFAULT', '預設值')}</button></div>
        </>}
        <div className="complexity-grid">{Object.entries(mod.complexity).map(([k, v]) => <div key={k}><small>{k.toUpperCase()}</small><strong>{v}</strong></div>)}</div>
      </section>
    </div>
    <div className="bottom-status"><span>{t('MODULE:', '模組：')} {mod.id.toUpperCase()}</span><span>{zh ? cat.zh : cat.en}</span></div>
  </main>
}

type Legend = { cls: string; label: string }[]
function InfoStrip({ label, value, legend }: { label: string; value: string; legend: Legend }) {
  return <div className="info-strip">
    <div className="info-region"><span className="info-label">{label}</span><span className="info-value">{value}</span></div>
    <div className="info-legend">{legend.map(l => <span key={l.label}><i className={`sw ${l.cls}`} />{l.label}</span>)}</div>
  </div>
}

type Tag = { text: string; tone?: 'hot' | 'cold'; lift?: boolean }
function Bars({ array, cls, above = {}, below = {}, marks = {}, lanes = false, ids, sweep = false }: { array: number[]; cls: (i: number) => string; above?: Record<number, Tag>; below?: Record<number, Tag>; marks?: Record<number, string>; lanes?: boolean; ids?: number[]; sweep?: boolean }) {
  const max = Math.max(1, ...array.map(Math.abs))
  const dense = array.length > 16
  const chartRef = useRef<HTMLDivElement>(null)
  const prevPos = useRef<Map<number, number>>(new Map())
  // FLIP: when an element changes slot, slide its bar from the old column to the new one.
  useLayoutEffect(() => {
    const chart = chartRef.current
    if (!chart || !ids) { prevPos.current = new Map(); return }
    const cols = Array.from(chart.children) as HTMLElement[]
    const lefts = cols.map(c => c.offsetLeft)
    const prev = prevPos.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ids.forEach((id, pos) => {
      const from = prev.get(id)
      if (from === undefined || from === pos || reduce || lefts[from] === undefined) return
      const bar = cols[pos]?.querySelector('.bar') as HTMLElement | null
      if (!bar) return
      const dx = lefts[from] - lefts[pos]
      bar.style.transition = 'none'; void bar.offsetWidth
      requestAnimationFrame(() => { bar.style.transition = '' })
      bar.animate([
        { transform: `translate(${dx}px, 0)`, zIndex: 3 },
        { transform: `translate(${dx / 2}px, ${dx > 0 ? 14 : -14}px)`, zIndex: 3, offset: .5 },
        { transform: 'translate(0, 0)', zIndex: 3 }
      ], { duration: 340, easing: 'cubic-bezier(.3,.7,.2,1)' })
    })
    prevPos.current = new Map(ids.map((id, pos) => [id, pos]))
  })
  return <div className={`bar-stage ${dense ? 'dense' : ''} ${lanes ? 'lanes' : ''} ${sweep ? 'sweep' : ''}`}>
    <div className="bar-chart" ref={chartRef}>{array.map((v, i) => <div className="bar-column" key={ids ? i : `${i}-${v}`} style={{ ['--i' as string]: i }}>
      <div className="tag-slot">{above[i] && <span className={`ptr-tag ${above[i].tone ?? ''} ${above[i - 1] && !above[i - 1].lift ? 'lift' : ''}`}>[ {above[i].text} ]<b>▼</b></span>}</div>
      <div className="bar-well"><div className={`bar ${cls(i)}`} style={{ height: `${Math.max(4, Math.abs(v) / max * 86)}%` }}><span>{v}</span></div></div>
      <small className={marks[i] ? 'idx marked' : 'idx'}>[{i}]{marks[i] ?? ''}</small>
      <div className="tag-slot below">{below[i] && <span className={`ptr-tag ${below[i].tone ?? ''} ${below[i - 1] ? 'lift' : ''}`}><b>▲</b>[ {below[i].text} ]</span>}</div>
    </div>)}</div>
  </div>
}

const SORT_NAMES: Record<Algorithm, [string, string, string]> = {
  bubble: ['j', 'j', 'j+1'], selection: ['min', 'j', 'min'], insertion: ['key', 'j', 'j+1'], merge: ['k', 'L', 'R']
}

function SortView({ s, t, algo, ids, done }: { s: SortStep; t: T; algo: Algorithm; ids?: number[]; done: boolean }) {
  const [single, first, second] = SORT_NAMES[algo]
  const above: Record<number, Tag> = {}, marks: Record<number, string> = {}
  if (s.comparing.length === 1) above[s.comparing[0]] = { text: `${single}=${s.comparing[0]}`, tone: s.swapped.length ? 'hot' : undefined }
  if (s.comparing.length === 2) {
    above[s.comparing[0]] = { text: `${first}=${s.comparing[0]}` }
    above[s.comparing[1]] = { text: `${second}=${s.comparing[1]}`, tone: s.swapped.length ? 'hot' : undefined }
  }
  s.comparing.forEach(i => (marks[i] = '▲'))
  s.swapped.forEach(i => (marks[i] = '!'))
  return <>
    <div className="panel-heading"><span><Typewriter text={t('EXECUTION VISUALIZATION', '執行視覺化')} speed={22} holdCursor={900} /></span><span className="panel-tag">{t('ARRAY', '陣列')} / {s.array.length} {t('ELEMENTS', '個元素')}</span></div>
    <InfoStrip label={t('SORTED REGION:', '已排序區：')} value={`[${s.sorted.length} / ${s.array.length}] ${'█'.repeat(Math.round(s.sorted.length / s.array.length * 12)).padEnd(12, '·')}`}
      legend={[{ cls: 'sw-default', label: t('Unsorted', '未排序') }, { cls: 'sw-compare', label: t('Compare', '比較中') }, { cls: 'sw-swap', label: t('Active / Swap', '移動中') }, { cls: 'sw-sorted', label: t('Sorted', '已排序') }]} />
    <Bars array={s.array} ids={ids} sweep={done} above={above} marks={marks} cls={i => s.swapped.includes(i) ? 'bar-swap' : s.comparing.includes(i) ? 'bar-compare' : s.sorted.includes(i) ? 'bar-sorted' : ''} />
  </>
}

function SearchView({ s, t, target, algo }: { s: SearchStep; t: T; target: number; algo: SearchAlgorithm }) {
  const above: Record<number, Tag> = {}, below: Record<number, Tag> = {}, marks: Record<number, string> = {}
  s.checking.forEach(i => { above[i] = { text: `${algo === 'binary' ? 'mid' : 'i'}=${i}` }; marks[i] = '▲' })
  if (s.found !== null) { above[s.found] = { text: t('FOUND', '找到'), tone: 'hot' }; marks[s.found] = '!' }
  if (s.range) {
    const [lo, hi] = s.range
    if (lo === hi) below[lo] = { text: `lo=hi=${lo}`, tone: 'cold' }
    else { if (lo >= 0 && lo < s.array.length) below[lo] = { text: `lo=${lo}`, tone: 'cold' }; if (hi >= 0 && hi < s.array.length) below[hi] = { text: `hi=${hi}`, tone: 'cold' } }
  }
  return <>
    <div className="panel-heading"><span><Typewriter text={t('EXECUTION VISUALIZATION', '執行視覺化')} speed={22} holdCursor={900} /></span><span className="panel-tag">{t('TARGET', '目標')} = {target}</span></div>
    <InfoStrip label={t('SEARCH WINDOW:', '搜尋範圍：')} value={s.range ? `[lo: ${s.range[0]} ${'·'.repeat(10)} hi: ${s.range[1]}]` : s.found !== null ? `[${t('HIT AT', '命中')} ${s.found}]` : '[ — ]'}
      legend={[{ cls: 'sw-sorted', label: t('Window', '範圍') }, { cls: 'sw-compare', label: t('Probe', '檢查中') }, { cls: 'sw-dim', label: t('Eliminated', '已排除') }, { cls: 'sw-swap', label: t('Found', '找到') }]} />
    <Bars lanes sweep={false} array={s.array} above={above} below={below} marks={marks} cls={i => s.found === i ? 'bar-swap' : s.checking.includes(i) ? 'bar-compare' : s.eliminated.includes(i) ? 'bar-dim' : s.range && i >= s.range[0] && i <= s.range[1] ? 'bar-sorted' : ''} />
  </>
}

function GraphView({ s, t, algo, graph, onMove }: { s: GraphStep; t: T; algo: GraphAlgorithm; graph: Graph; onMove: (id: string, p: { x: number; y: number }) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)
  const startDrag = (id: string | null) => { dragRef.current = id; setDrag(id) }
  const pos = Object.fromEntries(graph.nodes.map(n => [n.id, n]))
  const same = (e: [string, string] | null, a: string, b: string) => !!e && ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))
  const frontierName = algo === 'bfs' ? t('QUEUE', '佇列') : algo === 'dfs' ? t('STACK', '堆疊') : t('PQ', '優先佇列')
  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: Math.round(Math.max(30, Math.min(650, p.x))), y: Math.round(Math.max(50, Math.min(300, p.y))) }
  }
  const cur = s.current ? pos[s.current] : null
  return <>
    <div className="panel-heading"><span><Typewriter text={t('EXECUTION VISUALIZATION', '執行視覺化')} speed={22} holdCursor={900} /></span><span className="panel-tag">{t('GRAPH', '圖')} / {graph.nodes.length} V / {graph.edges.length} E</span></div>
    <InfoStrip label={`${frontierName}:`} value={`[${s.frontier.join(', ')}]`}
      legend={[{ cls: 'sw-default', label: t('Unseen', '未探索') }, { cls: 'sw-frontier', label: frontierName }, { cls: 'sw-swap', label: t('Current', '目前') }, { cls: 'sw-sorted', label: algo === 'dijkstra' ? t('Settled', '已確定') : t('Visited', '已走訪') }]} />
    <div className="graph-wrap">
      <svg ref={svgRef} viewBox="0 0 680 340" className={`graph-svg ${drag ? 'dragging' : ''}`}
        onPointerMove={e => { if (dragRef.current) onMove(dragRef.current, toSvg(e)) }} onPointerUp={() => startDrag(null)} onPointerCancel={() => startDrag(null)}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="3" className="hatch-line" /></pattern>
        </defs>
        <g transform="translate(0,10)">
          {graph.edges.map(e => {
            const A = pos[e.a], B = pos[e.b]
            const cls = same(s.activeEdge, e.a, e.b) ? 'edge edge-active' : s.treeEdges.some(te => same(te, e.a, e.b)) ? 'edge edge-tree' : 'edge'
            const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2
            return <g key={e.a + '-' + e.b} className={cls}><line x1={A.x} y1={A.y} x2={B.x} y2={B.y} />{algo === 'dijkstra' && <><rect className="w-box" x={mx - 12} y={my - 11} width={24} height={20} /><text x={mx} y={my + 5} textAnchor="middle">{e.w}</text></>}</g>
          })}
          {graph.nodes.map(n => {
            const cls = s.current === n.id ? 'node node-current' : s.visited.includes(n.id) ? 'node node-visited' : s.frontier.includes(n.id) ? 'node node-frontier' : 'node'
            const d = s.dist?.[n.id]
            return <g key={n.id} className={cls} onPointerDown={e => { e.preventDefault(); svgRef.current?.setPointerCapture(e.pointerId); startDrag(n.id) }}>
              <rect className="node-box" x={n.x - 22} y={n.y - 22} width={44} height={44} />
              <rect className="node-hatch" x={n.x - 21} y={n.y + 6} width={42} height={15} fill="url(#hatch)" />
              <text x={n.x} y={n.y + 4} textAnchor="middle">{n.id}</text>
              {s.dist && <text className="node-dist" x={n.x} y={n.y + 42} textAnchor="middle">d={d === undefined || d === Infinity ? '∞' : d}</text>}
            </g>
          })}
          {cur && <g className="node-ptr"><rect x={cur.x - 34} y={cur.y - 58} width={68} height={22} /><text x={cur.x} y={cur.y - 42} textAnchor="middle">u={cur.id}</text><text x={cur.x} y={cur.y - 26} textAnchor="middle" className="ptr-arrow">▼</text></g>}
        </g>
      </svg>
    </div>
    <div className="graph-info"><span><b>{t('VISIT ORDER', '走訪順序')}:</b> {s.order.join(' → ') || '—'}</span><span className="hint">{t('DRAG NODES TO REARRANGE', '拖曳節點可重新排列')}</span></div>
  </>
}

function DPView({ s, t }: { s: DPStep; t: T }) {
  const isDep = (r: number, c: number) => s.deps.some(([a, b]) => a === r && b === c)
  const filled = s.table.flat().filter(v => v !== null).length, total = s.table.flat().length
  return <>
    <div className="panel-heading"><span><Typewriter text={t('EXECUTION VISUALIZATION', '執行視覺化')} speed={22} holdCursor={900} /></span><span className="panel-tag">{t('TABLE', '表格')} / {s.table.length} × {s.table[0]?.length ?? 0}</span></div>
    <InfoStrip label={t('ACTIVE CELL:', '目前格：')} value={s.active ? `[r: ${s.active[0]} · c: ${s.active[1]}]  ${filled}/${total}` : `[ — ]  ${filled}/${total}`}
      legend={[{ cls: 'sw-dim', label: t('Empty', '未計算') }, { cls: 'sw-default', label: t('Filled', '已計算') }, { cls: 'sw-compare', label: t('Depends on', '依賴') }, { cls: 'sw-swap', label: t('Current', '目前') }]} />
    <div className="dp-wrap">
      <table className="dp-table">
        <thead><tr><th />{s.colLabels.map((c, i) => <th key={i} className={s.active?.[1] === i ? 'axis-on' : ''}>{c}</th>)}</tr></thead>
        <tbody>{s.table.map((row, r) => <tr key={r}><th className={s.active?.[0] === r ? 'axis-on' : ''}>{s.rowLabels[r]}</th>{row.map((v, c) => {
          const active = s.active && s.active[0] === r && s.active[1] === c
          return <td key={c} className={active ? 'cell-active' : isDep(r, c) ? 'cell-dep' : v === null ? 'cell-empty' : ''}>{v ?? ''}</td>
        })}</tr>)}</tbody>
      </table>
    </div>
  </>
}

function finishText(category: string, st: AnyStep, t: T) {
  if (category === 'sorting') return t('SORTED', '排序完成')
  if (category === 'searching') { const f = (st as SearchStep).found; return f !== null ? `${t('FOUND @', '找到 @')} ${f}` : t('NOT FOUND', '未找到') }
  if (category === 'graph') return t('TRAVERSAL DONE', '走訪完成')
  return t('TABLE COMPLETE', '表格完成')
}

function FinishStamp({ text }: { text: string }) {
  const ok = !/NOT FOUND|未找到/.test(text)
  const inner = `  ${text}  ${ok ? '✓' : '✗'}  `
  const rule = '+' + '-'.repeat([...inner].length) + '+'
  return <pre className={`finish-stamp ${ok ? '' : 'miss'}`} aria-live="polite">{rule}{'\n'}|{inner}|{'\n'}{rule}</pre>
}

function Timeline({ step, total, marks, t, category, onSeek }: { step: number; total: number; marks: string[]; t: T; category: string; onSeek: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const seek = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    onSeek(Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * (total - 1)))
  }
  const pct = (i: number) => (total <= 1 ? 0 : (i / (total - 1)) * 100)
  const markName = category === 'sorting' ? t('SWAPS', '交換') : category === 'searching' ? t('FOUND', '找到') : category === 'graph' ? t('VISITS', '走訪') : t('FILLS', '填表')
  const ticks = marks.map((m, i) => (m ? i : -1)).filter(i => i >= 0)
  return <div className="timeline-row">
    <div className="timeline" ref={ref} role="slider" aria-label={t('Step timeline', '步驟時間軸')} aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} tabIndex={-1}
      onPointerDown={e => { dragging.current = true; ref.current?.setPointerCapture(e.pointerId); seek(e.clientX) }}
      onPointerMove={e => { if (dragging.current) seek(e.clientX) }}
      onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>
      <div className="tl-track" style={total <= 160 ? { backgroundSize: `${100 / Math.max(1, total - 1)}% 100%` } : undefined}>
        <div className="tl-fill" style={{ width: `${pct(step)}%` }} />
        {ticks.map(i => <i key={i} className={`tl-tick ${marks[i]} ${i <= step ? 'past' : ''}`} style={{ left: `${pct(i)}%` }} />)}
        <div className="tl-head" style={{ left: `${pct(step)}%` }}><span>{step + 1}</span></div>
      </div>
    </div>
    <div className="tl-meta"><span><i className="tl-key" /> {markName} {ticks.length}</span><span className="kbd-hints"><kbd>SPACE</kbd> {t('RUN', '執行')} <kbd>←</kbd><kbd>→</kbd> {t('STEP', '步進')}</span></div>
  </div>
}
