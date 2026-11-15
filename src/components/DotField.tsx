import { useEffect, useRef } from 'react'

// Slow drifting stipple dust behind the library screen; dots near the cursor drift away,
// echoing the particle dust around the 3D computer on the home page.
export default function DotField({ light }: { light: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const lightRef = useRef(light)
  lightRef.current = light
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, dpr = 1, raf = 0, mx = -999, my = -999
    type P = { x: number; y: number; vx: number; vy: number; ox: number; oy: number; s: number; a: number }
    let pts: P[] = []
    const fit = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      const n = Math.round(Math.min(260, w * h / 5200))
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .12, vy: -.04 - Math.random() * .12,
        ox: 0, oy: 0, s: Math.random() < .12 ? 2 : 1, a: .25 + Math.random() * .6
      }))
    }
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mx = e.clientX - r.left; my = e.clientY - r.top
    }
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const col = lightRef.current ? '47,106,29' : '165,230,109'
      for (const p of pts) {
        if (!reduced) {
          p.x += p.vx; p.y += p.vy
          if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w }
          if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4
          const dx = p.x + p.ox - mx, dy = p.y + p.oy - my, d = Math.hypot(dx, dy)
          if (d < 90 && d > .1) { const f = (90 - d) / 90 * 2.2; p.ox += dx / d * f; p.oy += dy / d * f }
          p.ox *= .93; p.oy *= .93
        }
        ctx.fillStyle = `rgba(${col},${p.a * (lightRef.current ? .45 : .55)})`
        ctx.fillRect(Math.round(p.x + p.ox), Math.round(p.y + p.oy), p.s, p.s)
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    const ro = new ResizeObserver(() => { fit(); if (reduced) draw() }); ro.observe(canvas); fit()
    window.addEventListener('pointermove', onMove, { passive: true })
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove) }
  }, [])
  return <canvas ref={ref} className="dot-field" aria-hidden="true" />
}
