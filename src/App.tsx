import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Database, Home, Layers3, Moon, Sun } from 'lucide-react'
import MatrixRain from './components/MatrixRain'
import PointCloudComputer from './components/PointCloudComputer'
import Logo from './components/Logo'
import Visualizer from './components/Visualizer'
import Library from './components/Library'
import { getModule } from './algorithms/registry'
import type { ModuleId } from './algorithms/registry'

type Page = 'home' | 'library' | 'visualizer'
const ZOOM_MS = 950

export default function App() {
  const [page, setPageRaw] = useState<Page>('home')
  const [moduleId, setModuleId] = useState<ModuleId>('bubble')
  const [lightMode, setLightMode] = useState(false)
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [zooming, setZooming] = useState(false)
  const [powerOn, setPowerOn] = useState(false)
  const zoomTimer = useRef(0)
  const zh = language === 'zh'
  const t = (en: string, cn: string) => zh ? cn : en
  const setPage = (p: Page) => { window.clearTimeout(zoomTimer.current); setZooming(false); setPowerOn(false); setPageRaw(p) }
  const open = useCallback((id: ModuleId) => { setModuleId(id); setPowerOn(false); setPageRaw('visualizer'); window.scrollTo(0, 0) }, [])
  // Home -> library: the camera dives into the 3D computer's screen, then the library powers on inside a CRT.
  const enterLibrary = () => {
    if (zooming) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPage('library'); return }
    setZooming(true)
    zoomTimer.current = window.setTimeout(() => { setZooming(false); setPowerOn(true); setPageRaw('library'); window.scrollTo(0, 0) }, ZOOM_MS)
  }
  useEffect(() => () => window.clearTimeout(zoomTimer.current), [])

  return <div className={`app-shell page-${page} ${lightMode ? 'light-theme' : ''}`}>
    <MatrixRain light={lightMode} />
    <header className="topbar">
      <button className="brand" onClick={() => setPage('home')}><span className="brand-mark"><Logo size={26} /></span> AlgoLens</button>
      <nav className="top-nav">
        <button className={page === 'home' ? 'nav-active' : ''} onClick={() => setPage('home')}><Home size={13} /> {t('HOME', '首頁')}</button>
        <button className={page !== 'home' ? 'nav-active' : ''} onClick={() => page === 'home' ? enterLibrary() : setPage('library')}><Layers3 size={13} /> {t('ALGORITHM LIBRARY', '演算法庫')}</button>
        <button onClick={() => setPage('library')}><Database size={13} /> {t('DATA STRUCTURES', '資料結構')} <span className="soon">{t('COMING SOON', '即將推出')}</span></button>
      </nav>
      <div className="top-right"><button className="utility-toggle" onClick={() => setLightMode(v => !v)}>{lightMode ? <Moon size={17} /> : <Sun size={17} />} {lightMode ? t('DARK', '深色') : t('LIGHT', '淺色')}</button><span className="top-divider" /><button className="utility-toggle language-toggle" onClick={() => setLanguage(v => v === 'en' ? 'zh' : 'en')}>{t('中文', 'EN')}</button></div>
    </header>
    {!powerOn && <div key={`glitch-${page}-${moduleId}`} className="glitch-flash" aria-hidden="true" />}

    {page === 'home' && <main className={`home-screen page-enter ${zooming ? 'zooming' : ''}`}>
      <PointCloudComputer light={lightMode} zoom={zooming} />
      <div className="crt-overlay" aria-hidden="true" />
      <div className="crt-vignette" aria-hidden="true" />
      <div className="sys-strip">
        <div><span className="pulse-dot" /><b>ALGOLENS // SYS.42</b><span className="sep">|</span><span className="hide-sm">CRTC-HD6845 [P31 PHOSPHOR]</span></div>
        <div><span className="hide-md">RENDER: <em>STIPPLE POINT-CLOUD</em></span><span className="sep hide-md">|</span><span>STATUS: <b>[ONLINE]</b></span></div>
      </div>
      <div className="home-dock">
        <button className="dock-button" onClick={enterLibrary} disabled={zooming}>{t('OPEN ALGORITHM LIBRARY', '開啟演算法庫')} <ArrowRight size={15} /></button>
      </div>
    </main>}

    {page === 'library' && <main className="workspace library-page page-enter">
      <Library t={t} zh={zh} light={lightMode} powerOn={powerOn} onOpen={open} />
    </main>}

    {page === 'visualizer' && <Visualizer key={moduleId} mod={getModule(moduleId)} t={t} zh={zh} onLibrary={() => setPage('library')} />}

    <footer className="global-footer"><span>ALGOLENS // {t('ALGORITHM VISUALIZER', '演算法視覺化工具')}</span></footer>
  </div>
}
