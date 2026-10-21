import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ---------- Toasts ----------
const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, ...opts }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration ?? 4500)
  }, [])
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className={`toast ${t.kind || ''}`} layout initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
              <span className="toast-msg">{t.message}</span>
              {t.action && <button className="toast-action" onClick={() => { t.action.onClick(); dismiss(t.id) }}>{t.action.label}</button>}
              <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, footer, width = 520, side = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className={`modal-wrap ${side ? 'side' : ''}`}>
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="modal"
            style={{ maxWidth: width }}
            initial={side ? { x: 80, opacity: 0 } : { y: 24, scale: 0.96, opacity: 0 }}
            animate={side ? { x: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
            exit={side ? { x: 60, opacity: 0 } : { y: 12, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            role="dialog"
            aria-label={title}
          >
            <header className="modal-head">
              <h3>{title}</h3>
              <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
            </header>
            <div className="modal-body">{children}</div>
            {footer && <footer className="modal-foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ---------- Count-up number ----------
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString(), duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (typeof value !== 'number' || Number.isNaN(value)) return
    const start = performance.now()
    const startVal = from.current
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = startVal + (value - startVal) * eased
      setDisplay(v)
      from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  if (typeof value !== 'number') return <span className="skeleton-text">——</span>
  return <span>{format(display)}</span>
}

// ---------- Live data hook ----------
export function useLiveData(path, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const [nonce, setNonce] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = JSON.stringify(deps)
  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetch(path)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Request failed'))))
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((error) => !cancelled && setState({ loading: false, data: null, error: error.message }))
    return () => { cancelled = true }
  }, [path, key, nonce])
  return { ...state, refresh: () => setNonce((n) => n + 1) }
}
