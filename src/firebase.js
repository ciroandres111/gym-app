import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// Estos datos son públicos (van dentro de la app). La seguridad la dan las reglas de Firestore.
const firebaseConfig = {
  apiKey: 'AIzaSyAZ7-kzf34401YBebvRuB1vXtM5lmk8IwM',
  authDomain: 'gym-app-c58ba.firebaseapp.com',
  projectId: 'gym-app-c58ba',
  storageBucket: 'gym-app-c58ba.firebasestorage.app',
  messagingSenderId: '487614960833',
  appId: '1:487614960833:web:2b986ecedff96962eeb040',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
auth.languageCode = 'es'

// Caché persistente: los cambios hechos sin internet quedan en cola aunque cierres la app.
export const fs = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
