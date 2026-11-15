import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Typewriter from './Typewriter'
import MiniViz from './MiniViz'
import DotField from './DotField'
import { byCategory, categories, difficulties, modules } from '../algorithms/registry'
import type { Category, Difficulty, ModuleId } from '../algorithms/registry'

const ICONS: Record<Category, string> = { sorting: '▁▃▅▇', searching: '[·>·]', graph: 'o-<o', dp: '[#|#]' }
const SHORT: Record<Category, string> = { sorting: 'SORTING', searching: 'SEARCHING', graph: 'GRAPH', dp: 'DP' }

// The boot line + staggered card reveal only plays the first time per page load.
let bootedThisLoad = false

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id) }, [])
  return <span>{now.toTimeString().slice(0, 8)}</span>
}

type Props = {
  t: (en: string, zh: string) => string
  zh: boolean
  light: boolean
  powerOn: boolean
  returnTo: ModuleId | null
  onOpen: (id: ModuleId) => void
}

export default function Library({ t, zh, light, powerOn, returnTo, onOpen }: Props) {
  const [category, setCategory] = useState<Category>(() => { try { const c = sessionStorage.getItem('algolens-cat') as Category | null; return c && categories.some(x => x.id === c) ? c : 'sorting' } catch { return 'sorting' } })
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [sel, setSel] = useState(0)
  const [firstBoot] = useState(() => !bootedThisLoad)
  const [inserting, setInserting] = useState<ModuleId | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => { bootedThisLoad = true }, [])
  useEffect(() => { try { sessionStorage.setItem('algolens-cat', category) } catch { /* ignore */ } }, [category])

  const searching = query.trim().length > 0
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q ? modules : byCategory(category)
    return pool.filter(m => (difficulty === 'all' || m.difficulty === difficulty) &&
      (!q || [m.en, m.zh, m.tagEn, m.tagZh, m.id, categories.find(c => c.id === m.category)!.en].some(f => f.toLowerCase().includes(q))))
  }, [query, category, difficulty])
  const firstSel = useRef(true)
  useEffect(() => {
    if (firstSel.current) {
      firstSel.current = false
      const k = returnTo ? visible.findIndex(m => m.id === returnTo) : -1
      if (k > 0) { setSel(k); requestAnimationFrame(() => grid.current?.children[k]?.scrollIntoView({ block: 'nearest' })) }
      return
    }
    setSel(0)
  }, [query, category, difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Insert cartridge": the picked card drops into the slot, the screen flickers, then the program loads.
  const launch = (id: ModuleId) => {
    if (inserting) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onOpen(id); return }
    setInserting(id)
    window.setTimeout(() => onOpen(id), 560)
  }
  const launchRef = useRef(launch)
  launchRef.current = launch

  const pickCategory = (c: Category) => { setCategory(c); setQuery('') }

  // Terminal-style keyboard control: arrows move the > cursor, Enter opens, / searches, 1-4 switch directory.
  const stateRef = useRef({ sel, visible })
  stateRef.current = { sel, visible }
  useEffect(() => {
    const columns = () => {
      const g = grid.current
      return g ? getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 1 : 1
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const { sel, visible } = stateRef.current
      const target = e.target instanceof Element ? e.target : null
      const inInput = !!target?.closest('input,textarea')
      if (inInput) {
        if (e.key === 'Escape') { (target as HTMLElement).blur() }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (target as HTMLElement).blur() }
        else if (e.key === 'Enter' && visible[sel]) { e.preventDefault(); launchRef.current(visible[sel].id) }
        return
      }
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); return }
      if (/^[1-4]$/.test(e.key)) { pickCategory(categories[Number(e.key) - 1].id); return }
      if (!visible.length) return
      let next = sel
      if (e.key === 'ArrowRight') next = sel + 1
      else if (e.key === 'ArrowLeft') next = sel - 1
      else if (e.key === 'ArrowDown') next = sel + columns()
      else if (e.key === 'ArrowUp') next = sel - columns()
      else if (e.key === 'Enter') {
        if (target?.closest('button')) return   // a focused button already handles Enter
        e.preventDefault(); launchRef.current(visible[sel].id); return
      } else return
      e.preventDefault()
      next = Math.max(0, Math.min(visible.length - 1, next))
      setSel(next)
      grid.current?.children[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current = categories.find(c => c.id === category)!
  const dir = searching ? `GREP "${query.trim().toUpperCase()}"` : `DIR: /ALGORITHMS/${SHORT[category]}`
  const picked = visible[sel]

  return <div className={`crt-frame ${powerOn ? 'power-on' : ''} ${firstBoot ? 'first-boot' : ''} ${inserting ? 'inserting' : ''}`}>
    <div className="crt-glass">
      <DotField light={light} />
      <div className="crt-inner">
        <div className="lib-strip">
          <div><span className="pulse-dot" /><b>{dir}</b><span className="sep">|</span><span>{visible.length} {t('MODULES', '個模組')}</span><span className="sep hide-sm">|</span><span className="hide-sm">MEM <em>OK</em></span></div>
          <div className="hide-sm"><span>TTY1</span><span className="sep">|</span><Clock /></div>
        </div>

        <div className="lib-body">
          <p className="boot-line">{firstBoot
            ? <Typewriter text={`> ls /algorithms ... ${modules.length} ${t('modules found', '個模組')}`} speed={22} holdCursor={500} />
            : <>&gt; ls /algorithms ... {modules.length} {t('modules found', '個模組')}</>}</p>
          <h1 className="lib-title"><Typewriter text={t('Algorithm Library', '演算法庫')} /></h1>

          <nav className="cat-tabs" role="tablist" aria-label={t('Categories', '分類')}>
            {categories.map((c, ci) => <button key={c.id} role="tab" aria-selected={!searching && category === c.id}
              className={`cat-tab ${!searching && category === c.id ? 'on' : ''}`} onClick={() => pickCategory(c.id)}>
              <span className="cat-icon" aria-hidden="true">{ICONS[c.id]}</span>
              <span className="cat-name">{zh ? c.zh : SHORT[c.id] + '/'}</span>
              <span className="cat-meta"><small>[{ci + 1}]</small><b>{String(byCategory(c.id).length).padStart(2, '0')}</b></span>
            </button>)}
          </nav>

          <div className="library-tools">
            <label className="search-box"><span className="prompt">&gt;</span><input ref={search} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search algorithms_', '搜尋演算法_')} spellCheck={false} aria-label={t('Search algorithms', '搜尋演算法')} /><span className={`match-count ${searching && !visible.length ? 'none' : ''}`}>{searching ? `${visible.length} ${visible.length === 1 ? t('MATCH', '筆') : t('MATCHES', '筆')}` : `${modules.length} ${t('MODULES', '個模組')}`}</span>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label>
            <div className="difficulty-filter" role="group" aria-label={t('Difficulty', '難度')}>
              <button className={difficulty === 'all' ? 'picked' : ''} onClick={() => setDifficulty('all')}>{t('ALL', '全部')}</button>
              {difficulties.map(d => <button key={d.id} className={difficulty === d.id ? 'picked' : ''} onClick={() => setDifficulty(d.id)}><i className={`diff-dot diff-${d.id}`} />{zh ? d.zh : d.en}</button>)}
            </div>
          </div>

          <div className="cart-head">
            <span>{searching ? <>{t('SEARCH RESULTS', '搜尋結果')} <b>“{query.trim()}”</b></> : <><b>{String(categories.indexOf(current) + 1).padStart(2, '0')}</b> / <Typewriter key={category + String(zh)} text={zh ? current.zh : current.en} speed={30} /></>}</span>
            <span className="hide-sm">{picked ? `/algorithms/${picked.category}/${picked.id}.vis` : ''}</span>
          </div>

          <div className={`cart-grid ${inserting ? 'loading' : ''}`} ref={grid} key={`${searching ? 'q:' + query.trim() : category}|${difficulty}`}>
            {visible.map((m, idx) => {
              const ci = categories.findIndex(c => c.id === m.category), i = byCategory(m.category).indexOf(m)
              const diff = difficulties.find(d => d.id === m.difficulty)!
              const on = idx === sel
              return <button className={`cart ${on ? 'sel' : ''} ${inserting === m.id ? 'inserting' : ''} ${returnTo === m.id && !inserting ? 'ejected' : ''}`} key={m.id} onClick={() => launch(m.id)}
                onMouseEnter={() => setSel(idx)} onFocus={() => setSel(idx)} style={{ ['--i' as string]: idx }}>
                <span className="cart-label">
                  <span className="cart-cursor" aria-hidden="true">&gt;</span>
                  <span className="module-index">{String(ci + 1).padStart(2, '0')}.{String(i + 1).padStart(2, '0')}</span>
                  <span className={`diff-badge diff-${m.difficulty}`}>{zh ? diff.zh : diff.en}</span>
                </span>
                <span className="cart-screen"><MiniViz id={m.id} category={m.category} fast={on} light={light} /></span>
                <span className="cart-name">{zh ? m.zh : m.en}</span>
                <span className="cart-tag">{searching && <>{zh ? categories[ci].zh : categories[ci].en} · </>}{zh ? m.tagZh : m.tagEn}</span>
                <span className="cart-spec">
                  <span><small>{t('BEST', '最佳')}</small>{m.complexity.best}</span>
                  <span><small>{t('AVG', '平均')}</small>{m.complexity.average}</span>
                  <span><small>{t('WORST', '最差')}</small>{m.complexity.worst}</span>
                  <span><small>{t('SPACE', '空間')}</small>{m.complexity.space}</span>
                </span>
                <span className="cart-run">{t('RUN', '執行')} ▶</span>
              </button>
            })}
            {!visible.length && <div className="empty-state">&gt; {t('No algorithms match. Try another search or difficulty.', '沒有符合的演算法，請換個關鍵字或難度。')}<span className="blink">_</span></div>}
          </div>
        </div>

        <div className="lib-strip lib-strip-bottom">
          <div className="kbd-row"><span><kbd>←↑↓→</kbd> {t('SELECT', '選擇')}</span><span><kbd>ENTER</kbd> {t('OPEN', '開啟')}</span><span><kbd>/</kbd> {t('SEARCH', '搜尋')}</span><span className="hide-sm"><kbd>1-4</kbd> {t('DIRECTORY', '目錄')}</span></div>
          <div className="hide-sm"><span>RENDER: <em>{t('DOT-MATRIX', '點陣')}</em></span><span className="sep">|</span><span>STATUS: <b>[ONLINE]</b></span></div>
        </div>
      </div>
    </div>
    <div className="crt-chin" aria-hidden="true">
      <span className="chin-brand">ALGOLENS <i>SYS.42</i></span>
      <span className="chin-grille" />
      <span className="chin-led" />
    </div>
  </div>
}
