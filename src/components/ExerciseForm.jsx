import { useState } from 'react'
import { db, uid, MUSCLES, EQUIPMENT, getSettings } from '../db'
import { Sheet, Toggle, useToast } from './ui'

export default function ExerciseForm({ initial, initialName = '', onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(
    initial || {
      name: initialName, muscle: 'Pecho', equipment: 'Máquina', unilateral: false,
      repMin: 8, repMax: 12, increment: '', rest: '', notes: '',
    },
  )
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }))

  async function save() {
    const name = f.name.trim()
    if (!name) return toast('Poné un nombre')
    const dup = await db.exercises.filter((e) => e.name.toLowerCase() === name.toLowerCase() && e.id !== f.id).first()
    if (dup) return toast('Ya existe un ejercicio con ese nombre')
    const s = await getSettings()
    const ex = {
      ...f, name,
      id: f.id || uid(),
      repMin: Number(f.repMin) || 8,
      repMax: Math.max(Number(f.repMax) || 12, Number(f.repMin) || 8),
      increment: f.increment === '' ? s.defaultIncrement : Number(f.increment),
      rest: f.rest === '' ? s.defaultRest : Number(f.rest),
      createdAt: f.createdAt || Date.now(),
    }
    await db.exercises.put(ex)
    toast(initial ? 'Ejercicio actualizado' : 'Ejercicio creado')
    onSaved?.(ex)
    onClose()
  }

  async function remove() {
    if (!confirm(`¿Borrar "${f.name}"? Tu historial con este ejercicio se conserva.`)) return
    await db.exercises.update(f.id, { archived: true })
    toast('Ejercicio borrado')
    onClose()
  }

  return (
    <Sheet title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'} onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span>Nombre</span>
          <input autoFocus value={f.name} onChange={set('name')} placeholder="Ej: Press banca inclinado" />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Músculo principal</span>
            <select value={f.muscle} onChange={set('muscle')}>
              {MUSCLES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Equipo</span>
            <select value={f.equipment} onChange={set('equipment')}>
              {EQUIPMENT.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
        </div>
        <Toggle
          label="Unilateral"
          desc="Se anota cada lado por separado (izquierdo / derecho)"
          checked={!!f.unilateral}
          onChange={set('unilateral')}
        />
        <div className="grid2">
          <label className="field">
            <span>Reps mínimas</span>
            <input type="number" inputMode="numeric" value={f.repMin} onChange={set('repMin')} />
          </label>
          <label className="field">
            <span>Reps máximas</span>
            <input type="number" inputMode="numeric" value={f.repMax} onChange={set('repMax')} />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Aumento de peso (kg)</span>
            <input type="number" inputMode="decimal" step="0.5" value={f.increment} onChange={set('increment')} placeholder="Por defecto" />
          </label>
          <label className="field">
            <span>Descanso (seg)</span>
            <input type="number" inputMode="numeric" value={f.rest} onChange={set('rest')} placeholder="Por defecto" />
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Cuando llegues a las reps máximas en todas las series, la app te sugiere subir el peso.
        </p>
        <label className="field">
          <span>Notas</span>
          <textarea rows={2} value={f.notes} onChange={set('notes')} placeholder="Altura del asiento, agarre, etc." />
        </label>
        <button className="btn primary block" onClick={save}>Guardar</button>
        {initial && <button className="btn ghost danger" onClick={remove}>Borrar ejercicio</button>}
      </div>
    </Sheet>
  )
}
