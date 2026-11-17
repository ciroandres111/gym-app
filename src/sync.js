// Sincronización entre la base local (Dexie) y la nube (Firestore).
//
// - La app siempre lee y escribe en la base local: funciona igual sin internet.
// - Cada registro lleva `updatedAt`. Gana el cambio más reciente.
// - Los cambios locales se suben a users/{uid}/{tabla}/{id} (con una pequeña demora
//   para no subir cada tecla). Los borrados se suben como { deleted: true }.
// - Los cambios de la nube (por ejemplo, desde la PC) se bajan en tiempo real.

import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth'
import { collection, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { auth, fs } from './firebase'
import { db } from './db'

const TABLES = ['exercises', 'routines', 'workouts', 'settings']
const keyOf = (table) => db.table(table).schema.primKey.keyPath
const TOMB_KEY = 'hierro-tombstones'

let user = null
let unsubs = []
const remoteDeleting = new Set()
const timers = new Map()
const status = { user: null, state: 'off', error: null } // off | syncing | ok | offline | error
const listeners = new Set()
const emit = (patch) => { Object.assign(status, patch); listeners.forEach((l) => l({ ...status })) }

const clean = (obj) => JSON.parse(JSON.stringify(obj)) // Firestore no acepta undefined
const ref = (table, id) => doc(fs, 'users', user.uid, table, String(id))

function readTombs() { try { return JSON.parse(localStorage.getItem(TOMB_KEY) || '[]') } catch { return [] } }
function writeTombs(t) { try { localStorage.setItem(TOMB_KEY, JSON.stringify(t)) } catch {} }

// ---------- Subida de cambios locales ----------

function schedulePush(table, id) {
  if (!user) return
  const k = table + '/' + id
  clearTimeout(timers.get(k))
  timers.set(k, setTimeout(async () => {
    timers.delete(k)
    const obj = await db.table(table).get(id)
    if (!obj || !user) return
    setDoc(ref(table, id), clean(obj)).catch(onError)
  }, 1200))
}

function pushDelete(table, id) {
  const t = { table, id, updatedAt: Date.now() }
  if (!user) return writeTombs([...readTombs(), t])
  clearTimeout(timers.get(table + '/' + id))
  setDoc(ref(table, id), { deleted: true, updatedAt: t.updatedAt }).catch(onError)
}

for (const name of TABLES) {
  const t = db.table(name)
  t.hook('creating', function (pk, obj) {
    if (obj._remote) { delete obj._remote; return }
    obj.updatedAt = Date.now()
    this.onsuccess = (key) => schedulePush(name, key)
  })
  t.hook('updating', function (mods, pk) {
    if ('_remote' in mods) return { _remote: undefined }
    this.onsuccess = () => schedulePush(name, pk)
    return { updatedAt: Date.now() }
  })
  t.hook('deleting', function (pk) {
    const k = name + '/' + pk
    if (remoteDeleting.has(k)) { remoteDeleting.delete(k); return }
    this.onsuccess = () => pushDelete(name, pk)
  })
}

// ---------- Bajada de cambios de la nube ----------

async function applyRemote(table, id, data) {
  const local = await db.table(table).get(id)
  const lu = local?.updatedAt || 0
  const ru = data.updatedAt || 0
  if (data.deleted) {
    if (local && lu <= ru) {
      remoteDeleting.add(table + '/' + id)
      await db.table(table).delete(id)
    }
  } else if (!local || lu < ru) {
    await db.table(table).put({ ...data, _remote: true })
  }
}

// Primera vez que se conecta: sube lo local que falta o es más nuevo.
async function reconcile(table, remoteDocs) {
  const remote = new Map(remoteDocs.map((d) => [d.id, d.data()]))
  const local = await db.table(table).toArray()
  const pk = keyOf(table)
  let batch = writeBatch(fs)
  let n = 0
  const flush = async () => { if (n) await batch.commit(); batch = writeBatch(fs); n = 0 }
  for (const obj of local) {
    const id = String(obj[pk])
    const r = remote.get(id)
    if (!r || (obj.updatedAt || 0) > (r.updatedAt || 0)) {
      batch.set(ref(table, id), clean({ ...obj, updatedAt: obj.updatedAt || Date.now() }))
      if (++n >= 400) await flush()
    }
  }
  const tombs = readTombs().filter((t) => t.table === table)
  for (const t of tombs) { batch.set(ref(table, t.id), { deleted: true, updatedAt: t.updatedAt }); n++ }
  await flush()
  writeTombs(readTombs().filter((t) => t.table !== table))
}

function start(u) {
  stop()
  user = u
  emit({ user: { name: u.displayName, email: u.email, photo: u.photoURL }, state: 'syncing', error: null })
  let pending = TABLES.length
  for (const table of TABLES) {
    let first = true
    const unsub = onSnapshot(
      collection(fs, 'users', u.uid, table),
      { includeMetadataChanges: true },
      async (snap) => {
        if (first && snap.metadata.fromCache && navigator.onLine) return // esperar datos del servidor
        if (first) {
          first = false
          for (const d of snap.docs) await applyRemote(table, d.id, d.data())
          await reconcile(table, snap.docs)
          if (--pending === 0) emit({ state: navigator.onLine ? 'ok' : 'offline' })
          return
        }
        for (const ch of snap.docChanges()) {
          if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) continue
          await applyRemote(table, ch.doc.id, ch.doc.data())
        }
        if (pending === 0) emit({ state: snap.metadata.fromCache ? 'offline' : 'ok' })
      },
      onError,
    )
    unsubs.push(unsub)
  }
}

function stop() {
  unsubs.forEach((u) => u())
  unsubs = []
  user = null
}

function onError(e) {
  console.error('[sync]', e)
  emit({ state: 'error', error: e?.code === 'permission-denied' ? 'Sin permiso en la base de datos (revisá las reglas de Firestore).' : e?.message || String(e) })
}

onAuthStateChanged(auth, (u) => {
  if (u) start(u)
  else { stop(); emit({ user: null, state: 'off' }) }
})
addEventListener('online', () => user && emit({ state: 'ok' }))
addEventListener('offline', () => user && emit({ state: 'offline' }))

// ---------- API para la interfaz ----------

export async function login() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
      return signInWithRedirect(auth, provider)
    }
    if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return
    throw e
  }
}

export const logout = () => signOut(auth)

export function useSync() {
  const [s, setS] = useState({ ...status })
  useEffect(() => { listeners.add(setS); setS({ ...status }); return () => listeners.delete(setS) }, [])
  return s
}
