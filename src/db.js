import Dexie from 'dexie'

// Base de datos local (IndexedDB). Funciona sin internet.
// La sincronización con la nube (Firebase) se conecta encima de esta capa.
export const db = new Dexie('hierro')

db.version(1).stores({
  exercises: 'id, name, muscle',
  routines: 'id, name',
  workouts: 'id, date, routineId, finishedAt',
  settings: 'key',
})

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const MUSCLES = [
  'Pecho', 'Espalda', 'Hombros', 'Trapecio', 'Bíceps', 'Tríceps', 'Antebrazos',
  'Abdominales', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Aductores', 'Gemelos',
]

export const EQUIPMENT = [
  'Barra', 'Mancuernas', 'Máquina', 'Polea', 'Smith', 'Kettlebell', 'Peso corporal', 'Otro',
]

// Plantillas de split: solo la estructura de días, los ejercicios los pone el usuario.
export const SPLITS = [
  { key: 'arnold', name: 'Arnold Split', desc: '3 días, repetidos 2 veces por semana',
    days: ['Pecho y Espalda', 'Hombros y Brazos', 'Piernas'] },
  { key: 'arnold-ul', name: 'Arnold × Upper/Lower', desc: '5 días',
    days: ['Upper', 'Lower', 'Pecho y Espalda', 'Hombros y Brazos', 'Piernas'] },
  { key: 'ppl', name: 'Push / Pull / Legs', desc: '3 o 6 días',
    days: ['Push', 'Pull', 'Legs'] },
  { key: 'ppl-ul', name: 'PPL × Upper/Lower', desc: '5 días',
    days: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'] },
  { key: 'ul', name: 'Upper / Lower', desc: '4 días',
    days: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] },
  { key: 'fullbody', name: 'Full Body', desc: '3 días',
    days: ['Full Body A', 'Full Body B', 'Full Body C'] },
  { key: 'bro', name: 'Bro Split', desc: '5 días, un grupo por día',
    days: ['Pecho', 'Espalda', 'Hombros', 'Piernas', 'Brazos'] },
  { key: 'custom', name: 'Personalizada', desc: 'Armá los días como quieras',
    days: ['Día 1'] },
]

export const DEFAULT_SETTINGS = {
  theme: 'system', // system | light | dark
  defaultRest: 90,
  defaultIncrement: 2.5,
  sound: true,
  vibrate: true,
}

export async function getSettings() {
  const row = await db.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...(row?.value || {}) }
}

export async function saveSettings(patch) {
  const cur = await getSettings()
  await db.settings.put({ key: 'app', value: { ...cur, ...patch } })
}

// ---------- Cálculos ----------

export const isWorking = (s) => s.done && s.type !== 'warmup'

// Volumen de una serie (kg × reps), sumando ambos lados en unilaterales.
export function setVolume(s) {
  const a = (Number(s.kg) || 0) * (Number(s.reps) || 0)
  const b = (Number(s.kg2) || 0) * (Number(s.reps2) || 0)
  return a + b
}

// Última sesión terminada en la que se hizo un ejercicio.
export async function lastPerformance(exerciseId, excludeWorkoutId) {
  const list = await db.workouts.orderBy('date').reverse().toArray()
  for (const w of list) {
    if (w.id === excludeWorkoutId || !w.finishedAt) continue
    const entry = w.entries.find((e) => e.exerciseId === exerciseId)
    if (entry && entry.sets.some(isWorking)) return { workout: w, entry }
  }
  return null
}

// Doble progresión: si en todas las series de trabajo llegaste al tope del rango, subí peso.
export function suggestion(exercise, last) {
  if (!last) return null
  const sets = last.entry.sets.filter((s) => isWorking(s) && s.type !== 'drop')
  if (!sets.length) return null
  const repMax = Number(exercise.repMax) || 12
  const inc = Number(exercise.increment) || 2.5
  const topKg = Math.max(...sets.map((s) => Math.max(Number(s.kg) || 0, Number(s.kg2) || 0)))
  const allTop = sets.every((s) => {
    const r1 = Number(s.reps) || 0
    const r2 = exercise.unilateral ? Number(s.reps2) || 0 : r1
    return Math.min(r1, r2) >= repMax
  })
  if (allTop) return { kind: 'up', kg: round(topKg + inc), text: `Subí a ${fmt(round(topKg + inc))} kg` }
  return { kind: 'keep', kg: topKg, text: `Mantené ${fmt(topKg)} kg y buscá llegar a ${repMax} reps` }
}

export const round = (n) => Math.round(n * 100) / 100
export const fmt = (n) => (Number.isInteger(n) ? String(n) : String(round(n)).replace('.', ','))

// ---------- Fechas ----------
export const dayKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
export const startOfWeek = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const diff = (x.getDay() + 6) % 7 // lunes = 0
  x.setDate(x.getDate() - diff)
  return x
}
