import { Component, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Box, Camera, Check, ChevronDown, ChevronRight, CircleHelp, Download, Expand, Grid2X2, Layers3, LoaderCircle, Maximize2, Minus, Mouse, PanelRightClose, PanelRightOpen, Pause, Play, Plus, RotateCcw, Rotate3D, Settings2, ShieldCheck, X } from 'lucide-react'
import Viewer, { clearModelCache, LoadingOverlay, MODEL_URL } from './Viewer'
import { TourDialog } from './Tour.jsx'
import { TOUR_QUESTIONS } from './tour'

class SceneBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { this.props.onFailure(error) }
  render() { return this.state.error ? null : this.props.children }
}

function IconButton({ label, icon: Icon, active, disabled, onClick }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} aria-pressed={active === undefined ? undefined : active} onClick={onClick} className={`icon-button ${active ? 'selected' : ''}`}><Icon size={19}/></button>
}

export default function App() {
  const [info, setInfo] = useState(null)
  const [clips, setClips] = useState([])
  const [animation, setAnimation] = useState('')
  const [playing, setPlaying] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [grid, setGrid] = useState(true)
  const [quality, setQuality] = useState(() => window.matchMedia('(max-width: 700px)').matches ? 'balanced' : 'high')
  const [view, setView] = useState('perspective')
  const [command, setCommand] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [help, setHelp] = useState(false)
  const [full, setFull] = useState(false)
  const [camera, setCamera] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [exposure, setExposure] = useState(0.9)
  const [tourStage, setTourStage] = useState('idle')
  const [tourRun, setTourRun] = useState(0)
  const [tourPaused, setTourPaused] = useState(false)
  const [tourQuestion, setTourQuestion] = useState(0)
  const [tourAnswers, setTourAnswers] = useState({})
  const viewport = useRef()
  const helpClose = useRef()
  const fail = useCallback(error => setError(error), [])
  const onClips = useCallback(names => { setClips(names); setAnimation(current => current || names[0] || '') }, [])
  const act = useCallback(type => setCommand({ type, id: performance.now() }), [])
  const startTour = () => { setAutoRotate(false); setTourStage('walking'); setTourRun(n=>n+1); setTourPaused(false); setTourQuestion(0); setTourAnswers({}); act('tour-focus') }
  const endTour = () => { setTourStage('idle'); act('reset') }
  const onTourArrive = useCallback(() => setTourStage(current => current === 'walking' ? 'questions' : current), [])
  const answerTour = (id, value) => { setTourAnswers(current=>({...current,[id]:value})); if (tourQuestion + 1 === TOUR_QUESTIONS.length) setTourStage('complete'); else setTourQuestion(n=>n+1) }
  const fullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (viewport.current.requestFullscreen) await viewport.current.requestFullscreen()
      else setFull(current => !current)
    } catch { setFull(current => !current) }
  }, [])
  useEffect(() => {
    const sync = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  useEffect(() => {
    const handler = event => {
      if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Escape') { setHelp(false); if (!document.fullscreenElement) setFull(false) }
      if (!info || error || help) return
      if (event.key.toLowerCase() === 'r') act('reset')
      if (event.key === '+' || event.key === '=') act('in')
      if (event.key === '-') act('out')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [info, error, help, act])
  useEffect(() => { if (help) helpClose.current?.focus() }, [help])
  const ready = Boolean(info) && !error
  return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand" aria-label="Form home"><span className="brand-mark"><Box size={23}/></span>form<span className="brand-dot">.</span></a><span className="header-divider"/><span className="product-label">MODEL EXPLORER</span><div className="header-right"><span className="local-label"><span/> Your workspace</span><button aria-label="Help & shortcuts" className="help-button" onClick={() => setHelp(true)}><CircleHelp size={17}/><span>Help & shortcuts</span></button><span className="avatar">FR</span></div></header>
    <main className="workspace">
      <div className="breadcrumb"><span>Workspace</span><ChevronRight size={13}/><span>Office architecture</span></div>
      <div className="page-heading"><div><div className="eyebrow">SPACES, IN A NEW DIMENSION</div><h1>A closer look at your office<span>.</span></h1><p>Every room. Every detail. Explore your space from any angle.</p></div><a className="download-button" href={MODEL_URL} download="office plan.glb"><Download size={17}/><span>Download model</span><ArrowUpRight size={15}/></a></div>
      <div className={`viewer-layout ${focusMode ? 'focus-mode' : ''}`}>
        <section ref={viewport} className={`viewport ${full ? 'fullscreen-view' : ''}`} aria-label="Interactive office model viewer" data-ready={ready} data-camera-distance={camera?.distance?.toFixed(3)} data-camera-position={camera?.position?.map(v => v.toFixed(3)).join(',')}>
          <div className="viewport-top"><span className="scene-tag"><span className={ready ? 'status-dot' : 'status-dot pending'}/>{error ? 'Scene unavailable' : ready ? 'Live 3D scene' : 'Loading scene'}</span><div className="viewport-actions"><span className="viewport-filename">office plan.glb</span><IconButton label="Save PNG screenshot" icon={Camera} disabled={!ready} onClick={() => act('snapshot')}/><IconButton label={focusMode ? 'Show model settings' : 'Expand workspace'} icon={focusMode ? PanelRightOpen : PanelRightClose} active={focusMode} onClick={() => setFocusMode(current => !current)}/></div></div>
          <button className="start-tour" disabled={!ready} onClick={startTour}>Start reception tour</button><nav className="camera-presets" aria-label="Camera views">{[['perspective', '3D'], ['top', 'Top'], ['front', 'Front'], ['side', 'Side']].map(([key, label]) => <button key={key} disabled={!ready} aria-label={`${label} camera view`} aria-pressed={view === key} onClick={() => { setAutoRotate(false); setView(key); act('reset') }}>{label}</button>)}</nav>
          <SceneBoundary key={attempt} onFailure={fail}><Viewer info={info} onReady={setInfo} onClips={onClips} animation={animation} playing={playing} quality={quality} autoRotate={autoRotate} grid={grid} view={view} command={command} onCamera={setCamera} onFailure={fail} exposure={exposure} tourStage={tourStage} tourPaused={tourPaused} tourRun={tourRun} onTourArrive={onTourArrive}/></SceneBoundary>
          {ready && <TourDialog stage={tourStage} paused={tourPaused} question={tourQuestion} answers={tourAnswers} onAnswer={answerTour} onClose={endTour} onRestart={startTour} onPause={()=>setTourPaused(current=>!current)}/>}
          {!error && <LoadingOverlay ready={ready}/>}
          {error && <div className="error-overlay"><div className="error-card"><Box size={30}/><h2>We couldn’t open the scene</h2><p>{error.message?.includes('fetch') || error.message?.includes('load') ? 'The model could not be downloaded. Check your connection and try again.' : error.message}</p><button onClick={() => { clearModelCache(); setError(null); setInfo(null); setAttempt(n => n + 1) }}>Retry viewer</button><a href={MODEL_URL} download>Download the original file</a></div></div>}
          <div className="orientation" aria-hidden="true"><span className="axis-y">Y</span><span className="axis-x">X</span><span className="axis-z">Z</span><span className="axis-origin"/></div>
          <div className="viewport-bottom"><span className="gesture-hint"><Mouse size={15}/><span>Drag to orbit <b>·</b> Scroll to zoom</span></span><div className="toolbar" aria-label="Viewer controls"><IconButton label="Auto rotate" icon={autoRotate ? Pause : Rotate3D} active={autoRotate} disabled={!ready} onClick={() => setAutoRotate(n => !n)}/><span className="tool-divider"/><IconButton label="Zoom out" icon={Minus} disabled={!ready} onClick={() => act('out')}/><IconButton label="Zoom in" icon={Plus} disabled={!ready} onClick={() => act('in')}/><span className="tool-divider"/><IconButton label="Reset view" icon={RotateCcw} disabled={!ready} onClick={() => act('reset')}/><IconButton label={full ? 'Exit fullscreen' : 'Fullscreen'} icon={Expand} onClick={fullscreen}/></div><span className="render-label">{quality === 'high' ? 'High quality' : 'Balanced'}<span/></span></div>
        </section>
        <aside className="inspector">
          <div className="inspector-header"><span className="eyebrow">THE MODEL</span><span className="file-badge">GLB</span></div><div className="model-icon"><Layers3 size={29} strokeWidth={1.4}/></div><h2>Office plan</h2><p className="model-description">A fully furnished workspace,<br/>ready to explore.</p><div className="ready-badge">{ready ? <Check size={13}/> : <LoaderCircle size={13} className="spin"/>}{error ? 'Unable to load' : ready ? 'Original model loaded' : 'Preparing model'}</div>
          <div className="panel-section details-section"><h3>MODEL DETAILS</h3><dl><div><dt>File size</dt><dd>39.26 MB</dd></div><div><dt>Format</dt><dd>glTF 2.0</dd></div><div><dt>Meshes</dt><dd>{info ? info.meshes.toLocaleString() : '—'}</dd></div><div><dt>Materials</dt><dd>{info?.materials ?? '—'}</dd></div><div><dt>Scene triangles</dt><dd>{info ? `${(info.triangles / 1e6).toFixed(2)}M` : '—'}</dd></div><div><dt>Dimensions*</dt><dd>{info ? `${info.size[0].toFixed(1)} × ${info.size[2].toFixed(1)} × ${info.size[1].toFixed(1)}` : '—'}</dd></div></dl><p className="unit-note">* Width × depth × height in model units.</p></div>
          <div className="panel-section settings-section"><h3><Settings2 size={14}/> VIEW SETTINGS</h3><div className="view-options"><button disabled={!ready} className={view === 'perspective' ? 'active' : ''} onClick={() => { setView('perspective'); act('reset') }}><Box size={15}/>Perspective</button><button disabled={!ready} className={view === 'top' ? 'active' : ''} onClick={() => { setView('top'); act('reset') }}><Grid2X2 size={15}/>Top view</button></div><label className="setting-row" htmlFor="quality"><span>Render quality</span><span className="select-wrap"><select id="quality" value={quality} onChange={e => setQuality(e.target.value)}><option value="high">High</option><option value="balanced">Balanced</option></select><ChevronDown size={12}/></span></label><label className="setting-row" htmlFor="grid"><span>Ground grid</span><input id="grid" type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)}/><span className="toggle" aria-hidden="true"/></label><label className="setting-row" htmlFor="rotate"><span>Auto rotate</span><input id="rotate" type="checkbox" disabled={!ready} checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)}/><span className="toggle" aria-hidden="true"/></label></div>
          <div className="panel-section animation-section"><h3>ANIMATIONS <span>{clips.length}</span></h3>{clips.length ? <><select aria-label="Animation clip" value={animation} onChange={e => setAnimation(e.target.value)}>{clips.map(name => <option key={name}>{name}</option>)}</select><button className="play-button" onClick={() => setPlaying(n => !n)}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? 'Pause animation' : 'Play animation'}</button></> : <p className="static-note">Static model · no animation clips</p>}</div>
          <div className="panel-section lighting-section"><h3>LIGHTING</h3><label className="exposure-label" htmlFor="exposure">Brightness <span>{exposure.toFixed(2)}</span></label><input id="exposure" className="exposure-slider" type="range" min="0.5" max="1.5" step="0.05" value={exposure} onChange={event => setExposure(Number(event.target.value))}/><button className="restore-lighting" onClick={() => setExposure(0.9)}>Restore lighting</button></div>
          <div className="preservation-note"><ShieldCheck size={18}/><p>Original materials & textures.<br/><span>Your model, just as you made it.</span></p></div>
        </aside>
      </div>
      <div className="below-viewer"><div><span className="tiny-box"><Maximize2 size={15}/></span><span>Made for a different perspective.</span></div><span>Orbit <b>·</b> Pan <b>·</b> Zoom <span className="desktop-note">— all in your browser</span></span></div>
    </main><footer><span>FORM / MODEL EXPLORER</span><span>Built to see the bigger picture.</span></footer>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); helpClose.current?.focus() } }}><button ref={helpClose} className="modal-close" aria-label="Close help" onClick={() => setHelp(false)}><X size={20}/></button><span className="eyebrow">GET AROUND YOUR SPACE</span><h2 id="help-title">A few simple moves.</h2><dl><div><dt>Orbit</dt><dd>Left-click + drag / one finger</dd></div><div><dt>Zoom</dt><dd>Mouse wheel / pinch</dd></div><div><dt>Pan</dt><dd>Right-click + drag / two fingers</dd></div><div><dt>Reset view</dt><dd><kbd>R</kbd></dd></div><div><dt>Zoom in / out</dt><dd><kbd>+</kbd> / <kbd>−</kbd></dd></div><div><dt>Close dialog / fullscreen</dt><dd><kbd>Esc</kbd></dd></div></dl><p>The supplied office model has no animation clips. Playback controls appear automatically for models with animations.</p></section></div>}
  </div>
}
