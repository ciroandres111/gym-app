import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../db'
import { toggleLink, move, isLinkedToNext } from '../workout'
import { Icon, Topbar, useToast } from '../components/ui'
import ExercisePicker from '../components/ExercisePicker'
import { useNav } from '../App'

export default function RoutineEditor({ id }) {
  const nav = useNav()
  const toast = useToast()
  const r = useLiveQuery(() => db.routines.get(id), [id])
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const [pickFor, setPickFor] = useState(null)

  if (!r) return null
  const exName = (eid) => exercises.find((e) => e.id === eid)?.name || 'Ejercicio borrado'
  const save = (patch) => db.routines.update(id, patch)
  const updateDay = (dayId, fn) => save({ days: r.days.map((d) => (d.id === dayId ? fn(d) : d)) })

  async function removeRoutine() {
    if (!confirm(`¿Borrar la rutina "${r.name}"? Tu historial se conserva.`)) return
    await db.routines.delete(id)
    toast('Rutina borrada')
    nav.pop()
  }

  function moveDay(i, dir) {
    const j = i + dir
    if (j < 0 || j >= r.days.length) return
    const days = [...r.days]
    ;[days[i], days[j]] = [days[j], days[i]]
    save({ days })
  }

  return (
    <>
      <Topbar title="Editar rutina" onBack={nav.pop}
        right={<button className="icon-btn" onClick={removeRoutine} aria-label="Borrar rutina"><Icon.trash /></button>} />

      <label className="field">
        <span>Nombre de la rutina</span>
        <input value={r.name} onChange={(e) => save({ name: e.target.value })} />
      </label>

      <div className="section-title">Días</div>
      <div className="stack">
        {r.days.map((d, di) => (
          <div key={d.id} className="card">
            <div className="row">
              <input className="grow bold" value={d.name} onChange={(e) => updateDay(d.id, (x) => ({ ...x, name: e.target.value }))} />
              <button className="icon-btn" onClick={() => moveDay(di, -1)} aria-label="Subir"><Icon.up /></button>
              <button className="icon-btn" onClick={() => moveDay(di, 1)} aria-label="Bajar"><Icon.down /></button>
              <button className="icon-btn" aria-label="Borrar día"
                onClick={() => confirm(`¿Borrar "${d.name}"?`) && save({ days: r.days.filter((x) => x.id !== d.id) })}>
                <Icon.trash />
              </button>
            </div>

            <div style={{ marginTop: 6 }}>
              {d.exercises.map((x, i) => {
                const linkedNext = isLinkedToNext(d.exercises, i)
                const linkedPrev = i > 0 && isLinkedToNext(d.exercises, i - 1)
                const setItems = (items) => updateDay(d.id, (dd) => ({ ...dd, exercises: items }))
                return (
                  <div key={x.id}>
                    <div className="row" style={{
                      padding: '8px 0 8px 10px',
                      borderLeft: x.groupId ? '3px solid var(--accent)' : '3px solid transparent',
                      marginTop: linkedPrev ? 0 : 4,
                    }}>
                      <div className="grow">
                        <div className="bold ellipsis">{exName(x.exerciseId)}</div>
                        {x.groupId && !linkedPrev && <div className="tiny bold" style={{ color: 'var(--accent)' }}>SUPERSERIE</div>}
                      </div>
                      <select value={x.sets} style={{ width: 84, padding: '6px 8px' }}
                        onChange={(e) => setItems(d.exercises.map((y) => (y.id === x.id ? { ...y, sets: Number(e.target.value) } : y)))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} series</option>)}
                      </select>
                      <button className="icon-btn" onClick={() => setItems(move(d.exercises, i, -1))} aria-label="Subir"><Icon.up /></button>
                      <button className="icon-btn" onClick={() => setItems(move(d.exercises, i, 1))} aria-label="Bajar"><Icon.down /></button>
                      <button className="icon-btn" onClick={() => setItems(d.exercises.filter((y) => y.id !== x.id))} aria-label="Quitar"><Icon.x /></button>
                    </div>
                    {i < d.exercises.length - 1 && (
                      <button className="btn ghost sm" style={{ color: linkedNext ? 'var(--accent)' : 'var(--muted)', marginLeft: 4 }}
                        onClick={() => setItems(toggleLink(d.exercises, i))}>
                        <Icon.link /> {linkedNext ? 'En superserie (separar)' : 'Hacer superserie con el siguiente'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <button className="btn outline block" style={{ marginTop: 10 }} onClick={() => setPickFor(d.id)}>
              <Icon.plus /> Agregar ejercicios
            </button>
          </div>
        ))}

        <button className="btn outline block"
          onClick={() => save({ days: [...r.days, { id: uid(), name: `Día ${r.days.length + 1}`, exercises: [] }] })}>
          <Icon.plus /> Agregar día
        </button>
        <button className="btn primary block" onClick={nav.pop}>Listo</button>
      </div>

      {pickFor && (
        <ExercisePicker
          onClose={() => setPickFor(null)}
          onPick={(ids) => updateDay(pickFor, (d) => ({
            ...d, exercises: [...d.exercises, ...ids.map((eid) => ({ id: uid(), exerciseId: eid, sets: 3, groupId: null }))],
          }))}
        />
      )}
    </>
  )
}
