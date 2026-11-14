import { useEffect, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Types `text` out one character at a time, then keeps a blinking block cursor for a moment. */
export default function Typewriter({ text, speed = 38, holdCursor = 1800 }: { text: string; speed?: number; holdCursor?: number }) {
  const [n, setN] = useState(() => (reduced() ? text.length : 0))
  const [cursor, setCursor] = useState(true)
  useEffect(() => {
    if (reduced()) { setN(text.length); setCursor(false); return }
    setN(0); setCursor(true)
    let i = 0
    const id = window.setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) window.clearInterval(id)
    }, speed)
    const hide = window.setTimeout(() => setCursor(false), text.length * speed + holdCursor)
    return () => { window.clearInterval(id); window.clearTimeout(hide) }
  }, [text, speed, holdCursor])
  return <span className="typewriter" aria-label={text}>
    <span aria-hidden="true">{text.slice(0, n)}</span>
    {cursor && <span className="type-cursor" aria-hidden="true" />}
  </span>
}
