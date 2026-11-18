import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, SPLITS, startOfWeek, setVolume, isWorking, fmt } from '../db'
import { startWorkout, fmtDuration } from '../workout'
import { Icon, Sheet, Topbar } from '../components/ui'
import { useNav } from '../App'
import { SplitArt, ArtRoutines, HeroPlates } from '../components/art'

export default function Home() {
  const nav = useNav()
  const routines = useLiveQuery(() => db.routines.orderBy('name').toArray(), []) || []
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) || []
  const [picking, setPicking] = useState(false)

  const active = workouts.find((w) => !w.finishedAt)
  const weekStart = startOfWeek(new Date()).getTime()
  const week = workouts.filter((w) => w.finishedAt && w.date >= weekStart)
  const weekSets = week.reduce((n, w) => n + w.entries.reduce((m, e) => m + e.sets.filter(isWorking).length, 0), 0)
  const weekVol = week.reduce((n, w) => n + w.entries.reduce((m, e) => m + e.sets.filter(isWorking).reduce((a, s) => a + setVolume(s), 0), 0), 0)

  const lastDone = (routineId) =>
    workouts.filter((w) => w.finishedAt && w.routineId === routineId).sort((a, b) => b.date - a.date)[0]

  async function begin(routine, day) {
    const id = await startWorkout({ routine, day })
    nav.push('workout', { id })
  }

  async function createFrom(split) {
    const r = {
      id: uid(),
      name: split.key === 'custom' ? 'Mi rutina' : split.name,
      split: split.key,
      createdAt: Date.now(),
      days: split.days.map((name) => ({ id: uid(), name, exercises: [] })),
    }
    await db.routines.put(r)
    setPicking(false)
    nav.push('routine', { id: r.id })
  }

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <>
      <Topbar title={greet} sub={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} />

      {active ? (
        <div className="hero">
          <HeroPlates />
          <h2>Entrenamiento en curso</h2>
          <p>{active.title} · {fmtDuration(Date.now() - active.startedAt)}</p>
          <button className="btn" onClick={() => nav.push('workout', { id: active.id })}><Icon.play /> Continuar</button>
        </div>
      ) : (
        <div className="hero">
          <HeroPlates />
          <h2>Esta semana</h2>
          <p>{week.length ? '¡Seguí así!' : 'Todavía no entrenaste esta semana.'}</p>
          <div className="stat-row">
            <div><b>{week.length}</b><span>entrenamientos</span></div>
            <div><b>{weekSets}</b><span>series</span></div>
            <div><b>{weekVol >= 1000 ? fmt(Math.round(weekVol / 100) / 10) + ' t' : fmt(weekVol) + ' kg'}</b><span>volumen</span></div>
          </div>
        </div>
      )}

      <div className="row" style={{ margin: '24px 4px 8px' }}>
        <div className="section-title grow" style={{ margin: 0 }}>Mis rutinas</div>
        <button className="btn sm primary" onClick={() => setPicking(true)}><Icon.plus /> Nueva</button>
      </div>

      <div className="stack stagger">
        {routines.map((r) => {
          const last = lastDone(r.id)
          const lastIdx = last ? r.days.findIndex((d) => d.id === last.dayId) : -1
          const nextId = r.days[(lastIdx + 1) % r.days.length]?.id
          return (
            <div key={r.id} className="card">
              <div className="row" style={{ marginBottom: 10, gap: 12 }}>
                <SplitArt split={r.split} name={r.name} days={r.days.length} />
                <div className="grow">
                  <div className="bold" style={{ fontSize: 17 }}>{r.name}</div>
                  <div className="small muted">
                    {r.days.length} días{last ? ` · último: ${new Date(last.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}` : ''}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => nav.push('routine', { id: r.id })} aria-label="Editar"><Icon.edit /></button>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {r.days.map((d) => (
                  <button key={d.id} className="day-pill" onClick={() => begin(r, d)} disabled={!!active}>
                    <span className="play"><Icon.play /></span>
                    <span className="grow">
                      <span className="bold">{d.name}</span>
                      <span className="small muted" style={{ display: 'block' }}>
                        {d.exercises.length ? `${d.exercises.length} ejercicios` : 'Sin ejercicios — tocá ✎ para agregar'}
                      </span>
                    </span>
                    {d.id === nextId && !active && <span className="chip accent">Próximo</span>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {!routines.length && (
          <div className="card empty">
            <ArtRoutines />
            <div className="big">Armá tu primera rutina</div>
            Elegí un split (PPL, Arnold, Upper/Lower…) y cargá tus ejercicios.
            <div style={{ marginTop: 14 }}>
              <button className="btn primary" onClick={() => setPicking(true)}><Icon.plus /> Nueva rutina</button>
            </div>
          </div>
        )}
        {!active && (
          <button className="btn outline block" onClick={() => begin(null, null)}>Entrenamiento libre</button>
        )}
      </div>

      {picking && (
        <Sheet title="Elegí un split" onClose={() => setPicking(false)}>
          <div>
            {SPLITS.map((s) => (
              <div key={s.key} className="list-item" onClick={() => createFrom(s)}>
                <SplitArt split={s.key} days={s.days.length} />
                <div className="grow">
                  <div className="bold">{s.name}</div>
                  <div className="small muted">{s.desc}{s.key !== 'custom' ? ' · ' + s.days.join(' / ') : ''}</div>
                </div>
                <span className="add-dot"><Icon.plus /></span>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </>
  )
}
