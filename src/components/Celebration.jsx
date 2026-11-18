import { useEffect, useRef } from 'react'
import { fmt } from '../db'
import { fmtDuration } from '../workout'

// Festejo al terminar el entrenamiento: check animado, confeti y resumen.
export default function Celebration({ complete, duration, sets, volume, records = [], onDone }) {
  const canvas = useRef()

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) return confetti(canvas.current)
  }, [])

  return (
    <div className="celebrate">
      <canvas ref={canvas} className="confetti" />
      <div className="celebrate-body">
        <div className="big-check">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" className="bc-circle" />
            <path d="M36 62 L53 78 L86 44" className="bc-tick" />
          </svg>
        </div>
        <h2 className="cel-title">{complete ? '¡Entrenamiento completo!' : 'Entrenamiento guardado'}</h2>
        <p className="cel-sub">{complete ? 'Registraste todas las series. ¡Bien ahí!' : 'Buen trabajo hoy.'}</p>

        <div className="cel-stats">
          <div><b>{fmtDuration(duration)}</b><span>duración</span></div>
          <div><b>{sets}</b><span>series</span></div>
          <div><b>{volume >= 1000 ? fmt(Math.round(volume / 100) / 10) + ' t' : fmt(Math.round(volume)) + ' kg'}</b><span>volumen</span></div>
        </div>

        {records.length > 0 && (
          <div className="cel-records">
            <div className="cel-records-title">🏆 {records.length === 1 ? 'Nuevo récord' : `${records.length} récords nuevos`}</div>
            {records.map((r, i) => (
              <div key={r.name} className="cel-record" style={{ animationDelay: 1.1 + i * 0.12 + 's' }}>
                <span className="grow ellipsis">{r.name}</span>
                <b>{fmt(r.kg)} kg</b>
                <span className="cel-prev">antes {fmt(r.prev)}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn cel-btn block" onClick={onDone}>Listo</button>
      </div>
    </div>
  )
}

function confetti(canvas) {
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(devicePixelRatio || 1, 2)
  const W = (canvas.width = innerWidth * dpr)
  const H = (canvas.height = innerHeight * dpr)
  const colors = ['#ffffff', '#7fd59c', '#2a9a53', '#f2c94c', '#c8f0d4']
  const parts = Array.from({ length: 160 }, (_, i) => {
    const fromLeft = i % 2 === 0
    return {
      x: fromLeft ? -10 * dpr : W + 10 * dpr,
      y: H * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 10) * dpr,
      vy: -(10 + Math.random() * 12) * dpr,
      w: (6 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 10) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[i % colors.length],
      round: Math.random() < 0.3,
    }
  })
  let raf
  const start = performance.now()
  const frame = (t) => {
    const age = t - start
    ctx.clearRect(0, 0, W, H)
    ctx.globalAlpha = age > 2400 ? Math.max(0, 1 - (age - 2400) / 800) : 1
    for (const p of parts) {
      p.vy += 0.38 * dpr
      p.vx *= 0.985
      p.vy *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill() }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2)
      ctx.restore()
    }
    if (age < 3200) raf = requestAnimationFrame(frame)
    else ctx.clearRect(0, 0, W, H)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
