import { createContext, useContext, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS } from './db'
import { Icon, ToastProvider } from './components/ui'
import Home from './screens/Home'
import RoutineEditor from './screens/RoutineEditor'
import Workout from './screens/Workout'
import History from './screens/History'
import Progress from './screens/Progress'
import Exercises from './screens/Exercises'
import Settings from './screens/Settings'

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

const TABS = [
  { key: 'home', label: 'Entrenar', icon: Icon.dumbbell },
  { key: 'history', label: 'Historial', icon: Icon.calendar },
  { key: 'progress', label: 'Progreso', icon: Icon.chart },
  { key: 'exercises', label: 'Ejercicios', icon: Icon.list },
  { key: 'settings', label: 'Ajustes', icon: Icon.gear },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [stack, setStack] = useState([]) // pantallas apiladas sobre la pestaña: {name, props}
  const settingsRow = useLiveQuery(() => db.settings.get('app'), [])
  const settings = { ...DEFAULT_SETTINGS, ...(settingsRow?.value || {}) }

  useEffect(() => {
    const apply = () => {
      const dark = settings.theme === 'dark' ||
        (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  const nav = {
    push: (name, props = {}) => { setStack((s) => [...s, { name, props }]); scrollTo(0, 0) },
    pop: () => setStack((s) => s.slice(0, -1)),
    reset: (t = tab) => { setStack([]); setTab(t); scrollTo(0, 0) },
    settings,
  }

  const top = stack[stack.length - 1]
  let screen
  if (top?.name === 'routine') screen = <RoutineEditor {...top.props} />
  else if (top?.name === 'workout') screen = <Workout {...top.props} />
  else if (tab === 'home') screen = <Home />
  else if (tab === 'history') screen = <History />
  else if (tab === 'progress') screen = <Progress />
  else if (tab === 'exercises') screen = <Exercises />
  else screen = <Settings />

  return (
    <ToastProvider>
      <NavCtx.Provider value={nav}>
        <div className="app">{screen}</div>
        <nav className="nav">
          <div className="nav-inner">
            {TABS.map((t) => (
              <button key={t.key} className={tab === t.key && !top ? 'on' : ''} onClick={() => nav.reset(t.key)}>
                <t.icon />
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </NavCtx.Provider>
    </ToastProvider>
  )
}
