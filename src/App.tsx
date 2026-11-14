import { useMemo, useState } from 'react'
import { ArrowRight, ChevronRight, Database, Home, Layers3, Moon, Sun, X } from 'lucide-react'
import MatrixRain from './components/MatrixRain'
import PointCloudComputer from './components/PointCloudComputer'
import Logo from './components/Logo'
import Visualizer from './components/Visualizer'
import Typewriter from './components/Typewriter'
import { byCategory, categories, difficulties, getModule, modules } from './algorithms/registry'
import type { Category, Difficulty, ModuleId } from './algorithms/registry'

type Page = 'home' | 'library' | 'visualizer'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [moduleId, setModuleId] = useState<ModuleId>('bubble')
  const [lightMode, setLightMode] = useState(false)
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const zh = language === 'zh'
  const t = (en: string, cn: string) => zh ? cn : en
  const [category, setCategory] = useState<Category>('sorting')
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const searching = query.trim().length > 0
  const currentCat = categories.find(c => c.id === category)!
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q ? modules : byCategory(category)
    return pool.filter(m => (difficulty === 'all' || m.difficulty === difficulty) &&
      (!q || [m.en, m.zh, m.tagEn, m.tagZh, m.id, categories.find(c => c.id === m.category)!.en].some(f => f.toLowerCase().includes(q))))
  }, [query, category, difficulty])
  const open = (id: ModuleId) => { setModuleId(id); setPage('visualizer'); window.scrollTo(0, 0) }

  return <div className={`app-shell page-${page} ${lightMode ? 'light-theme' : ''}`}>
    <MatrixRain light={lightMode} />
    <header className="topbar">
      <button className="brand" onClick={() => setPage('home')}><span className="brand-mark"><Logo size={26} /></span> AlgoLens</button>
      <nav className="top-nav">
        <button className={page === 'home' ? 'nav-active' : ''} onClick={() => setPage('home')}><Home size={13} /> {t('HOME', '首頁')}</button>
        <button className={page !== 'home' ? 'nav-active' : ''} onClick={() => setPage('library')}><Layers3 size={13} /> {t('ALGORITHM LIBRARY', '演算法庫')}</button>
        <button onClick={() => setPage('library')}><Database size={13} /> {t('DATA STRUCTURES', '資料結構')} <span className="soon">{t('COMING SOON', '即將推出')}</span></button>
      </nav>
      <div className="top-right"><button className="utility-toggle" onClick={() => setLightMode(v => !v)}>{lightMode ? <Moon size={17} /> : <Sun size={17} />} {lightMode ? t('DARK', '深色') : t('LIGHT', '淺色')}</button><span className="top-divider" /><button className="utility-toggle language-toggle" onClick={() => setLanguage(v => v === 'en' ? 'zh' : 'en')}>{t('中文', 'EN')}</button></div>
    </header>
    <div key={`glitch-${page}-${moduleId}`} className="glitch-flash" aria-hidden="true" />

    {page === 'home' && <main className="home-screen page-enter">
      <PointCloudComputer light={lightMode} />
      <div className="crt-overlay" aria-hidden="true" />
      <div className="crt-vignette" aria-hidden="true" />
      <div className="sys-strip">
        <div><span className="pulse-dot" /><b>ALGOLENS // SYS.42</b><span className="sep">|</span><span className="hide-sm">CRTC-HD6845 [P31 PHOSPHOR]</span></div>
        <div><span className="hide-md">RENDER: <em>STIPPLE POINT-CLOUD</em></span><span className="sep hide-md">|</span><span>STATUS: <b>[ONLINE]</b></span></div>
      </div>
      <div className="home-dock">
        <button className="dock-button" onClick={() => setPage('library')}>{t('OPEN ALGORITHM LIBRARY', '開啟演算法庫')} <ArrowRight size={15} /></button>
      </div>
    </main>}

    {page === 'library' && <main className="workspace library-page page-enter">
      <div className="page-heading"><h1><Typewriter text={t('Algorithm Library', '演算法庫')} /></h1></div>
      <div className="library-tools">
        <label className="search-box"><span className="prompt">&gt;</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search algorithms_', '搜尋演算法_')} spellCheck={false} aria-label={t('Search algorithms', '搜尋演算法')} /><span className={`match-count ${searching && !visible.length ? 'none' : ''}`}>{searching ? `${visible.length} ${visible.length === 1 ? t('MATCH', '筆') : t('MATCHES', '筆')}` : `${modules.length} ${t('MODULES', '個模組')}`}</span>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}</label>
        <div className="difficulty-filter" role="group" aria-label={t('Difficulty', '難度')}>
          <button className={difficulty === 'all' ? 'picked' : ''} onClick={() => setDifficulty('all')}>{t('ALL', '全部')}</button>
          {difficulties.map(d => <button key={d.id} className={difficulty === d.id ? 'picked' : ''} onClick={() => setDifficulty(d.id)}><i className={`diff-dot diff-${d.id}`} />{zh ? d.zh : d.en}</button>)}
        </div>
      </div>
      <div className="library-layout">
        <aside className="side-panel"><div className="panel-title">{t('DIRECTORY', '目錄')}</div>
          {categories.map((c, ci) => <button key={c.id} className={`side-group ${!searching && category === c.id ? 'side-active' : ''}`} onClick={() => { setCategory(c.id); setQuery('') }}>
            <span>{String(ci + 1).padStart(2, '0')} / {zh ? c.zh : c.en}</span><small>{byCategory(c.id).length}</small>
          </button>)}
        </aside>
        <section className="module-list">
          <div className="module-toolbar"><span>{searching ? <>{t('SEARCH RESULTS', '搜尋結果')} <b>“{query.trim()}”</b></> : <><b>{String(categories.findIndex(c => c.id === category) + 1).padStart(2, '0')}</b> / <Typewriter key={category + language} text={zh ? currentCat.zh : currentCat.en} speed={30} /></>}</span><span>{visible.length} {t('MODULES', '個模組')}</span></div>
          <div className="module-rows" key={`${searching ? 'q:' + query.trim() : category}|${difficulty}`}>
            {visible.map(m => {
              const ci = categories.findIndex(c => c.id === m.category), i = byCategory(m.category).indexOf(m)
              const diff = difficulties.find(d => d.id === m.difficulty)!
              return <button className="module-row" key={m.id} onClick={() => open(m.id)} style={{ ['--i' as string]: visible.indexOf(m) }}>
                <span className="module-index">{String(ci + 1).padStart(2, '0')}.{String(i + 1).padStart(2, '0')}</span>
                <span className="module-name">{zh ? m.zh : m.en}<small>{searching && <>{zh ? categories[ci].zh : categories[ci].en} · </>}{zh ? m.tagZh : m.tagEn}</small></span>
                <span className={`diff-badge diff-${m.difficulty}`}>{zh ? diff.zh : diff.en}</span>
                <span className="complexity-mini">{m.complexity.average}<small>{t('AVERAGE TIME', '平均時間')}</small></span>
                <span className="module-arrow"><ChevronRight size={18} /></span>
              </button>
            })}
            {!visible.length && <div className="empty-state">&gt; {t('No algorithms match. Try another search or difficulty.', '沒有符合的演算法，請換個關鍵字或難度。')}<span className="blink">_</span></div>}
          </div>
        </section>
      </div>
    </main>}

    {page === 'visualizer' && <Visualizer key={moduleId} mod={getModule(moduleId)} t={t} zh={zh} onLibrary={() => setPage('library')} />}

    <footer className="global-footer"><span>ALGOLENS // {t('ALGORITHM VISUALIZER', '演算法視覺化工具')}</span></footer>
  </div>
}
