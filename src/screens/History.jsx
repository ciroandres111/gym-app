import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, dayKey, setVolume, isWorking, fmt } from '../db'
import { fmtDuration } from '../workout'
import { Icon, Topbar } from '../components/ui'
import { useNav } from '../App'

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function History() {
  const nav = useNav()
  const workouts = useLiveQuery(() => db.workouts.filter((w) => !!w.finishedAt).toArray(), []) || []
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const [sel, setSel] = useState(dayKey(new Date()))

  const byDay = {}
  for (const w of workouts) (byDay[dayKey(w.date)] ||= []).push(w)

  const first = new Date(month)
  const offset = (first.getDay() + 6) % 7
  const cells = []
  for (let i = -offset; i < 42 - offset; i++) {
    const d = new Date(month.getFullYear(), month.getMonth(), 1 + i)
    cells.push(d)
  }
  // recortar la última semana si es entera del mes siguiente
  while (cells.length > 35 && cells[cells.length - 7].getMonth() !== month.getMonth()) cells.splice(-7)

  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
  const monthCount = workouts.filter((w) => {
    const d = new Date(w.date)
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
  }).length
  const today = dayKey(new Date())
  const selList = (byDay[sel] || []).sort((a, b) => a.date - b.date)
  const recent = [...workouts].sort((a, b) => b.date - a.date).slice(0, 10)

  return (
    <>
      <Topbar title="Historial" sub={`${workouts.length} entrenamientos en total`} />

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior"><Icon.back /></button>
          <div className="grow" style={{ textAlign: 'center' }}>
            <div className="bold" style={{ textTransform: 'capitalize' }}>
              {month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </div>
            <div className="tiny muted">{monthCount} entrenamientos</div>
          </div>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Mes siguiente" style={{ transform: 'rotate(180deg)' }}><Icon.back /></button>
        </div>
        <div className="cal">
          {DOW.map((d, i) => <div key={i} className="dow">{d}</div>)}
          {cells.map((d) => {
            const k = dayKey(d)
            const n = byDay[k]?.length || 0
            const cls = ['d', d.getMonth() !== month.getMonth() && 'out', k === today && 'today', n && 'has', k === sel && 'sel'].filter(Boolean).join(' ')
            return (
              <button key={k} className={cls} onClick={() => setSel(k)}>
                {d.getDate()}
                {n > 1 && <span className="dots">×{n}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="section-title">
        {new Date(sel + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <div className="stack">
        {selList.map((w) => <WorkoutCard key={w.id} w={w} onOpen={() => nav.push('workout', { id: w.id })} />)}
        {!selList.length && <div className="card empty" style={{ padding: 20 }}>Día de descanso</div>}
      </div>

      {recent.length > 0 && (
        <>
          <div className="section-title">Últimos entrenamientos</div>
          <div className="stack">
            {recent.map((w) => <WorkoutCard key={w.id} w={w} showDate onOpen={() => nav.push('workout', { id: w.id })} />)}
          </div>
        </>
      )}
    </>
  )
}

function WorkoutCard({ w, showDate, onOpen }) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const sets = w.entries.reduce((n, e) => n + e.sets.filter(isWorking).length, 0)
  const vol = w.entries.reduce((n, e) => n + e.sets.filter(isWorking).reduce((a, s) => a + setVolume(s), 0), 0)
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onOpen}>
      <div className="row">
        <div className="grow">
          <div className="bold">{w.title}</div>
          <div className="small muted">
            {showDate && new Date(w.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · '}
            {fmtDuration(w.finishedAt - w.startedAt)} · {sets} series · {fmt(vol)} kg
          </div>
        </div>
        {w.routineName && <span className="chip">{w.routineName}</span>}
      </div>
      <div className="small muted" style={{ marginTop: 8 }}>
        {w.entries.map((e) => exercises.find((x) => x.id === e.exerciseId)?.name).filter(Boolean).join(' · ')}
      </div>
    </div>
  )
}
