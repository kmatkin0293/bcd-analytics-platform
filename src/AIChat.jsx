import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { CLIENT_NAME } from './config'
import { applyEvent, createConversation, finishTurn, newTurn, stopResponse, streamMessage } from './spotter'
import { SpotterTurn, WebAnswer } from './SpotterTurn'
import { NotifyTravellersModal, parseRouteLines, extractRoutes, extractFlightOptions } from './NotifyTravellers'
import { RebookModal } from './RebookTraveller'

const ChatContext = createContext(null)
export const useAIChat = () => useContext(ChatContext)

/** Questions the booking data can answer; shown in the empty drawer. */
export const AI_SUGGESTIONS = [
  'Which departments have the highest out of policy rate?',
  'Show monthly travel spend by travel type',
  'Which suppliers give us the most savings?',
  'What are our top destinations by spend?',
  'How have carbon emissions trended over the last 6 months?',
  'Can we notify travellers?',
]

// "can we notify travellers", "notify the travellers", "notify affected travelers"...
/** Asked on the user's behalf when the email pop-up opens before any routes have been discussed. */
const ASK_ROUTES = 'What alternative routes could the travellers whose trips need rebooking take to still arrive on time? Include prices.'
const NOTIFY_INTENT = /\bnotify\b[^.?!]*\btravell?ers?\b/i

/** A Needs attention row as the traveller object the email pop-up expects. */
const travellerFromTrip = (t) => ({
  name: t.name,
  email: t.email,
  trips: [{ route: t.route, originCity: t.originCity, originCode: t.originCode, destCity: t.destCity, destCode: t.destCode, status: t.status, departs: t.departs, atc: t.atc }],
})

export function AIMark({ size = 22, spinning = false }) {
  return (
    <span className={`ai-mark ${spinning ? 'spinning' : ''}`} style={{ width: size, height: size }}>
      <Icon name="sparkles" size={size * 0.55} strokeWidth={2.2} />
    </span>
  )
}

/**
 * BCD AI: the side-drawer assistant. Chat state lives here so a conversation carries across pages.
 * openChat(question) opens the drawer and asks. Answers stream from the Spotter Agent API through the server.
 */
export function AIChatProvider({ children, enabled, onLocked }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [items, setItems] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [unread, setUnread] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyTo, setNotifyTo] = useState(null)
  const [notifyMode, setNotifyMode] = useState('routes')
  const [notifyTraveller, setNotifyTraveller] = useState(null)
  const [rebookTrip, setRebookTrip] = useState(null)
  /** The Needs attention trip the chat is about (set by the row's Ask button); "notify" then means just this traveller. */
  const selectedTrip = useRef(null)
  const conversation = useRef(null)
  const abort = useRef(null)
  const nextId = useRef(1)
  const scrollRef = useRef(null)
  const stickToBottom = useRef(true)
  const inputRef = useRef(null)
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen
  const streamingRef = useRef(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); abort.current?.abort() }
  }, [])

  // Follow the stream unless the viewer has scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [items])

  useEffect(() => {
    if (!isOpen) return
    setUnread(false)
    const t = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(t)
  }, [isOpen])

  // Push the page content aside while the drawer is open (CSS reads this class).
  useEffect(() => {
    document.body.classList.toggle('ai-open', isOpen)
    return () => document.body.classList.remove('ai-open')
  }, [isOpen])

  const updateTurn = (id, fn) => setItems((list) => list.map((it) => (it.id === id && it.kind === 'assistant' ? { ...it, turn: fn(it.turn) } : it)))

  const ask = useCallback(async (raw) => {
    const q = (raw ?? '').trim()
    if (!enabled) return onLocked?.()
    setIsOpen(true)
    if (!q || streamingRef.current) return
    setText('')
    stickToBottom.current = true

    // "Can we notify travellers?" is answered here with an action, not sent to Spotter.
    if (NOTIFY_INTENT.test(q)) {
      setText('')
      setItems((list) => [...list,
        { id: nextId.current++, kind: 'user', text: q },
        selectedTrip.current
          ? { id: nextId.current++, kind: 'action', text: `Yes. I can draft an email to ${selectedTrip.current.name} listing the route options from this chat. You can review and edit it before it goes out.`, actions: [
            { label: `Notify ${selectedTrip.current.name.split(' ')[0]}`, icon: 'mail', run: () => openNotify({ traveller: travellerFromTrip(selectedTrip.current) }) },
            { label: `Rebook for ${selectedTrip.current.name.split(' ')[0]}`, icon: 'plane', run: () => setRebookTrip(selectedTrip.current) },
          ] }
          : { id: nextId.current++, kind: 'action', text: 'Yes. I can draft an email to the travellers whose trips need rebooking, listing the alternative routes from this conversation. You can review and edit it before it goes out.', actions: [{ label: 'Notify travellers', icon: 'mail', run: () => openNotify() }] },
      ])
      return
    }

    const userId = nextId.current++
    const id = nextId.current++
    let turn = newTurn(q)
    setItems((list) => [...list, { id: userId, kind: 'user', text: q }, { id, kind: 'assistant', turn }])
    // Scope every question to the portal's client; follow-ups inherit it through the conversation.
    const message = `Context (do not repeat it): answer only for the client "${CLIENT_NAME}", i.e. rows where Client Name = ${CLIENT_NAME}.\n\nQuestion: ${q}`
    streamingRef.current = true
    setStreaming(true)
    const controller = new AbortController()
    abort.current = controller
    try {
      conversation.current ??= await createConversation()
      await streamMessage(conversation.current, message, (e) => { turn = applyEvent(turn, e); updateTurn(id, () => turn) }, controller.signal)
      turn = finishTurn(turn)
      updateTurn(id, () => turn)
    } catch (err) {
      if (controller.signal.aborted) updateTurn(id, (t) => finishTurn(t, 'stopped'))
      else {
        console.error('BCD AI request failed', err)
        updateTurn(id, (t) => finishTurn(t, 'error', err instanceof Error ? err.message : 'Something went wrong.'))
      }
    } finally {
      if (abort.current === controller) abort.current = null
      streamingRef.current = false
      setStreaming(false)
      if (!isOpenRef.current) setUnread(true)
    }
  }, [enabled, onLocked])

  /**
   * "What alternative routes are available that are in policy for the route in the next 24 hours?" Opens the drawer and
   * runs a web search for real flights, times and prices (server: /api/ai/flight-search). `trip` is a Needs attention row.
   */
  const askFlights = useCallback(async (trip) => {
    if (!enabled) return onLocked?.()
    setIsOpen(true)
    if (streamingRef.current) return
    selectedTrip.current = trip
    const route = trip.route ? trip.route.replace('-', ' → ') : [trip.originCode, trip.destCode].filter(Boolean).join(' → ')
    const cities = [trip.originCity, trip.destCity].filter(Boolean).join(' → ')
    const question = `What alternative routes are available that are in policy for the route in the next 24 hours: ${route}${cities ? ` (${cities})` : ''}?`
    stickToBottom.current = true
    const id = nextId.current++
    setItems((list) => [...list, { id: nextId.current++, kind: 'user', text: question }, { id, kind: 'web', trip, question, phase: 'working', status: 'Starting search…', text: '', sources: [] }])
    const patch = (fn) => setItems((list) => list.map((it) => (it.id === id ? fn(it) : it)))
    streamingRef.current = true
    setStreaming(true)
    const controller = new AbortController()
    abort.current = controller
    try {
      const res = await fetch('/api/ai/flight-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originCode: trip.originCode, originCity: trip.originCity, destCode: trip.destCode, destCity: trip.destCity, departsAt: trip.departs }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(`Flight search failed (${res.status})`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const handle = (line) => {
        if (!line.trim()) return
        const e = JSON.parse(line)
        if (e.type === 'text') patch((it) => ({ ...it, text: it.text + e.text }))
        else if (e.type === 'status') patch((it) => ({ ...it, status: e.text }))
        else if (e.type === 'sources') patch((it) => ({ ...it, sources: e.sources }))
        else if (e.type === 'error') patch((it) => ({ ...it, phase: 'error', error: e.message }))
      }
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let at
        while ((at = buffer.indexOf('\n')) >= 0) { handle(buffer.slice(0, at)); buffer = buffer.slice(at + 1) }
      }
      handle(buffer)
      patch((it) => (it.phase === 'error' ? it : { ...it, phase: 'done' }))
    } catch (err) {
      if (controller.signal.aborted) patch((it) => ({ ...it, phase: 'stopped' }))
      else patch((it) => ({ ...it, phase: 'error', error: err instanceof Error ? err.message : 'Something went wrong.' }))
    } finally {
      if (abort.current === controller) abort.current = null
      streamingRef.current = false
      setStreaming(false)
      if (!isOpenRef.current) setUnread(true)
    }
  }, [enabled, onLocked])

  /**
   * The alternative routes from this conversation. Read straight from BCD AI's answers when they are there (instant);
   * otherwise ask the conversation off the record, with a time limit (not shown in the chat).
   */
  const getRoutes = useCallback(async () => {
    // A traveller chosen in the chat: the options listed for their trip, straight from the latest answer about it.
    const trip = selectedTrip.current
    if (trip) {
      const item = [...itemsRef.current].reverse().find((it) => it.kind === 'web' && it.trip?.id === trip.id && it.text)
      if (item) return extractFlightOptions(item.text)
    }
    const texts = itemsRef.current.map((it) => (it.kind === 'assistant' ? it.turn.text : it.kind === 'web' ? it.text : '')).filter(Boolean)
    const found = extractRoutes(texts)
    if (found.length || !texts.length) return found
    conversation.current ??= await createConversation()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)
    let turn = newTurn('routes')
    try {
      await streamMessage(
        conversation.current,
        'Using only what has already been said in this conversation (do not run any new queries), list the alternative routes or itineraries affected travellers could book. Reply with ONLY a bulleted list, one route per line. No introduction or closing text.',
        (e) => { turn = applyEvent(turn, e) },
        controller.signal,
      )
    } catch { /* time limit or error: use whatever arrived */ } finally { clearTimeout(timer) }
    return parseRouteLines(turn.text)
  }, [])

  const stop = () => {
    abort.current?.abort()
    if (conversation.current) stopResponse(conversation.current)
  }
  const newChat = () => {
    stop()
    conversation.current = null
    selectedTrip.current = null
    setItems([])
  }

  const openChat = useCallback((question) => (question ? ask(question) : enabled ? setIsOpen(true) : onLocked?.()), [ask, enabled, onLocked])
  /** openNotify() or openNotify({ email, mode }): mode 'routes' (alternative routes from the chat) or 'cancelled' (flight cancellation notice). */
  const openNotify = useCallback((opts) => { setNotifyTo(opts?.email ?? null); setNotifyMode(opts?.mode ?? 'routes'); setNotifyTraveller(opts?.traveller ?? null); setNotifyOpen(true) }, [])
  const value = useMemo(() => ({ openChat, openNotify, askFlights, enabled, streaming }), [openChat, openNotify, askFlights, enabled, streaming])

  const latestTitle = [...items].reverse().find((it) => it.kind === 'assistant' && it.turn.title)?.turn.title
  const showFab = enabled && !isOpen && location.pathname !== '/ai'

  return (
    <ChatContext.Provider value={value}>
      {children}

      {showFab && (
        <button type="button" className={['ai-fab', streaming && 'is-busy', unread && 'has-unread'].filter(Boolean).join(' ')} onClick={() => setIsOpen(true)} aria-label="Open BCD AI">
          <AIMark size={24} spinning={streaming} />
          <span>{streaming ? 'BCD AI is working…' : 'Ask BCD AI'}</span>
        </button>
      )}

      <div className={isOpen ? 'scrim is-open' : 'scrim'} onClick={() => setIsOpen(false)} />
      <aside role="dialog" aria-label="BCD AI conversation" aria-hidden={!isOpen} className={isOpen ? 'drawer is-open' : 'drawer'}>
        <div className="drawer-head">
          <div className="drawer-title">
            <AIMark size={30} spinning={streaming} />
            <div>
              <strong>BCD AI</strong>
              <small>{latestTitle ? latestTitle : `Travel assistant · ${CLIENT_NAME}`}</small>
            </div>
          </div>
          <div className="drawer-actions">
            <button type="button" className="drawer-new" onClick={newChat}><Icon name="reset" size={13} /> New chat</button>
            <button type="button" aria-label="Close" className="drawer-close" onClick={() => setIsOpen(false)}><Icon name="x" size={16} /></button>
          </div>
        </div>

        <div ref={scrollRef} className="drawer-messages" onScroll={(e) => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
          {items.length === 0 && (
            <div className="drawer-empty">
              <p>Ask anything about {CLIENT_NAME}'s travel: spend, bookings, policy, suppliers, safety and carbon. BCD AI works through your data and shows its reasoning as it goes.</p>
              <div className="msg-follow">
                {AI_SUGGESTIONS.map((q) => <button key={q} type="button" onClick={() => ask(q)}><Icon name="sparkles" size={13} /> {q}</button>)}
              </div>
            </div>
          )}
          {items.map((it) => it.kind === 'user' ? (
            <div key={it.id} className="msg-user">{it.text}</div>
          ) : it.kind === 'web' ? (
            <div key={it.id} className="msg-turn"><WebAnswer item={it} onRetry={streaming ? undefined : () => askFlights(it.trip)} /></div>
          ) : it.kind === 'action' ? (
            <div key={it.id} className="msg-action">
              <span className="sp-label"><span className="sp-mark"><Icon name="sparkles" size={11} strokeWidth={2.4} /></span> BCD AI</span>
              <p>{it.text}</p>
              <div className="msg-action-buttons">
                {it.actions.map((a, i) => <button key={a.label} type="button" className={i === 0 ? 'primary-btn' : 'ghost-btn'} onClick={a.run}><Icon name={a.icon} size={15} /> {a.label}</button>)}
              </div>
            </div>
          ) : (
            <div key={it.id} className="msg-turn"><SpotterTurn turn={it.turn} onRetry={streaming ? undefined : () => ask(it.turn.question)} /></div>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask(text) }} className="drawer-form">
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={streaming ? 'BCD AI is working…' : 'Ask a question about your travel data…'} disabled={streaming} />
          {streaming
            ? <button type="button" className="drawer-stop" onClick={stop}>Stop</button>
            : <button type="submit" disabled={!text.trim()}>Send</button>}
        </form>
      </aside>

      {rebookTrip && (
        <RebookModal
          open
          trip={rebookTrip}
          getFlightText={() => items.findLast((it) => it.kind === 'web' && it.trip?.name === rebookTrip.name && it.text)?.text ?? ''}
          onClose={() => setRebookTrip(null)}
          onNotify={(trip) => openNotify({ traveller: travellerFromTrip(trip) })}
        />
      )}
      {notifyOpen && <NotifyTravellersModal open mode={notifyMode} traveller={notifyTraveller} initialTo={notifyTo} onClose={() => setNotifyOpen(false)} getRoutes={getRoutes} onAskRoutes={() => { setNotifyOpen(false); ask(ASK_ROUTES) }} />}
    </ChatContext.Provider>
  )
}
