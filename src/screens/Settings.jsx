import { useRef } from 'react'
import { db, saveSettings, MUSCLES } from '../db'
import { Topbar, Toggle, useToast } from '../components/ui'
import { useNav } from '../App'

function download(name, text, type) {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export default function Settings() {
  const { settings } = useNav()
  const toast = useToast()
  const fileRef = useRef()

  async function exportJSON() {
    const data = {
      app: 'hierro', version: 1, exportedAt: new Date().toISOString(),
      exercises: await db.exercises.toArray(),
      routines: await db.routines.toArray(),
      workouts: await db.workouts.toArray(),
      settings: await db.settings.toArray(),
    }
    download(`hierro-respaldo-${stamp()}.json`, JSON.stringify(data, null, 1), 'application/json')
    toast('Respaldo descargado')
  }

  async function exportCSV() {
    const ex = await db.exercises.toArray()
    const ws = (await db.workouts.toArray()).filter((w) => w.finishedAt).sort((a, b) => a.date - b.date)
    const name = (id) => ex.find((e) => e.id === id)
    const rows = [['Fecha', 'Entrenamiento', 'Ejercicio', 'Músculo', 'Serie', 'Tipo', 'Kg', 'Reps', 'Kg (der)', 'Reps (der)']]
    const tipo = { normal: 'Normal', warmup: 'Calentamiento', drop: 'Drop set' }
    for (const w of ws)
      for (const e of w.entries)
        e.sets.forEach((s, i) => rows.push([
          new Date(w.date).toLocaleDateString('es-AR'), w.title, name(e.exerciseId)?.name || '', name(e.exerciseId)?.muscle || '',
          i + 1, tipo[s.type] || s.type, s.kg, s.reps, s.kg2 || '', s.reps2 || '',
        ]))
    const csv = rows.map((r) => r.map((c) => {
      const v = String(c ?? '')
      return `"${(/^-?\d+(\.\d+)?$/.test(v) ? v.replace('.', ',') : v).replace(/"/g, '""')}"`
    }).join(';')).join('\n')
    download(`hierro-${stamp()}.csv`, '﻿' + csv, 'text/csv')
    toast('CSV descargado')
  }

  async function importJSON(file) {
    try {
      const data = JSON.parse(await file.text())
      if (data.app !== 'hierro') throw new Error('formato')
      const replace = confirm(
        'Importar respaldo:\n\nAceptar = REEMPLAZAR todo lo que tenés ahora.\nCancelar = COMBINAR con tus datos actuales.',
      )
      await db.transaction('rw', db.exercises, db.routines, db.workouts, db.settings, async () => {
        if (replace) await Promise.all([db.exercises.clear(), db.routines.clear(), db.workouts.clear(), db.settings.clear()])
        await db.exercises.bulkPut(data.exercises || [])
        await db.routines.bulkPut(data.routines || [])
        await db.workouts.bulkPut(data.workouts || [])
        if (data.settings?.length) await db.settings.bulkPut(data.settings)
      })
      toast(`Importado: ${data.workouts?.length || 0} entrenamientos`)
    } catch {
      alert('El archivo no es un respaldo válido de Hierro.')
    }
  }

  async function wipe() {
    if (!confirm('¿Borrar TODOS los datos? Esto no se puede deshacer.')) return
    if (!confirm('¿Seguro? Te recomiendo exportar un respaldo antes.')) return
    await Promise.all([db.exercises.clear(), db.routines.clear(), db.workouts.clear()])
    toast('Datos borrados')
  }

  return (
    <>
      <Topbar title="Ajustes" />

      <div className="section-title">Apariencia</div>
      <div className="card">
        <div className="seg">
          {[['system', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => (
            <button key={k} className={settings.theme === k ? 'on' : ''} onClick={() => saveSettings({ theme: k })}>{l}</button>
          ))}
        </div>
      </div>

      <div className="section-title">Entrenamiento</div>
      <div className="card stack">
        <div className="grid2">
          <label className="field">
            <span>Descanso por defecto (seg)</span>
            <input type="number" inputMode="numeric" value={settings.defaultRest}
              onChange={(e) => saveSettings({ defaultRest: Number(e.target.value) || 0 })} />
          </label>
          <label className="field">
            <span>Aumento por defecto (kg)</span>
            <input type="number" inputMode="decimal" step="0.5" value={settings.defaultIncrement}
              onChange={(e) => saveSettings({ defaultIncrement: Number(e.target.value) || 0 })} />
          </label>
        </div>
        <div className="small muted">Se usan al crear ejercicios nuevos. Cada ejercicio puede tener los suyos.</div>
        <Toggle label="Sonido al terminar el descanso" checked={settings.sound} onChange={(v) => saveSettings({ sound: v })} />
        <Toggle label="Vibrar al terminar el descanso" checked={settings.vibrate} onChange={(v) => saveSettings({ vibrate: v })} />
      </div>

      <div className="section-title">Tus datos</div>
      <div className="card stack">
        <button className="btn outline" onClick={exportJSON}>Exportar respaldo completo (JSON)</button>
        <button className="btn outline" onClick={exportCSV}>Exportar series para Excel (CSV)</button>
        <button className="btn outline" onClick={() => fileRef.current.click()}>Importar respaldo</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={(e) => { e.target.files[0] && importJSON(e.target.files[0]); e.target.value = '' }} />
      </div>

      <div className="section-title">Nube</div>
      <div className="card">
        <div className="bold">Sincronización con Google</div>
        <div className="small muted" style={{ marginTop: 4 }}>
          Próximamente. Por ahora todo se guarda en este dispositivo y funciona sin internet.
          Hacé un respaldo de vez en cuando.
        </div>
      </div>

      <div className="section-title">Zona peligrosa</div>
      <div className="card">
        <button className="btn ghost danger" onClick={wipe}>Borrar todos los datos</button>
      </div>

      <p className="tiny muted" style={{ textAlign: 'center', marginTop: 24 }}>Hierro v0.1 · {MUSCLES.length} grupos musculares</p>
    </>
  )
}
