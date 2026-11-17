import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, lastPerformance, suggestion, fmt, setVolume, isWorking } from '../db'
import { newEntry, newSet, toggleLink, move, isLinkedToNext, fmtDuration } from '../workout'
import { Icon, Sheet, Topbar, useToast } from '../components/ui'
import ExercisePicker from '../components/ExercisePicker'
import ExerciseForm from '../components/ExerciseForm'
import { useNav } from '../App'

export default function Workout({ id }) {
  const nav = useNav()
  const toast = useToast()
  // El entrenamiento vive en memoria y se guarda en segundo plano: así no se pisan los cambios rápidos.
  const [w, setW] = useState(undefined)
  const dirty = useRef(false)
  useEffect(() => { db.workouts.get(id).then((x) => setW(x || null)) }, [id])
  useEffect(() => { if (w && dirty.current) db.workouts.put(w) }, [w])
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState(null) // índice de entry
  const [editing, setEditing] = useState(null)
  const [, tick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (w === undefined) return null
  if (!w) return <Topbar title="Entrenamiento no encontrado" onBack={nav.pop} />

  const readOnly = !!w.finishedAt
  const exById = (eid) => exercises.find((e) => e.id === eid)
  const save = (patch) => {
    dirty.current = true
    setW((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }
  const setEntries = (entries) => save({ entries })
  const updateEntry = (eid, fn) => save((prev) => ({ entries: prev.entries.map((e) => (e.id === eid ? fn(e) : e)) }))

  function startRest(entryIdx) {
    const entries = w.entries
    // En superserie, el descanso arranca después del último ejercicio del grupo.
    if (isLinkedToNext(entries, entryIdx)) return
    const ex = exById(entries[entryIdx].exerciseId)
    const secs = Number(ex?.rest) || nav.settings.defaultRest
    save({ restEnd: Date.now() + secs * 1000, restTotal: secs })
  }

  async function finish() {
    const pending = w.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0)
    const doneCount = w.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    if (!doneCount) {
      if (confirm('No marcaste ninguna serie. ¿Descartar el entrenamiento?')) {
        dirty.current = false
        await db.workouts.delete(id)
        nav.pop()
      }
      return
    }
    if (pending && !confirm(`Hay ${pending} series sin marcar. Se van a descartar. ¿Terminar igual?`)) return
    const entries = w.entries
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length)
    dirty.current = false
    await db.workouts.put({ ...w, entries, finishedAt: Date.now(), restEnd: null })
    toast('¡Entrenamiento guardado! 💪')
    nav.reset('home')
  }

  async function discard() {
    if (!confirm('¿Descartar este entrenamiento? Se pierde todo lo anotado.')) return
    dirty.current = false
    await db.workouts.delete(id)
    nav.pop()
  }

  const totalVol = w.entries.reduce((n, e) => n + e.sets.filter(isWorking).reduce((a, s) => a + setVolume(s), 0), 0)
  const doneSets = w.entries.reduce((n, e) => n + e.sets.filter(isWorking).length, 0)
  const elapsed = (w.finishedAt || Date.now()) - w.startedAt

  return (
    <>
      <Topbar
        title={w.title}
        sub={`${readOnly ? new Date(w.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' : ''}${fmtDuration(elapsed)} · ${doneSets} series · ${fmt(totalVol)} kg`}
        onBack={nav.pop}
        right={!readOnly && <button className="btn primary sm" onClick={finish}>Terminar</button>}
      />

      <div className="stack">
        {w.entries.map((e, i) => {
          const linkedPrev = i > 0 && isLinkedToNext(w.entries, i - 1)
          const startsGroup = e.groupId && !linkedPrev
          return (
            <div key={e.id}>
              {startsGroup && <div className="ss-label" style={{ marginBottom: 8 }}>SUPERSERIE</div>}
              <ExerciseBlock
                entry={e}
                exercise={exById(e.exerciseId)}
                workoutId={id}
                readOnly={readOnly}
                inGroup={!!e.groupId}
                onChange={(fn) => updateEntry(e.id, fn)}
                onSetDone={() => startRest(i)}
                onMenu={() => setMenu(i)}
              />
            </div>
          )
        })}

        {!w.entries.length && (
          <div className="card empty">
            <div className="big">Sin ejercicios</div>
            Agregá el primero para empezar.
          </div>
        )}

        {!readOnly && (
          <>
            <button className="btn outline block" onClick={() => setPicking(true)}><Icon.plus /> Agregar ejercicio</button>
            <label className="field">
              <span>Notas del entrenamiento</span>
              <textarea rows={2} value={w.notes || ''} onChange={(ev) => save({ notes: ev.target.value })} placeholder="Cómo te sentiste, molestias, etc." />
            </label>
            <button className="btn primary block" onClick={finish}>Terminar entrenamiento</button>
            <button className="btn ghost danger" onClick={discard}>Descartar</button>
          </>
        )}
        {readOnly && (
          <>
            {w.notes && <div className="card small">{w.notes}</div>}
            <button className="btn ghost danger" onClick={async () => {
              if (!confirm('¿Borrar este entrenamiento del historial?')) return
              await db.workouts.delete(id)
              nav.pop()
            }}>Borrar del historial</button>
          </>
        )}
      </div>

      {!readOnly && w.restEnd && <div style={{ height: 76 }} />}
      {!readOnly && w.restEnd && <RestTimer w={w} onChange={save} />}

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => setEntries([...w.entries, ...ids.map((eid) => newEntry(eid, 3))])}
        />
      )}

      {menu !== null && w.entries[menu] && (
        <Sheet title={exById(w.entries[menu].exerciseId)?.name || 'Ejercicio'} onClose={() => setMenu(null)}>
          <div className="stack" style={{ gap: 8 }}>
            {menu < w.entries.length - 1 && (
              <button className="btn outline" onClick={() => { setEntries(toggleLink(w.entries, menu)); setMenu(null) }}>
                <Icon.link /> {isLinkedToNext(w.entries, menu) ? 'Separar de la superserie' : 'Superserie con el siguiente'}
              </button>
            )}
            <div className="grid2">
              <button className="btn outline" onClick={() => { setEntries(move(w.entries, menu, -1)); setMenu(null) }}><Icon.up /> Subir</button>
              <button className="btn outline" onClick={() => { setEntries(move(w.entries, menu, 1)); setMenu(null) }}><Icon.down /> Bajar</button>
            </div>
            <button className="btn outline" onClick={() => { setEditing(exById(w.entries[menu].exerciseId)); setMenu(null) }}>
              <Icon.edit /> Editar ejercicio (reps, descanso…)
            </button>
            <button className="btn outline danger" onClick={() => { setEntries(w.entries.filter((_, j) => j !== menu)); setMenu(null) }}>
              <Icon.trash /> Quitar del entrenamiento
            </button>
          </div>
        </Sheet>
      )}

      {editing && <ExerciseForm initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function ExerciseBlock({ entry, exercise, workoutId, readOnly, inGroup, onChange, onSetDone, onMenu }) {
  const last = useLiveQuery(() => lastPerformance(entry.exerciseId, workoutId), [entry.exerciseId, workoutId])
  if (!exercise) {
    return <div className="card ex-card muted">Ejercicio borrado</div>
  }
  const uni = !!exercise.unilateral
  const sug = !readOnly ? suggestion(exercise, last) : null
  const prevSets = last ? last.entry.sets.filter((s) => s.done) : []

  const setSet = (sid, patch) => onChange((e) => ({ ...e, sets: e.sets.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }))
  const removeSet = (sid) => onChange((e) => ({ ...e, sets: e.sets.filter((s) => s.id !== sid) }))

  // Para cada serie, valores "fantasma" a partir de la vez anterior.
  const ghosts = (s, idx) => {
    const p = prevSets[idx]
    let kg = p?.kg ?? ''
    if (sug?.kind === 'up' && s.type === 'normal' && p?.type !== 'warmup') kg = sug.kg
    if (s.type === 'drop') {
      const before = entry.sets[idx - 1]
      const base = Number(before?.kg || 0)
      if (base) kg = Math.round(base * 0.8 * 2) / 2
    }
    return {
      kg: kg === '' ? '' : String(kg),
      reps: p?.reps ?? '',
      kg2: uni ? String((sug?.kind === 'up' && s.type === 'normal' ? sug.kg : p?.kg2) ?? kg ?? '') : '',
      reps2: uni ? (p?.reps2 ?? p?.reps ?? '') : '',
    }
  }

  function toggleDone(s, idx) {
    if (readOnly) return
    if (s.done) return setSet(s.id, { done: false })
    const g = ghosts(s, idx)
    const patch = {
      done: true,
      kg: s.kg !== '' ? s.kg : g.kg,
      reps: s.reps !== '' ? s.reps : g.reps,
    }
    if (uni) {
      patch.kg2 = s.kg2 !== '' ? s.kg2 : (g.kg2 || patch.kg)
      patch.reps2 = s.reps2 !== '' ? s.reps2 : (g.reps2 || patch.reps)
    }
    if (patch.reps === '' || patch.reps === undefined) {
      return alert('Cargá las repeticiones de la serie.')
    }
    setSet(s.id, patch)
    if (navigator.vibrate) navigator.vibrate(15)
    onSetDone()
  }

  const cycleType = (s) => {
    if (readOnly) return
    const order = ['normal', 'warmup', 'drop']
    setSet(s.id, { type: order[(order.indexOf(s.type) + 1) % order.length] })
  }

  let n = 0
  const labels = entry.sets.map((s) => (s.type === 'warmup' ? 'C' : s.type === 'drop' ? 'D' : String(++n)))

  const prevText = (idx) => {
    const p = prevSets[idx]
    if (!p) return '—'
    return uni ? `${fmt(+p.kg || 0)}×${p.reps} / ${fmt(+p.kg2 || 0)}×${p.reps2}` : `${fmt(+p.kg || 0)}×${p.reps}`
  }

  const num = (v) => (v === '' ? '' : v)

  return (
    <div className={'card ex-card' + (inGroup ? ' superset' : '')}>
      <div className="row">
        <div className="grow">
          <div className="bold" style={{ fontSize: 17 }}>{exercise.name}</div>
          <div className="small muted">
            {exercise.muscle} · {exercise.repMin}–{exercise.repMax} reps{uni ? ' · por lado' : ''}
          </div>
        </div>
        {!readOnly && <button className="icon-btn" onClick={onMenu} aria-label="Opciones"><Icon.more /></button>}
      </div>

      {exercise.notes && !readOnly && <div className="small muted" style={{ marginTop: 6 }}>📝 {exercise.notes}</div>}

      {!readOnly && (last ? (
        <div className={'hint' + (sug?.kind === 'up' ? ' up' : '')}>
          {sug?.kind === 'up' ? <Icon.trend /> : null}
          <span>
            {sug?.text}
            <span className="muted" style={{ fontWeight: 500 }}> · última vez {new Date(last.workout.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
          </span>
        </div>
      ) : last === null ? (
        <div className="hint">Primera vez con este ejercicio. Anotá cómo te va.</div>
      ) : null)}

      <table className="sets">
        <thead>
          <tr>
            <th style={{ width: 36 }}>Serie</th>
            {!readOnly && <th>Anterior</th>}
            <th style={{ width: 84 }}>kg</th>
            <th style={{ width: 72 }}>Reps</th>
            {!readOnly && <th style={{ width: 44 }}></th>}
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((s, idx) => {
            const g = ghosts(s, idx)
            return (
              <tr key={s.id} className={s.done ? 'done' : ''}>
                <td>
                  <button className={'set-tag ' + s.type} onClick={() => cycleType(s)}
                    onContextMenu={(ev) => { ev.preventDefault(); !readOnly && confirm('¿Borrar esta serie?') && removeSet(s.id) }}
                    title="Tocá para cambiar: normal / calentamiento / drop. Mantené apretado para borrar.">
                    {labels[idx]}
                  </button>
                </td>
                {!readOnly && <td className="prev">{prevText(idx)}</td>}
                <td>
                  <div className="stack" style={{ gap: 4 }}>
                    {uni && <span className="side-label">IZQ</span>}
                    <input type="number" inputMode="decimal" step="0.5" disabled={readOnly} value={num(s.kg)} placeholder={g.kg}
                      onChange={(ev) => setSet(s.id, { kg: ev.target.value })} />
                    {uni && <span className="side-label">DER</span>}
                    {uni && <input type="number" inputMode="decimal" step="0.5" disabled={readOnly} value={num(s.kg2)} placeholder={g.kg2}
                      onChange={(ev) => setSet(s.id, { kg2: ev.target.value })} />}
                  </div>
                </td>
                <td>
                  <div className="stack" style={{ gap: 4 }}>
                    {uni && <span className="side-label">&nbsp;</span>}
                    <input type="number" inputMode="numeric" disabled={readOnly} value={num(s.reps)} placeholder={String(g.reps)}
                      onChange={(ev) => setSet(s.id, { reps: ev.target.value })} />
                    {uni && <span className="side-label">&nbsp;</span>}
                    {uni && <input type="number" inputMode="numeric" disabled={readOnly} value={num(s.reps2)} placeholder={String(g.reps2)}
                      onChange={(ev) => setSet(s.id, { reps2: ev.target.value })} />}
                  </div>
                </td>
                {!readOnly && (
                  <td>
                    <button className={'check' + (s.done ? ' on' : '')} onClick={() => toggleDone(s, idx)} aria-label="Marcar serie">
                      <Icon.check />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {!readOnly && (
        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn ghost sm grow" onClick={() => onChange((e) => ({ ...e, sets: [...e.sets, newSet()] }))}>
            <Icon.plus /> Serie
          </button>
          <button className="btn ghost sm grow" onClick={() => onChange((e) => ({ ...e, sets: [...e.sets, newSet('drop')] }))}>
            <Icon.plus /> Drop set
          </button>
          {entry.sets.length > 0 && (
            <button className="btn ghost sm" onClick={() => removeSet(entry.sets[entry.sets.length - 1].id)} aria-label="Quitar última serie">
              <Icon.trash />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function RestTimer({ w, onChange }) {
  const nav = useNav()
  const [now, setNow] = useState(Date.now())
  const alerted = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const left = Math.max(0, Math.round((w.restEnd - now) / 1000))
  const finished = left === 0

  useEffect(() => {
    if (finished && alerted.current !== w.restEnd) {
      alerted.current = w.restEnd
      if (nav.settings.vibrate && navigator.vibrate) navigator.vibrate([200, 100, 200])
      if (nav.settings.sound) beep()
      const t = setTimeout(() => onChange({ restEnd: null }), 6000)
      return () => clearTimeout(t)
    }
  }, [finished, w.restEnd])

  const pct = w.restTotal ? (left / w.restTotal) * 100 : 0
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className={'timer' + (finished ? ' finished' : '')}>
      <div className="time">{finished ? '¡Dale!' : `${mm}:${ss}`}</div>
      <div className="bar"><i style={{ width: pct + '%' }} /></div>
      {!finished && <button onClick={() => onChange({ restEnd: w.restEnd - 15000 })}>−15</button>}
      {!finished && <button onClick={() => onChange({ restEnd: w.restEnd + 15000, restTotal: w.restTotal + 15 })}>+15</button>}
      <button onClick={() => onChange({ restEnd: null })}>{finished ? 'OK' : 'Saltar'}</button>
    </div>
  )
}

let audioCtx
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.25, 0.5].forEach((t) => {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.frequency.value = 880
      o.connect(g)
      g.connect(audioCtx.destination)
      const at = audioCtx.currentTime + t
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.3, at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
      o.start(at)
      o.stop(at + 0.2)
    })
  } catch {}
}
