import { db, uid } from './db'

export const newSet = (type = 'normal') => ({ id: uid(), type, kg: '', reps: '', kg2: '', reps2: '', done: false })

export const newEntry = (exerciseId, sets = 3, groupId = null) => ({
  id: uid(),
  exerciseId,
  groupId,
  sets: Array.from({ length: sets }, () => newSet()),
})

export async function startWorkout({ routine, day }) {
  const active = await db.workouts.filter((w) => !w.finishedAt).first()
  if (active) return active.id
  const w = {
    id: uid(),
    date: Date.now(),
    startedAt: Date.now(),
    finishedAt: null,
    routineId: routine?.id || null,
    dayId: day?.id || null,
    title: day ? day.name : 'Entrenamiento libre',
    routineName: routine?.name || null,
    notes: '',
    entries: (day?.exercises || []).map((x) => newEntry(x.exerciseId, x.sets || 3, x.groupId || null)),
  }
  await db.workouts.put(w)
  return w.id
}

export const fmtDuration = (ms) => {
  const m = Math.floor(ms / 60000)
  const h = Math.floor(m / 60)
  return h ? `${h} h ${m % 60} min` : `${m} min`
}

// Superseries: ejercicios consecutivos que comparten groupId.
export function normalizeGroups(items) {
  const out = items.map((x) => ({ ...x }))
  for (let i = 0; i < out.length; i++) {
    const g = out[i].groupId
    if (!g) continue
    const prevSame = i > 0 && out[i - 1].groupId === g
    const nextSame = i < out.length - 1 && out[i + 1].groupId === g
    if (!prevSame && !nextSame) out[i].groupId = null
  }
  return out
}

export const isLinkedToNext = (items, i) =>
  i < items.length - 1 && items[i].groupId && items[i].groupId === items[i + 1].groupId

// Une o separa el ítem i con el siguiente.
export function toggleLink(items, i) {
  const out = items.map((x) => ({ ...x }))
  if (i >= out.length - 1) return out
  if (isLinkedToNext(out, i)) {
    const old = out[i].groupId
    const fresh = Math.random().toString(36).slice(2, 9)
    for (let j = i + 1; j < out.length && out[j].groupId === old; j++) out[j].groupId = fresh
  } else {
    const g = out[i].groupId || out[i + 1].groupId || Math.random().toString(36).slice(2, 9)
    const oldNext = out[i + 1].groupId
    out[i].groupId = g
    for (let j = i + 1; j < out.length && (j === i + 1 || (oldNext && out[j].groupId === oldNext)); j++) out[j].groupId = g
  }
  return normalizeGroups(out)
}

export function move(items, i, dir) {
  const j = i + dir
  if (j < 0 || j >= items.length) return items
  const out = items.map((x) => ({ ...x }))
  ;[out[i], out[j]] = [out[j], out[i]]
  return normalizeGroups(out)
}
