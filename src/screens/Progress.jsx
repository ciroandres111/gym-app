import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, startOfWeek, setVolume, isWorking, fmt, MUSCLES } from '../db'
import { Topbar } from '../components/ui'

const WEEKS = 10

export default function Progress() {
  const workouts = useLiveQuery(() => db.workouts.filter((w) => !!w.finishedAt).toArray(), []) || []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const [metric, setMetric] = useState('sets') // sets | kg
  const thisWeek = startOfWeek(new Date()).getTime()
  const [selWeek, setSelWeek] = useState(thisWeek)
  const [exId, setExId] = useState('')

  const muscleOf = (eid) => exercises.find((e) => e.id === eid)?.muscle || 'Otro'

  // Semanas: [{start, sets, kg, muscles: {m: {sets, kg}}}]
  const weeks = []
  for (let i = WEEKS - 1; i >= 0; i--) {
    const d = new Date(thisWeek)
    d.setDate(d.getDate() - i * 7)
    weeks.push({ start: d.getTime(), sets: 0, kg: 0, count: 0, muscles: {} })
  }
  for (const w of workouts) {
    const wk = weeks.find((x) => w.date >= x.start && w.date < x.start + 7 * 864e5)
    if (!wk) continue
    wk.count++
    for (const e of w.entries) {
      const m = muscleOf(e.exerciseId)
      const mm = (wk.muscles[m] ||= { sets: 0, kg: 0 })
      for (const s of e.sets.filter(isWorking)) {
        const v = setVolume(s)
        wk.sets++; wk.kg += v; mm.sets++; mm.kg += v
      }
    }
  }
  const max = Math.max(1, ...weeks.map((w) => w[metric]))
  const cur = weeks.find((w) => w.start === selWeek) || weeks[weeks.length - 1]
  const muscleRows = Object.entries(cur.muscles).sort((a, b) => b[1][metric] - a[1][metric])
  const mMax = Math.max(1, ...muscleRows.map(([, v]) => v[metric]))
  const short = (n) => (metric === 'kg' ? (n >= 1000 ? fmt(Math.round(n / 100) / 10) + 't' : fmt(Math.round(n))) : String(n))
  const label = (t) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })

  // Progreso de un ejercicio: mejor peso por sesión
  const used = exercises.filter((e) => workouts.some((w) => w.entries.some((x) => x.exerciseId === e.id)))
  const series = exId
    ? workouts
        .filter((w) => w.entries.some((x) => x.exerciseId === exId))
        .sort((a, b) => a.date - b.date)
        .map((w) => {
          const sets = w.entries.filter((x) => x.exerciseId === exId).flatMap((x) => x.sets).filter((s) => isWorking(s))
          const top = Math.max(0, ...sets.map((s) => Math.max(+s.kg || 0, +s.kg2 || 0)))
          const e1rm = Math.max(0, ...sets.map((s) => (+s.kg || 0) * (1 + (+s.reps || 0) / 30)))
          return { date: w.date, top, e1rm }
        })
        .slice(-12)
    : []
  const sMax = Math.max(1, ...series.map((s) => s.top))

  return (
    <>
      <Topbar title="Progreso" />

      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={metric === 'sets' ? 'on' : ''} onClick={() => setMetric('sets')}>Series</button>
        <button className={metric === 'kg' ? 'on' : ''} onClick={() => setMetric('kg')}>Volumen (kg)</button>
      </div>

      <div className="card">
        <div className="bold">Volumen semanal</div>
        <div className="small muted">{metric === 'sets' ? 'Series efectivas por semana' : 'Kilos × repeticiones por semana'} · tocá una barra</div>
        <div className="bars">
          {weeks.map((w) => (
            <div key={w.start} className={'b' + (w.start === cur.start ? ' on' : '')} onClick={() => setSelWeek(w.start)}>
              <span style={{ color: 'var(--text)' }}>{w[metric] ? short(w[metric]) : ''}</span>
              <i style={{ height: (w[metric] / max) * 100 + '%' }} />
              <span>{label(w.start)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">
        Por músculo · semana del {new Date(cur.start).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
      </div>
      <div className="card">
        {muscleRows.length ? (
          muscleRows.map(([m, v]) => (
            <div key={m} className="hbar">
              <span className="ellipsis">{m}</span>
              <span className="track"><i style={{ width: (v[metric] / mMax) * 100 + '%' }} /></span>
              <b>{metric === 'sets' ? `${v.sets} series` : `${fmt(Math.round(v.kg))} kg`}</b>
            </div>
          ))
        ) : (
          <div className="empty" style={{ padding: 16 }}>Sin entrenamientos esta semana</div>
        )}
        {muscleRows.length > 0 && (
          <div className="small muted" style={{ marginTop: 8 }}>
            Sin trabajar: {MUSCLES.filter((m) => !cur.muscles[m]).join(', ') || 'ninguno 🎉'}
          </div>
        )}
      </div>

      <div className="section-title">Por ejercicio</div>
      <div className="card">
        <select value={exId} onChange={(e) => setExId(e.target.value)}>
          <option value="">Elegí un ejercicio…</option>
          {used.sort((a, b) => a.name.localeCompare(b.name)).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {exId && series.length > 0 && (
          <>
            <div className="row" style={{ marginTop: 12 }}>
              <div className="grow"><div className="tiny muted">Mejor peso</div><div className="bold" style={{ fontSize: 20 }}>{fmt(Math.max(...series.map((s) => s.top)))} kg</div></div>
              <div className="grow"><div className="tiny muted">1RM estimado</div><div className="bold" style={{ fontSize: 20 }}>{fmt(Math.round(Math.max(...series.map((s) => s.e1rm))))} kg</div></div>
            </div>
            <div className="bars" style={{ height: 130 }}>
              {series.map((s) => (
                <div key={s.date} className="b on">
                  <span style={{ color: 'var(--text)' }}>{fmt(s.top)}</span>
                  <i style={{ height: (s.top / sMax) * 100 + '%' }} />
                  <span>{label(s.date)}</span>
                </div>
              ))}
            </div>
            <div className="tiny muted">Peso más alto por sesión (últimas 12)</div>
          </>
        )}
      </div>
    </>
  )
}
