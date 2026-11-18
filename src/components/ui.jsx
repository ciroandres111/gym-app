import { createContext, useContext, useState, useCallback } from 'react'

const p = { className: 'ico', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' }
export const Icon = {
  dumbbell: () => <svg {...p}><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></svg>,
  calendar: () => <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>,
  chart: () => <svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  list: () => <svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
  gear: () => <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  play: () => <svg className="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>,
  plus: () => <svg {...p} strokeWidth="2.5"><path d="M12 5.5v13M5.5 12h13" /></svg>,
  check: () => <svg {...p} strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>,
  back: () => <svg {...p}><path d="M15 18l-6-6 6-6" /></svg>,
  more: () => <svg className="ico" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>,
  trash: () => <svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>,
  edit: () => <svg {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  link: () => <svg {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>,
  up: () => <svg {...p}><path d="M18 15l-6-6-6 6" /></svg>,
  down: () => <svg {...p}><path d="M6 9l6 6 6-6" /></svg>,
  search: () => <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
  x: () => <svg {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>,
  trend: () => <svg {...p}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
}

export function Sheet({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title && (
          <div className="row">
            <h3 className="grow">{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon.x /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Topbar({ title, sub, onBack, right }) {
  return (
    <div className="topbar">
      {onBack && <button className="icon-btn" onClick={onBack} aria-label="Volver"><Icon.back /></button>}
      <div className="grow">
        <h1 className="ellipsis">{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="toggle">
      <div>
        <div className="bold">{label}</div>
        {desc && <div className="small muted">{desc}</div>}
      </div>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <i />
      </span>
    </label>
  )
}

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const show = useCallback((m) => {
    setMsg(m)
    clearTimeout(window.__toastT)
    window.__toastT = setTimeout(() => setMsg(null), 2200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  )
}
