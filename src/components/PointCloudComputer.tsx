import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Stipple / dot-art retro CRT workstation (adapted from the Google Stitch concept).

function addBoxPoints(arr: number[], w: number, h: number, d: number, count: number, ox = 0, oy = 0, oz = 0) {
  for (let i = 0; i < count; i++) {
    const face = Math.floor(Math.random() * 6), u = Math.random() - .5, v = Math.random() - .5
    let x = 0, y = 0, z = 0
    switch (face) {
      case 0: x = w / 2; y = u * h; z = v * d; break
      case 1: x = -w / 2; y = u * h; z = v * d; break
      case 2: x = u * w; y = h / 2; z = v * d; break
      case 3: x = u * w; y = -h / 2; z = v * d; break
      case 4: x = u * w; y = v * h; z = d / 2; break
      default: x = u * w; y = v * h; z = -d / 2
    }
    arr.push(x + ox, y + oy, z + oz)
  }
}

// ---- Definition helpers: hollow shell + bright traced edges so the silhouette reads clearly ----
type P3 = [number, number, number]
const FRONT_Z = 1.1, BACK_Z = -1.1, CY = .35, FW = 2.4, FH = 2.0, TAPER = .62

// Hollow tapered housing: points only on the four side walls and the back panel.
function addCRTShell(arr: number[], count: number) {
  for (let i = 0; i < count; i++) {
    const back = Math.random() < .12
    const t = back ? 1 : Math.random()
    const k = 1 - t * (1 - TAPER), w = FW * k, h = FH * k, z = FRONT_Z + (BACK_Z - FRONT_Z) * t
    if (back) { arr.push((Math.random() - .5) * w, CY + (Math.random() - .5) * h, z); continue }
    const side = Math.floor(Math.random() * 4), u = Math.random() - .5
    if (side < 2) arr.push(u * w, CY + (side ? .5 : -.5) * h, z)
    else arr.push((side === 2 ? .5 : -.5) * w, CY + u * h, z)
  }
}

// Front bezel: a solid frame around the screen opening.
function addBezelFace(arr: number[], count: number, iw: number, ih: number, icy: number) {
  let n = 0
  while (n < count) {
    const x = (Math.random() - .5) * FW, y = CY + (Math.random() - .5) * FH
    if (Math.abs(x) < iw / 2 && Math.abs(y - icy) < ih / 2) continue
    arr.push(x, y, FRONT_Z); n++
  }
}

function addSegment(arr: number[], a: P3, b: P3, per: number, jitter = .006) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const n = Math.max(2, Math.round(len * per))
  for (let i = 0; i < n; i++) {
    const t = Math.random()
    arr.push(a[0] + (b[0] - a[0]) * t + (Math.random() - .5) * jitter, a[1] + (b[1] - a[1]) * t + (Math.random() - .5) * jitter, a[2] + (b[2] - a[2]) * t + (Math.random() - .5) * jitter)
  }
}

function addRect(arr: number[], w: number, h: number, cx: number, cy: number, z: number, per: number) {
  const c: P3[] = [[cx - w / 2, cy - h / 2, z], [cx + w / 2, cy - h / 2, z], [cx + w / 2, cy + h / 2, z], [cx - w / 2, cy + h / 2, z]]
  for (let i = 0; i < 4; i++) addSegment(arr, c[i], c[(i + 1) % 4], per)
}

function addBoxEdges(arr: number[], w: number, h: number, d: number, ox: number, oy: number, oz: number, per: number) {
  const xs = [-w / 2, w / 2], ys = [-h / 2, h / 2], zs = [-d / 2, d / 2]
  for (const y of ys) for (const z of zs) addSegment(arr, [ox + xs[0], oy + y, oz + z], [ox + xs[1], oy + y, oz + z], per)
  for (const x of xs) for (const z of zs) addSegment(arr, [ox + x, oy + ys[0], oz + z], [ox + x, oy + ys[1], oz + z], per)
  for (const x of xs) for (const y of ys) addSegment(arr, [ox + x, oy + y, oz + zs[0]], [ox + x, oy + y, oz + zs[1]], per)
}

function addMonitorEdges(arr: number[], per: number) {
  const bw = FW * TAPER, bh = FH * TAPER
  addRect(arr, FW, FH, 0, CY, FRONT_Z, per)
  addRect(arr, bw, bh, 0, CY, BACK_Z, per * .7)
  for (const sx of [-1, 1]) for (const sy of [-1, 1])
    addSegment(arr, [sx * FW / 2, CY + sy * FH / 2, FRONT_Z], [sx * bw / 2, CY + sy * bh / 2, BACK_Z], per * .8)
}

function addVents(arr: number[], count: number) {
  for (let i = 0; i < count; i++) {
    const row = Math.floor(Math.random() * 8)
    arr.push((Math.random() - .5) * 1.4, 1.34, -.4 + row * .12)
  }
}

function circleTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(.3, 'rgba(255,255,255,.85)')
  grad.addColorStop(.7, 'rgba(255,255,255,.25)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const ASCII = [
  '    _    _             _                ',
  '   / \\  | | __ _  ___ | | ___ _ __  ___ ',
  "  / _ \\ | |/ _` |/ _ \\| |/ _ \\ '_ \\/ __|",
  ' / ___ \\| | (_| | (_) | |  __/ | | \\__ \\',
  '/_/   \\_\\_|\\__, |\\___/|_|\\___|_| |_|___/',
  '           |___/                        '
]

export default function PointCloudComputer({ light = false }: { light?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const lightRef = useRef(light)
  lightRef.current = light
  useEffect(() => {
    const el = host.current
    if (!el) return
    const scene = new THREE.Scene()
    const fog = new THREE.FogExp2(0x090d0b, .018)
    scene.fog = fog
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100)
    camera.position.set(0, .6, 4.7)
    camera.lookAt(0, .05, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const chassisPts: number[] = [], phosphorPts: number[] = []
    addCRTShell(chassisPts, 9000)
    addBezelFace(chassisPts, 4200, 1.98, 1.48, .38)
    addVents(chassisPts, 1200)
    addBoxPoints(chassisPts, 1.4, .18, 1.4, 2000, 0, -.75, 0)          // swivel pedestal
    addBoxPoints(chassisPts, 1.8, .12, 1.7, 1800, 0, -.9, 0)
    addBoxPoints(chassisPts, .5, .05, .08, 400, .65, -.55, 1.12)       // floppy bays
    addBoxPoints(chassisPts, .5, .05, .08, 400, .65, -.45, 1.12)
    addBoxPoints(phosphorPts, .06, .06, .06, 120, -.85, -.55, 1.12)    // power LED
    addBoxPoints(chassisPts, 2.7, .18, 1.1, 4500, 0, -1.05, 1.25)      // keyboard
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++)
      addBoxPoints(chassisPts, .11, .06, .12, 45, -1.1 + c * .155 + (r % 2) * .03, -.92, .85 + r * .18)
    // Bright traced edges (separate, brighter material)
    const edgePts: number[] = []
    addMonitorEdges(edgePts, 260)
    addRect(edgePts, 1.98, 1.48, 0, .38, FRONT_Z + .005, 300)        // screen opening
    addRect(edgePts, 2.12, 1.62, 0, .38, FRONT_Z + .004, 140)        // bezel lip
    addBoxEdges(edgePts, 1.4, .18, 1.4, 0, -.75, 0, 160)              // pedestal
    addBoxEdges(edgePts, 1.8, .12, 1.7, 0, -.9, 0, 160)
    addBoxEdges(edgePts, 2.7, .18, 1.1, 0, -1.05, 1.25, 200)          // keyboard
    for (const y of [-.55, -.45]) addRect(edgePts, .5, .05, .65, y, 1.16, 260)  // floppy slots
    // curved glass dot grid
    const GW = 75, GH = 50
    for (let iy = 0; iy < GH; iy++) for (let ix = 0; ix < GW; ix++) {
      const u = (ix / (GW - 1) - .5) * 1.85, v = (iy / (GH - 1) - .5) * 1.35
      phosphorPts.push(u, v + .38, 1.1 - (u * u * .09 + v * v * .12))
    }

    const dot = circleTexture()
    const mkPoints = (pts: number[], size: number) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
      const mat = new THREE.PointsMaterial({ size, map: dot, transparent: true, depthWrite: false })
      return { mesh: new THREE.Points(geo, mat), mat }
    }
    const chassis = mkPoints(chassisPts, .024)
    const edges = mkPoints(edgePts, .026)
    group.add(edges.mesh)

    // Invisible solid occluders (depth only) so hidden back edges don't show through the glass.
    const occMat = new THREE.MeshBasicMaterial({ colorWrite: false })
    const frustumGeo = (() => {
      const s0 = .985, k = TAPER * .985, z0 = .95, z1 = BACK_Z + .02
      const fw = FW / 2 * s0, fh = FH / 2 * s0, bw = FW / 2 * k, bh = FH / 2 * k
      const v = [-fw, CY - fh, z0, fw, CY - fh, z0, fw, CY + fh, z0, -fw, CY + fh, z0, -bw, CY - bh, z1, bw, CY - bh, z1, bw, CY + bh, z1, -bw, CY + bh, z1]
      const idx = [0, 1, 2, 0, 2, 3, 5, 4, 7, 5, 7, 6, 4, 0, 3, 4, 3, 7, 1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 4, 5, 1, 4, 1, 0]
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx)
      return g
    })()
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), occMat); m.position.set(x, y, z); return m }
    const occluders = [new THREE.Mesh(frustumGeo, occMat), box(1.37, .16, 1.37, 0, -.75, 0), box(1.77, .1, 1.67, 0, -.9, 0), box(2.66, .15, 1.06, 0, -1.05, 1.25)]
    occluders.forEach(o => { o.renderOrder = -1; group.add(o) })
    const phosphor = mkPoints(phosphorPts, .032)
    group.add(chassis.mesh, phosphor.mesh)

    const dustPts: number[] = []
    for (let i = 0; i < 800; i++) dustPts.push((Math.random() - .5) * 14, (Math.random() - .5) * 10, (Math.random() - .5) * 12)
    const dust = mkPoints(dustPts, .02)
    scene.add(dust.mesh)

    // ---- CRT canvas texture ----
    const crt = document.createElement('canvas')
    crt.width = 1024; crt.height = 768
    const ctx = crt.getContext('2d')!
    const crtTex = new THREE.CanvasTexture(crt)
    crtTex.colorSpace = THREE.SRGBColorSpace
    const screenGeo = new THREE.PlaneGeometry(1.82, 1.34, 16, 16)
    const sp = screenGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, -(x * x * .08 + y * y * .1)) }
    screenGeo.computeVertexNormals()
    const screenMat = new THREE.MeshBasicMaterial({ map: crtTex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    const screen = new THREE.Mesh(screenGeo, screenMat)
    screen.position.set(0, .38, 1.09)
    group.add(screen)

    const draw = (time: number) => {
      const L = lightRef.current
      const P = L
        ? { bg0: '#e9f0de', bg1: '#dce6cf', bg2: '#cfdcc0', grid: 'rgba(60,100,40,.10)', grey: '#55604f', green: '#2f6a1d', bright: '#16380b', rule: '#a9b89c', glow: 0 }
        : { bg0: 'rgba(14,34,16,.95)', bg1: 'rgba(9,21,12,.98)', bg2: 'rgba(4,9,5,1)', grid: 'rgba(75,130,60,.12)', grey: '#8C9B92', green: '#A3D977', bright: '#BBF38D', rule: '#26302B', glow: 1 }
      ctx.clearRect(0, 0, 1024, 768)
      const bg = ctx.createRadialGradient(512, 384, 50, 512, 384, 480)
      bg.addColorStop(0, P.bg0); bg.addColorStop(.7, P.bg1); bg.addColorStop(1, P.bg2)
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 768)
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1
      for (let y = 0; y < 768; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke() }

      ctx.shadowBlur = 0
      ctx.font = '700 20px "Space Mono", monospace'
      ctx.fillStyle = P.grey; ctx.fillText('+-- ALGOLENS WORKSTATION 64K --+', 64, 70)
      ctx.fillStyle = P.green; ctx.fillText('[VRAM: 0x0000_FFFF]', 680, 70)
      ctx.strokeStyle = P.rule; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(64, 88); ctx.lineTo(960, 88); ctx.stroke()

      ctx.font = 'bold 33px "Space Mono", monospace'
      ctx.shadowColor = P.bright; ctx.shadowBlur = 14 * P.glow; ctx.fillStyle = P.bright
      ASCII.forEach((line, i) => ctx.fillText(line, 120, 190 + i * 44))

      ctx.shadowBlur = 8 * P.glow; ctx.fillStyle = P.green
      ctx.font = '700 24px "Space Mono", monospace'
      ctx.fillText('>>> PHOSPHOR TERMINAL // READY', 130, 520)
      if (Math.floor(time / 500) % 2 === 0) { ctx.fillStyle = P.bright; ctx.fillRect(630, 500, 16, 26) }

      ctx.shadowBlur = 0
      ctx.font = '18px "JetBrains Mono", "Space Mono", monospace'
      ctx.fillStyle = P.grey
      ctx.fillText('ALU: IDLE // CLK: 33.333MHz // STACK: 0x7FFF_E4B0', 130, 610)
      ctx.fillText('MODULES: SORT / SEARCH / GRAPH / DP — 13 LOADED', 130, 642)

      const sy = (time / 5.5) % 768
      const sg = ctx.createLinearGradient(0, sy - 40, 0, sy + 40)
      sg.addColorStop(0, 'rgba(163,217,119,0)'); sg.addColorStop(.5, L ? 'rgba(255,255,255,.25)' : 'rgba(163,217,119,.15)'); sg.addColorStop(1, 'rgba(163,217,119,0)')
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 40, 1024, 80)
      crtTex.needsUpdate = true
    }

    // Dark mode glows additively; light mode needs normal blending to show on a pale page.
    let applied: boolean | null = null
    const applyTheme = () => {
      const L = lightRef.current
      if (applied === L) return
      applied = L
      const set = (m: THREE.Material & { color?: THREE.Color }, color: number, opacity: number) => {
        m.blending = L ? THREE.NormalBlending : THREE.AdditiveBlending
        m.color?.set(color); m.opacity = opacity; m.needsUpdate = true
      }
      set(chassis.mat, L ? 0x3c4237 : 0x8c9b92, L ? .6 : .7)
      set(edges.mat, L ? 0x14180f : 0xe4e6d8, L ? .9 : 1)
      set(phosphor.mat, L ? 0x7da461 : 0x487a2b, L ? .45 : .7)
      set(dust.mat, L ? 0x8aa57a : 0x588442, L ? .35 : .45)
      set(screenMat, 0xffffff, L ? 1 : .96)
      fog.color.set(L ? 0xf2f0e8 : 0x090d0b)
    }

    // ---- Interaction: hover parallax + drag to spin, Space for a full turn ----
    let targetRotX = .05, targetRotY = 0, dragOffset = 0, dragPitch = 0
    let dragging = false, px = 0, py = 0, hoverX = 0, hoverY = 0
    const clampPitch = (v: number) => Math.max(-.45, Math.min(.65, v))
    const recompute = () => {
      targetRotY = dragOffset + hoverX * .45
      targetRotX = clampPitch(-hoverY * .25 + .05 + dragPitch)
    }
    const onDown = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY }
    const onUp = () => { dragging = false }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      hoverX = Math.max(-1.2, Math.min(1.2, ((e.clientX - r.left) / r.width) * 2 - 1))
      hoverY = Math.max(-1.2, Math.min(1.2, -(((e.clientY - r.top) / r.height) * 2 - 1)))
      if (dragging) {
        dragOffset += (e.clientX - px) * .007
        dragPitch = Math.max(-.5, Math.min(.5, dragPitch + (e.clientY - py) * .007))
        px = e.clientX; py = e.clientY
      }
      recompute()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.closest('input,textarea,button')) return
      e.preventDefault(); dragOffset += Math.PI * 2; recompute()
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('keydown', onKey)

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.position.z = w / h < 1 ? 4.7 / Math.max(.5, w / h) * .85 : 4.7
      camera.updateProjectionMatrix(); renderer.setSize(w, h)
    }
    const observer = new ResizeObserver(resize); observer.observe(el); resize()

    const clock = new THREE.Clock()
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      applyTheme()
      group.rotation.y += (targetRotY - group.rotation.y) * .06
      group.rotation.x += (targetRotX - group.rotation.x) * .06
      group.position.y = Math.sin(t * 1.5) * .035
      dust.mesh.rotation.y = t * .02
      dust.mesh.rotation.x = t * .01
      draw(t * 1000)
      renderer.render(scene, camera)
    }
    document.fonts?.load('700 20px "Space Mono"').catch(() => {})
    animate()

    return () => {
      cancelAnimationFrame(frame); observer.disconnect()
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
      scene.traverse(obj => {
        if (obj instanceof THREE.Points || obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const m = obj.material
          if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose()
        }
      })
      dot.dispose(); crtTex.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [])
  return <div className="computer-stage" ref={host} aria-label="3D stipple CRT workstation. Move the cursor to tilt it, drag to spin." />
}
