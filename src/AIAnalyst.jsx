import { useCallback, useEffect, useRef, useState } from 'react'
import { SpotterEmbed } from '@thoughtspot/visual-embed-sdk/react'
import { HostEvent } from '@thoughtspot/visual-embed-sdk'
import { MODEL_ID, CLIENT_FILTER, CLIENT_NAME } from './config'
import { Icon } from './icons'
import { AIMark } from './AIChat'

// Split layout borrowed from the Lumira "Ask Lumira" page: a hero + live Spotter answer on the left,
// a general-questions chat with suggested data questions on the right. Colours come from the portal's design tokens.
const SAMPLE_QUESTIONS = [
  { label: 'Spend by travel type', query: 'total spend by travel type' },
  { label: 'Out of policy by department', query: 'out of policy rate by department' },
  { label: 'Top destinations', query: 'top destinations by spend' },
  { label: 'Carbon by travel type', query: 'carbon emissions by travel type' },
  { label: 'Monthly spend trend', query: 'monthly travel spend trend' },
  { label: 'Savings by supplier', query: 'negotiated savings by supplier' },
]

const COMPANY_TRIGGERS = [
  /what (does|is) bcd/i, /who is bcd/i, /tell me about bcd/i, /about bcd/i,
  /what (can|do) (you|bcd) (do|offer|help)/i, /how does (bcd|this) work/i,
]
const COMPANY_BRIEF = `**BCD Analytics** brings ${CLIENT_NAME}'s travel bookings, spend, policy and carbon data into one live view.

**What you can do here:**
• **Ask in plain English** — get answers with live charts from your booking data
• **Track policy and spend** — out of policy bookings, departments, cost centres and suppliers
• **Watch sustainability** — carbon emissions by mode, route and traveller
• **Act on disruption** — find travellers who need rebooking and notify them

The AI Analyst is the conversational layer: just ask, and your data answers.`

const isGeneralQuestion = (q) => COMPANY_TRIGGERS.some((rx) => rx.test(q))

function Brief({ text }) {
  return (
    <div className="aia-brief">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="aia-gap" />
        return <div key={i}>{line.split(/\*\*(.*?)\*\*/g).map((p, j) => (j % 2 ? <strong key={j}>{p}</strong> : <span key={j}>{p}</span>))}</div>
      })}
    </div>
  )
}

const SPOTTER_FILTERS = [CLIENT_FILTER] // module-level: a new array each render would reload the embed
const SPOTTER_STYLE = {
  customizations: {
    style: {
      customCSS: {
        rules_UNSTABLE: {
          // The built-in input bar is hidden: questions come from the chat panel on the right.
          '[class*="ChatInput"]': { display: 'none !important' },
          '[class*="chatInput"]': { display: 'none !important' },
          '[class*="InputEditor"]': { display: 'none !important' },
          '[class*="inputEditor"]': { display: 'none !important' },
        },
      },
    },
  },
}

export function AIAnalystPage() {
  const [spotterActive, setSpotterActive] = useState(false)
  const [activeChip, setActiveChip] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const spotterRef = useRef(null)
  const spotterReady = useRef(false) // refs, not state, so the onLoad flush is never stale
  const pendingQuery = useRef(null)
  const counter = useRef(0)
  const feedRef = useRef(null)

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  const fire = (query) => spotterRef.current?.trigger(HostEvent.SpotterSearch, { query, executeSearch: true })

  const handleLoad = useCallback(() => {
    spotterReady.current = true
    if (pendingQuery.current) { fire(pendingQuery.current); pendingQuery.current = null }
  }, [])

  const sendToSpotter = useCallback((query) => {
    setActiveChip(query)
    setSpotterActive(true)
    if (spotterReady.current && spotterRef.current) fire(query)
    else pendingQuery.current = query
  }, [])

  const sendGeneral = useCallback(async (query) => {
    const uid = ++counter.current
    const aid = ++counter.current
    setMsgs((m) => [...m, { id: uid, role: 'user', text: query }, { id: aid, role: 'loading' }])
    setBusy(true)
    await new Promise((r) => setTimeout(r, 700))
    setBusy(false)
    setMsgs((m) => m.map((x) => (x.id === aid ? { ...x, role: 'ai', text: COMPANY_BRIEF } : x)))
  }, [])

  const send = useCallback(async (query) => {
    if (!query.trim() || busy) return
    setInput('')
    if (isGeneralQuestion(query)) await sendGeneral(query)
    else sendToSpotter(query)
  }, [busy, sendGeneral, sendToSpotter])

  const chips = (cls) => SAMPLE_QUESTIONS.map((q) => (
    <button key={q.query} type="button" className={`${cls} ${activeChip === q.query ? 'on' : ''}`} onClick={() => send(q.query)}>{q.label}</button>
  ))

  return (
    <div className="aia">
      <div className={`aia-main ${spotterActive ? 'active' : ''}`}>
        {!spotterActive && (
          <div className="aia-hero">
            {[280, 420, 560].map((d) => <span key={d} className="aia-ring" style={{ width: d, height: d }} />)}
            <div className="aia-hero-inner">
              <AIMark size={56} />
              <div className="aia-badge"><Icon name="sparkles" size={11} /> Powered by BCD AI</div>
              <h1>AI Analyst</h1>
              <p>Ask a data question using the panel on the right, or click a suggested question below to see a live Spotter answer here.</p>
              <div className="aia-chips lg">{chips('aia-chip')}</div>
            </div>
          </div>
        )}
        <div className="aia-embed" style={{ display: spotterActive ? 'flex' : 'none' }}>
          <SpotterEmbed
            key="aia-persistent"
            ref={spotterRef}
            onLoad={handleLoad}
            worksheetId={MODEL_ID}
            runtimeFilters={SPOTTER_FILTERS}
            updatedSpotterChatPrompt
            hideSourceSelection
            hideSampleQuestions
            customizations={SPOTTER_STYLE.customizations}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
      </div>

      <aside className="aia-side">
        <header className="aia-side-head">
          <AIMark size={30} />
          <div><strong>AI Analyst</strong><small>Travel intelligence</small></div>
          <span className="aia-live" />
        </header>

        <div className="aia-feed" ref={feedRef}>
          {msgs.length === 0 && <p className="aia-empty">Data questions open in Spotter on the left. Ask me anything about BCD Analytics here.</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`aia-msg ${m.role === 'user' ? 'me' : ''}`}>
              {m.role !== 'user' && <span className="aia-avatar"><Icon name="sparkles" size={12} /></span>}
              <div className="aia-bubble">
                {m.role === 'user' && m.text}
                {m.role === 'loading' && <span className="aia-dots"><i /><i /><i /></span>}
                {m.role === 'ai' && <Brief text={m.text} />}
              </div>
            </div>
          ))}
          {spotterActive && <div className="aia-status"><Icon name="arrow" size={10} className="flip" /> Spotter is answering on the left</div>}
          <div className="aia-try">
            <small>{msgs.length === 0 ? 'Try a data question:' : 'Try asking:'}</small>
            <div className="aia-chips">{chips('aia-chip sm')}</div>
          </div>
        </div>

        <form className="aia-input" onSubmit={(e) => { e.preventDefault(); send(input) }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" disabled={busy} />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send"><Icon name="send" size={15} /></button>
        </form>
      </aside>
    </div>
  )
}
