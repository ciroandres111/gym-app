import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MUSCLES } from '../db'
import { Icon, Topbar } from '../components/ui'
import ExerciseForm from '../components/ExerciseForm'
import { MuscleAvatar, ArtExercises } from '../components/art'

export default function Exercises() {
  const all = useLiveQuery(() => db.exercises.toArray(), []) || []
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // null | 'new' | exercise

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const list = all.filter((e) => !e.archived && (!q || norm(e.name).includes(norm(q))))
  const groups = MUSCLES.map((m) => [m, list.filter((e) => e.muscle === m).sort((a, b) => a.name.localeCompare(b.name))])
    .filter(([, l]) => l.length)

  return (
    <>
      <Topbar title="Ejercicios" sub={`${all.filter((e) => !e.archived).length} cargados`}
        right={<button className="btn primary sm" onClick={() => setForm('new')}><Icon.plus /> Nuevo</button>} />

      <div style={{ position: 'relative' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio…" style={{ paddingLeft: 38 }} />
        <span style={{ position: 'absolute', left: 11, top: 11, width: 18, color: 'var(--muted)' }}><Icon.search /></span>
      </div>

      {groups.map(([m, l]) => (
        <div key={m}>
          <div className="section-title">{m}</div>
          <div className="card stagger" style={{ padding: '4px 16px' }}>
            {l.map((e) => (
              <div key={e.id} className="list-item" onClick={() => setForm(e)}>
                <MuscleAvatar muscle={e.muscle} />
                <div className="grow">
                  <div className="bold">{e.name}</div>
                  <div className="small muted">
                    {e.equipment} · {e.repMin}–{e.repMax} reps · {e.rest}s descanso{e.unilateral ? ' · Unilateral' : ''}
                  </div>
                </div>
                <Icon.edit />
              </div>
            ))}
          </div>
        </div>
      ))}

      {!list.length && (
        <div className="card empty" style={{ marginTop: 16 }}>
          <ArtExercises />
          <div className="big">{q ? 'No se encontró' : 'Tu lista está vacía'}</div>
          {q ? `No tenés "${q}".` : 'Cargá los ejercicios que hacés en tu gimnasio.'}
          <div style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => setForm('new')}><Icon.plus /> {q ? `Crear "${q}"` : 'Crear ejercicio'}</button>
          </div>
        </div>
      )}

      {form && (
        <ExerciseForm
          initial={form === 'new' ? null : form}
          initialName={form === 'new' ? q : ''}
          onClose={() => setForm(null)}
        />
      )}
    </>
  )
}
