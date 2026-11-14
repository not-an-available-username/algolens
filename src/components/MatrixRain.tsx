import { useEffect, useRef } from 'react'

export default function MatrixRain({ light = false }: { light?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const lightRef = useRef(light)
  lightRef.current = light
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = 0, height = 0, raf = 0, last = 0
    const fontSize = 14
    let drops: number[] = []
    const chars = 'アカサタナハマヤラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}+-*/'
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth; height = window.innerHeight
      canvas.width = width * dpr; canvas.height = height * dpr
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drops = Array.from({ length: Math.ceil(width / fontSize) }, () => Math.random() * -80)
    }
    const draw = (time: number) => {
      raf = requestAnimationFrame(draw)
      if (document.hidden || time - last < 65) return
      last = time
      const L = lightRef.current
      // Fade existing glyphs toward transparent so the canvas never tints the page.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.font = `${fontSize}px "Share Tech Mono", monospace`
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const bright = Math.random() > 0.985
        ctx.fillStyle = L ? (bright ? 'rgba(30,80,20,.55)' : 'rgba(60,110,45,.22)') : (bright ? 'rgba(190,255,145,.8)' : 'rgba(104,164,83,.34)')
        ctx.fillText(char, i * fontSize, y * fontSize)
        if (y * fontSize > height && Math.random() > 0.975) drops[i] = 0
        else drops[i] += Math.random() > 0.92 ? 0.8 : 0.34
      })
    }
    resize()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="matrix-canvas" aria-hidden="true" />
}
