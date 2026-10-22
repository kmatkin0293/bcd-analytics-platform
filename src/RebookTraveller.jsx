import { useEffect, useRef, useState } from 'react'
import { Modal } from './ui'
import { Icon } from './icons'
import { extractFlightRows } from './NotifyTravellers'

/** The flight to book: the first option BCD AI listed that isn't out of policy (the table is ordered earliest first). */
const nextFlight = (rows) => rows.find((r) => !/out of policy/i.test(r.policy)) ?? null

const reference = () => `BCD${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')}`

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Runs the same flight search the chat uses and returns the answer's text. */
async function searchFlights(trip, signal, onStatus) {
  const res = await fetch('/api/ai/flight-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originCode: trip.originCode, originCity: trip.originCity, destCode: trip.destCode, destCity: trip.destCity, departsAt: trip.departs }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`Flight search failed (${res.status})`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  const handle = (line) => {
    if (!line.trim()) return
    const e = JSON.parse(line)
    if (e.type === 'text') text += e.text
    else if (e.type === 'status') onStatus(e.text)
    else if (e.type === 'error') throw new Error(e.message)
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let at
    while ((at = buffer.indexOf('\n')) >= 0) { handle(buffer.slice(0, at)); buffer = buffer.slice(at + 1) }
  }
  handle(buffer)
  return text
}

const STEPS = ['Finding the next available flight', 'Checking it against travel policy', 'Reserving the seat', 'Issuing the ticket']

/**
 * "Rebook for <traveller>": a window that books the traveller's next in-policy flight by itself. It uses the options
 * already in the chat, or runs the search first, then walks through the booking and shows the confirmation.
 */
export function RebookModal({ open, onClose, trip, getFlightText, onNotify }) {
  const [phase, setPhase] = useState('working') // working | done | error
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('')
  const [flight, setFlight] = useState(null)
  const [ref, setRef] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const latest = useRef({})
  latest.current = { trip, getFlightText }

  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController()
    const { trip, getFlightText } = latest.current
    ;(async () => {
      try {
        setPhase('working'); setStep(0); setStatus(''); setFlight(null); setError('')
        let rows = extractFlightRows(getFlightText())
        if (!rows.length) rows = extractFlightRows(await searchFlights(trip, controller.signal, setStatus))
        setStep(1); await wait(900)
        const pick = nextFlight(rows)
        if (!pick) throw new Error('No in-policy flight was found in the next 24 hours.')
        setFlight(pick)
        setStep(2); await wait(1100)
        setStep(3); await wait(1100)
        setRef(reference())
        setPhase('done')
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'The flight could not be booked.')
        setPhase('error')
      }
    })()
    return () => controller.abort()
  }, [open, attempt])

  const first = trip.name.split(' ')[0]
  const route = trip.route ? trip.route.replace('-', ' → ') : [trip.originCode, trip.destCode].filter(Boolean).join(' → ')

  return (
    <Modal open={open} onClose={onClose} title={`Rebook for ${first}`} width={560}
      footer={phase === 'done'
        ? <><button className="ghost-btn" onClick={onClose}>Done</button><button className="primary-btn" onClick={() => { onClose(); onNotify(trip) }}><Icon name="mail" size={14} /> Notify {first}</button></>
        : phase === 'error'
          ? <><button className="ghost-btn" onClick={onClose}>Close</button><button className="primary-btn" onClick={() => setAttempt((n) => n + 1)}><Icon name="refresh" size={14} /> Try again</button></>
          : <button className="ghost-btn" onClick={onClose}>Cancel</button>}>
      <div className="rebook-head">
        <span className="rebook-who"><Icon name="user" size={15} /> <strong>{trip.name}</strong></span>
        <span className="rebook-route"><Icon name="plane" size={14} /> {route}</span>
      </div>

      {phase !== 'error' && (
        <ol className="rebook-steps">
          {STEPS.map((label, i) => {
            const state = phase === 'done' || i < step ? 'done' : i === step ? 'active' : 'todo'
            return (
              <li key={label} className={`is-${state}`}>
                <span className="rebook-dot">{state === 'done' ? <Icon name="check" size={12} strokeWidth={3} /> : state === 'active' ? <span className="spinner" /> : null}</span>
                <span>{label}{state === 'active' && i === 0 && status ? ` · ${status}` : ''}</span>
              </li>
            )
          })}
        </ol>
      )}

      {flight && (
        <div className={phase === 'done' ? 'rebook-card is-booked' : 'rebook-card'}>
          <div className="rebook-card-top">
            <strong>{flight.flight}</strong>
            {phase === 'done' && <span className="rebook-badge"><Icon name="check-circle" size={13} /> Booked</span>}
          </div>
          <dl>
            {flight.departs && <><dt>Departs</dt><dd>{flight.departs}</dd></>}
            {flight.arrives && <><dt>Arrives</dt><dd>{flight.arrives}</dd></>}
            {flight.stops && <><dt>Stops</dt><dd>{flight.stops}</dd></>}
            {flight.price && <><dt>Fare</dt><dd>{flight.price}</dd></>}
            {flight.policy && <><dt>Policy</dt><dd>{flight.policy}</dd></>}
            {phase === 'done' && <><dt>Booking reference</dt><dd className="rebook-ref">{ref}</dd></>}
          </dl>
        </div>
      )}

      {phase === 'error' && <p className="rebook-error" role="alert">{error}</p>}
      {phase === 'done' && <p className="rebook-note">Demonstration: no booking system is connected yet, so this confirmation and reference are simulated and no ticket was issued.</p>}
    </Modal>
  )
}
