import { useEffect, useMemo, useState } from 'react'
import { Modal, useLiveData, useToast } from './ui'
import { Icon } from './icons'

const stripMd = (l) => l.replace(/\*\*|__|`/g, '').replace(/^\s*([-*•]|\d+[.)])\s+/, '').replace(/^#+\s*/, '').trim()

/** Lines that look like list items ("- x", "* x", "1. x", "• x") from a markdown-ish reply. */
export const parseRouteLines = (text = '') =>
  text.split('\n').map((l) => l.trim()).filter((l) => /^([-*•]|\d+[.)])\s+/.test(l)).map(stripMd).filter(Boolean)

/**
 * Pulls the alternative routes out of BCD AI's written answers: lines that name a way to travel
 * (via / to / direct / an arrow) and carry a price, plus table rows that do. Instant, and uses only what the chat shows.
 */
export function extractRoutes(texts) {
  const out = []
  for (const text of texts) {
    for (const raw of text.split('\n')) {
      if (/^\s*\|?\s*:?-{2,}/.test(raw)) continue // table separator
      const line = stripMd(raw.includes('|') ? raw.split('|').map((c) => c.trim()).filter(Boolean).join(' · ') : raw)
      if (line.length < 12 || line.length > 240) continue
      if (!/[£$€]\s?\d/.test(line)) continue
      if (!/(\bvia\b|\bdirect\b|\bto\b|→|->|\bfrom\b)/i.test(line)) continue
      if (/\?$/.test(line) || /^(estimated cost|total)/i.test(line)) continue
      // Commentary and recommendations, not routes.
      const labelled = /^(best|quickest|fastest|cheapest|business|economy|premium|option)\b/i.test(line)
      if (!labelled && /\b(saves?|savings?|opportunity|escalate|immediate|recommend\w*)\b|^rebook\b|^confirm\b/i.test(line)) continue
      if (/^\p{Extended_Pictographic}/u.test(line)) continue
      if (/'s\s/.test(line.slice(0, 40))) continue // sentences about a named traveller
      if (!out.includes(line)) out.push(line)
    }
  }
  return out
}

/**
 * Reads the flight options out of the markdown table BCD AI wrote in the chat and turns each row into one line for the
 * email. Rows judged "Out of policy" are left out.
 */
export function extractFlightOptions(text = '') {
  const out = []
  let cols = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) { cols = null; continue }
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue
    if (!cols) { cols = cells.map((c) => c.toLowerCase()); continue }
    const get = (re) => { const i = cols.findIndex((c) => re.test(c)); return i >= 0 ? cells[i] : '' }
    const flight = get(/flight|option/)
    const policy = get(/policy/)
    if (!flight || /out of policy/i.test(policy)) continue
    const stops = get(/stop/)
    const m = stops.match(/^(\d+)\s*(\(.*\))?/)
    const stopText = !stops ? '' : /^(0|non)/i.test(stops) ? 'nonstop' : m ? `${m[1]} stop${m[1] === '1' ? '' : 's'}${m[2] ? ` ${m[2]}` : ''}` : stops
    const dep = get(/depart/)
    const arr = get(/arriv/)
    out.push([flight, dep && `departs ${dep}`, arr && `arrives ${arr}`, stopText, get(/price|fare|cost/)].filter(Boolean).join(' · '))
  }
  return out
}

/** The same table as extractFlightOptions, one object per row (flight, departs, arrives, stops, price, policy), in the order BCD AI listed them. */
export function extractFlightRows(text = '') {
  const out = []
  let cols = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) { cols = null; continue }
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => stripMd(c.trim()))
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue
    if (!cols) { cols = cells.map((c) => c.toLowerCase()); continue }
    const get = (re) => { const i = cols.findIndex((c) => re.test(c)); return i >= 0 ? cells[i] : '' }
    const flight = get(/flight|option/)
    if (flight) out.push({ flight, departs: get(/depart/), arrives: get(/arriv/), stops: get(/stop/), price: get(/price|fare|cost/), policy: get(/policy/) })
  }
  return out
}

const NYC = ['New York', 'NYC', 'JFK', 'Newark', 'EWR', 'LGA']
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Words that tie a route line to where this traveller is heading (destination city and airport, plus the New York area aliases). */
const destinationKeywords = (traveller) => {
  const words = new Set()
  for (const trip of traveller.trips) {
    if (trip.destCity) words.add(trip.destCity)
    if (trip.destCode) words.add(trip.destCode)
    if (NYC.includes(trip.destCity) || NYC.includes(trip.destCode)) NYC.forEach((w) => words.add(w))
  }
  return [...words]
}

/** The routes from the conversation that apply to one traveller: lines naming their destination (or them). */
export const routesForTraveller = (traveller, routes) => {
  const words = destinationKeywords(traveller)
  const named = new RegExp(escapeRe(traveller.name), 'i')
  const hit = words.length ? new RegExp(`\\b(${words.map(escapeRe).join('|')})\\b`, 'i') : null
  return routes.filter((r) => named.test(r) || (hit && hit.test(r)))
}

/**
 * The cancellation notice for one traveller. The air-traffic-control cause is only stated when the data says the
 * cancellation was ATC related.
 */
export const cancellationMessage = (traveller) => {
  const trips = traveller.trips ?? []
  const plural = trips.length > 1
  const atc = trips.length > 0 && trips.every((t) => t.atc)
  return `Your ${plural ? 'flights have' : 'flight has'} been cancelled${atc ? ' due to air traffic control failure' : ''}, we will help with finding alternative routes.`
}

const flightDetail = (t) =>
  t.trips.map((x) => `${x.route ? x.route.replace('-', ' → ') : x.destCity ?? 'Flight'}${x.departs ? ` · ${new Date(x.departs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}`).join(', ')

const tripLabel = (t) => {
  const trip = t.trips.find((x) => x.route) ?? t.trips[0]
  return trip?.route ? trip.route.replace('-', ' → ') : trip?.destCity ?? ''
}

/**
 * "Notify travellers": a pop-up with the email to send. Each email is addressed to the traveller by name and lists only
 * the alternative routes from the BCD AI conversation that apply to their trip. `getRoutes` reads them from the chat.
 */
export function NotifyTravellersModal({ open, onClose, getRoutes, onAskRoutes, initialTo = null, mode = 'routes', traveller = null }) {
  const toast = useToast()
  const data = useLiveData('/api/data/affected-travellers')
  // `traveller` pins the email to one person (picked in the chat); otherwise the recipients are everyone affected.
  const travellers = useMemo(() => (traveller ? [traveller] : data.data?.travellers ?? []), [traveller, data.data])
  const [to, setTo] = useState('all')
  const [index, setIndex] = useState(0)
  const [allRoutes, setAllRoutes] = useState([])
  const [edits, setEdits] = useState({}) // email -> routes text edited by the user
  const [showAll, setShowAll] = useState({}) // email -> true when "use all routes" was chosen
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [sending, setSending] = useState(false)

  // Read the routes out of the conversation each time the pop-up opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setTo(traveller?.email ?? initialTo ?? 'all'); setIndex(0); setEdits({}); setShowAll({}); setAllRoutes([])
    if (mode === 'cancelled') { setLoadingRoutes(false); return undefined }
    setLoadingRoutes(true)
    getRoutes()
      .then((lines) => !cancelled && setAllRoutes(lines))
      .catch(() => !cancelled && setAllRoutes([]))
      .finally(() => !cancelled && setLoadingRoutes(false))
    return () => { cancelled = true }
  }, [open, getRoutes, initialTo, mode, traveller])

  const recipients = to === 'all' ? travellers : travellers.filter((t) => t.email === to)
  const current = recipients[Math.min(index, Math.max(0, recipients.length - 1))]
  // A traveller picked in the chat gets every option listed for their trip; otherwise routes are matched to each traveller.
  const defaultRoutes = (t) => (traveller || showAll[t.email] ? allRoutes : routesForTraveller(t, allRoutes))
  const cancelled = mode === 'cancelled'
  const routesText = (t) => edits[t.email] ?? (cancelled ? cancellationMessage(t) : defaultRoutes(t).join('\n'))
  const routeCount = (t) => routesText(t).split('\n').map((r) => r.trim()).filter(Boolean).length
  const ready = recipients.filter((t) => routeCount(t) > 0)
  const canSend = ready.length > 0 && !sending

  const send = () => {
    setSending(true)
    // Demo: no email service is wired up yet, so this only confirms the action.
    setTimeout(() => {
      setSending(false)
      onClose()
      const skipped = recipients.length - ready.length
      toast(`Notification ready for ${ready.length} traveller${ready.length === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped: ${cancelled ? 'empty message' : 'no routes for their trip'})` : ''}. No email service is connected yet, so nothing was sent.`, { kind: 'success', duration: 8000 })
    }, 600)
  }

  return (
    <Modal open={open} onClose={onClose} title="Notify travellers" width={640}
      footer={<><button className="ghost-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!canSend} onClick={send}><Icon name="send" size={14} /> {sending ? 'Sending…' : `Send to ${ready.length || ''} traveller${ready.length === 1 ? '' : 's'}`}</button></>}>
      {!traveller && (
        <label className="field">To
          <select value={to} onChange={(e) => { setTo(e.target.value); setIndex(0) }}>
            <option value="all">All affected travellers ({travellers.length})</option>
            {travellers.map((t) => <option key={t.email} value={t.email}>{t.name} · {tripLabel(t)}</option>)}
          </select>
        </label>
      )}

      {current && (
        <div className="mail">
          <div className="mail-meta">
            <span>To</span><strong>{current.name} &lt;{current.email}&gt;</strong>
            {recipients.length > 1 && (
              <span className="mail-nav">
                <button type="button" className="icon-btn" aria-label="Previous traveller" disabled={index === 0} onClick={() => setIndex(index - 1)}><Icon name="chevron-left" size={15} /></button>
                {index + 1} of {recipients.length}
                <button type="button" className="icon-btn" aria-label="Next traveller" disabled={index >= recipients.length - 1} onClick={() => setIndex(index + 1)}><Icon name="chevron-right" size={15} /></button>
              </span>
            )}
          </div>
          <div className="mail-meta"><span>Subject</span><strong>{cancelled ? 'Your flight has been cancelled' : 'Alternative routes for your trip'}</strong></div>
          {cancelled && <div className="mail-meta"><span>Flight</span><strong>{flightDetail(current)}</strong></div>}
          <div className="mail-body">
            <p>Hi {current.name.split(' ')[0]},</p>
            {!cancelled && <p>Here are alternative routes that you can book to arrive to your destination on time.</p>}
            {loadingRoutes ? (
              <p className="mail-loading"><span className="spinner" /> Pulling routes from your conversation with BCD AI…</p>
            ) : (
              <label className="mail-routes">
                <span className="mail-hint">
                  {cancelled ? 'Edit the message before sending.' : `${tripLabel(current) ? `Routes for ${tripLabel(current)}. ` : ''}One per line; edit before sending.`}
                </span>
                <textarea rows={cancelled ? 3 : Math.max(4, routeCount(current) + 1)} value={routesText(current)} onChange={(e) => setEdits({ ...edits, [current.email]: e.target.value })}
                  placeholder={allRoutes.length ? `None of the routes in the conversation match ${tripLabel(current) || 'this trip'}.` : 'No routes found yet. Ask BCD AI for alternative routes first, or type them here.'} />
                {!cancelled && allRoutes.length === 0 && onAskRoutes && (
                  <button type="button" className="mail-link" onClick={onAskRoutes}>Ask BCD AI for alternative routes</button>
                )}
                {!cancelled && allRoutes.length > 0 && routeCount(current) === 0 && !showAll[current.email] && (
                  <button type="button" className="mail-link" onClick={() => setShowAll({ ...showAll, [current.email]: true })}>Use all {allRoutes.length} routes from the conversation instead</button>
                )}
              </label>
            )}
            <p className="mail-sign">Kind regards,<br />BCD Travel</p>
          </div>
        </div>
      )}
      {!current && !data.loading && <p className="muted">No travellers currently need rebooking.</p>}
    </Modal>
  )
}
