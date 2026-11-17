import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MUSCLES } from '../db'
import { Sheet, Icon } from './ui'
import ExerciseForm from './ExerciseForm'

// Buscador de ejercicios. Si no existe, se crea ahí mismo.
export default function ExercisePicker({ onPick, onClose, multi = true }) {
  const all = useLiveQuery(() => db.exercises.toArray(), []) || []
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState('')
  const [sel, setSel] = useState([])
  const [creating, setCreating] = useState(false)

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const list = all
    .filter((e) => !e.archived)
    .filter((e) => !muscle || e.muscle === muscle)
    .filter((e) => !q || norm(e.name).includes(norm(q)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const pick = (ids) => { onPick(ids); onClose() }

  if (creating)
    return (
      <ExerciseForm
        initialName={q}
        onClose={() => setCreating(false)}
        onSaved={(ex) => (multi ? setSel((s) => [...s, ex.id]) : pick([ex.id]))}
      />
    )

  return (
    <Sheet title="Agregar ejercicio" onClose={onClose}>
      <div className="stack">
        <div className="row">
          <div className="grow" style={{ position: 'relative' }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" style={{ paddingLeft: 38 }} />
            <span style={{ position: 'absolute', left: 11, top: 11, width: 18, color: 'var(--muted)' }}><Icon.search /></span>
          </div>
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)} style={{ width: 130 }}>
            <option value="">Todos</option>
            {MUSCLES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        <button className="btn outline" onClick={() => setCreating(true)}>
          <Icon.plus /> {q ? `Crear "${q}"` : 'Crear ejercicio nuevo'}
        </button>

        <div>
          {list.map((e) => (
            <div key={e.id} className="list-item" onClick={() => (multi ? toggle(e.id) : pick([e.id]))}>
              <div className="grow">
                <div className="bold">{e.name}</div>
                <div className="small muted">{e.muscle} · {e.equipment}{e.unilateral ? ' · Unilateral' : ''}</div>
              </div>
              {multi && <span className={'check' + (sel.includes(e.id) ? ' on' : '')}><Icon.check /></span>}
            </div>
          ))}
          {!list.length && (
            <div className="empty">
              <div className="big">{all.length ? 'No se encontró' : 'Todavía no tenés ejercicios'}</div>
              Creá uno con el botón de arriba.
            </div>
          )}
        </div>
        {multi && (
          <button className="btn primary block" disabled={!sel.length} onClick={() => pick(sel)}>
            Agregar {sel.length || ''}
          </button>
        )}
      </div>
    </Sheet>
  )
}
