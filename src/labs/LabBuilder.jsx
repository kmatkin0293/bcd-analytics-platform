import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ContextType, HostEvent, Action } from '@thoughtspot/visual-embed-sdk'
import { LiveboardEmbed, useEmbedRef } from '@thoughtspot/visual-embed-sdk/react'
import { CLIENT_NAME, LABS_BRIEFS, MODEL_ID } from '../config'
import { Icon } from '../icons'
import { Markdown } from '../SpotterTurn'
import {
  LABS_STORE_PREFIX,
  createAnalysisSession,
  createDashboard,
  dashboardData,
  dashboardIdOf,
  dashboardStatus,
  listTools,
  modifyDashboard,
  sendSessionMessage,
  sessionUpdates,
} from '../tsMcp'
import { DashboardMosaic } from './DashboardMosaic'
import { EditableTitle } from './EditableTitle'
import { getDashboard, listDashboards, renameDashboard, tileCount } from './dashboards'
import { usePaths } from './experience'
import { CLIENT_FILTERS } from './thoughtspot'
import { useFillHeight } from './useFillHeight'

// Dashboard Labs: build a dashboard by talking to BCD AI. The user briefs it, it answers with a plan and the data
// it will use, the user approves or changes it, it builds and styles the dashboard, and the conversation keeps going
// to refine it. Two ways in: describe it, or explore first and keep the charts worth keeping.

const EDITOR_FRAME = { height: '100%', width: '100%' }
const HAND_EDIT_HIDDEN = [Action.SpotterViz] // words go through the conversation, not the editor's own AI panel

const START_MODES = [
  { mode: 'describe', icon: 'sparkles', label: 'Describe it', sub: 'One sentence is enough' },
  { mode: 'explore', icon: 'search', label: 'Explore first', sub: 'Ask, then keep the best charts' },
]

const EXAMPLES = {
  describe: [
    'A monthly travel programme review for finance: spend, bookings and savings against last month',
    'Where are we leaking out of policy spend? By department, destination and supplier',
    'An executive overview of the last 12 months with top destinations and suppliers',
  ],
  explore: [
    'How has travel spend trended over the last 12 months?',
    'Which departments have the highest out of policy rate?',
    'Top 10 routes by carbon emissions',
  ],
}

const REFINEMENTS = [
  'Put the KPIs in one row at the top',
  'Add a short note under each chart explaining what it shows',
  'Group the compliance charts into their own tab',
  'Add a chart of spend by travel type',
]

/** Sent with the first brief while "BCD style" is on: the designer takes brand colours as hex codes. */
const BRAND_STYLE =
  'Style it in the BCD Travel brand: deep navy #0B0052 for text and headers, cobalt #542DFF for the main series, orange #F04E23 and amber #FF9E1B as accent colours, ' +
  'light lavender #EEEAFF and cool grey #F5F6FC for backgrounds, white cards, and the Inter typeface.'

/** Sent with the first request after the user edited the dashboard by hand. */
const KEEP_HAND_EDITS =
  'The user has changed this dashboard by hand since your last change (layout, sizes, notes or tiles). Keep their changes unless they ask otherwise.'

/** Sent with every request: text the designer writes onto the dashboard is read by BCD customers, and the portal is scoped to one client. */
const GUARDRAILS =
  `Use only the "BCD Travel Analytics" data model, and filter every chart to Client Name = ${CLIENT_NAME}. ` +
  'In any text you write on the dashboard, call it a dashboard, never a Liveboard, and don’t mention ThoughtSpot, Spotter or SpotterViz.'
const withGuardrails = (instructions) => `${instructions}\n\n${GUARDRAILS}`

/** Keeps the vendor's product names out of what the designer and the analytics agent show. */
const REPLACEMENTS = [
  [/\bThoughtSpot\b/gi, 'BCD Analytics'],
  [/\bSpotterViz\b/gi, 'BCD AI'],
  [/\bSpotIQ\b/gi, 'BCD AI'],
  [/\bSpotter\b/gi, 'BCD AI'],
  [/\bLiveboards\b/gi, 'dashboards'],
  [/\bLiveboard\b/gi, 'dashboard'],
  [/\bWorksheets\b/gi, 'datasets'],
  [/\bWorksheet\b/gi, 'dataset'],
]
const atStart = (s, at) => {
  const before = s.slice(Math.max(0, at - 8), at)
  return /([.!?:]\s+|\n[\s#>*-]*)$/.test(before) || (at <= 8 && /^[\s#>*-]*$/.test(before))
}
const rebrand = (text = '') =>
  REPLACEMENTS.reduce((s, [re, to]) => s.replace(re, (found, at) => (atStart(s, at) && /^[A-Z]/.test(found) ? to[0].toUpperCase() + to.slice(1) : to)), text)

// ---------------------------------------------------------------------------
// Saved conversations
// ---------------------------------------------------------------------------
// One per route: `new` while a dashboard is being made, then the dashboard's ID. Kept for the tab, so a reload picks
// up a plan or a build in progress.

const EMPTY = { entries: [], dashboardId: null, title: '', task: null, running: null, analysisId: null, kept: [] }
const storeKey = (key) => `${LABS_STORE_PREFIX}${key}`

function forgetNewConversation() {
  try {
    sessionStorage.removeItem(storeKey('new'))
  } catch {
    // Nothing was kept.
  }
}

function load(key) {
  const blank = key === 'new' ? EMPTY : { ...EMPTY, dashboardId: key }
  let saved
  try {
    const raw = sessionStorage.getItem(storeKey(key))
    saved = raw ? { ...blank, ...JSON.parse(raw) } : blank
  } catch {
    return blank
  }
  // Work under way when the page went away: with a running task the page resumes it; without one (the first request,
  // before the designer gave it an ID) there is nothing to follow, so say so.
  const entries = saved.entries.map((e) => {
    if (e.kind === 'work' && !e.endedAt && !saved.running)
      return { ...e, endedAt: Date.now(), failed: true, steps: [...e.steps, 'Interrupted: the page was left before BCD AI replied.'] }
    if (e.kind === 'analysis' && !e.done) return { ...e, done: true }
    return e
  })
  return { ...saved, entries }
}

function save(key, s) {
  try {
    sessionStorage.setItem(storeKey(key), JSON.stringify(s))
  } catch {
    // Private mode or full storage: the conversation just won't survive a reload.
  }
}

let seq = 0
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`

/** How a brief tends to start ("Build an…", "Create a…", "Show me…"): not part of the name. */
const BRIEF_LEAD =
  /^(?:please\s+)?(?:(?:build|create|make|design|draft|put together|give|show)(?:\s+(?:me|us))?|i\s+(?:need|want)|we\s+(?:need|want))\s+(?:(?:an?|the)\s+)?/i

/** A dashboard name from the brief: its first clause without the instruction, capitalised, at most ~60 characters. */
function titleFrom(text) {
  const first = text
    .trim()
    .split(/[.:\n]/)[0]
    .trim()
    .replace(BRIEF_LEAD, '')
  const short = first.length > 60 ? `${first.slice(0, 57).replace(/\s+\S*$/, '')}…` : first
  return short ? short[0].toUpperCase() + short.slice(1) : 'Untitled dashboard'
}

function useElapsed(start, end) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (end) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [end])
  const s = Math.max(0, Math.round(((end ?? now) - start) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

function Spinner() {
  return <span className="labs-spin" aria-hidden />
}

// ---------------------------------------------------------------------------
// Conversation entries
// ---------------------------------------------------------------------------

/** BCD AI reports a step as "Its tool\nWhat it's doing": the tool as a label, the rest as a note. */
function StepText({ text }) {
  const [label, ...rest] = text.split('\n')
  return (
    <>
      <span className="labs-step-label">{label}</span>
      {rest.length > 0 && <span className="labs-step-note">{rest.join(' ')}</span>}
    </>
  )
}

function WorkEntry({ entry }) {
  const elapsed = useElapsed(entry.startedAt, entry.endedAt)
  const running = !entry.endedAt
  return (
    <li className={running ? 'labs-entry labs-work is-running' : entry.failed ? 'labs-entry labs-work is-failed' : 'labs-entry labs-work'}>
      <div className="labs-work-head">
        <span className="labs-work-icon" aria-hidden>
          {running ? <Spinner /> : entry.failed ? '!' : <Icon name="check" size={13} strokeWidth={2.8} />}
        </span>
        <strong>{entry.label}</strong>
        <span className="labs-work-time">{elapsed}</span>
      </div>
      {entry.steps.length > 0 && (
        <ol className="labs-steps">
          {entry.steps.map((s, i) => (
            <li key={i} className={running && i === entry.steps.length - 1 ? 'is-current' : undefined}>
              <StepText text={rebrand(s)} />
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

function AnswerTile({ answer, kept, onToggle }) {
  return (
    <figure className={kept ? 'labs-answer is-kept' : 'labs-answer'}>
      <figcaption>
        <span className="labs-answer-title">{rebrand(answer.title)}</span>
        {onToggle && (
          <label className="labs-keep">
            <input type="checkbox" checked={kept} onChange={onToggle} />
            <span>{kept ? 'Kept' : 'Keep'}</span>
          </label>
        )}
      </figcaption>
      {answer.query && <code className="sp-answer-query">{answer.query}</code>}
      {answer.url && (
        <div className="labs-answer-frame">
          <iframe src={answer.url} title={answer.title} loading="lazy" />
        </div>
      )}
    </figure>
  )
}

/** While no dashboard exists yet: its mosaic takes shape as BCD AI works. */
function Loom({ seed, weaving }) {
  return (
    <div className={weaving ? 'labs-loom is-weaving' : 'labs-loom'}>
      <DashboardMosaic seed={seed || 'brief'} tiles={7} />
      <p className="labs-loom-note">
        {weaving ? (
          <>
            <Spinner /> BCD AI is building your dashboard
          </>
        ) : (
          'Your dashboard takes shape here.'
        )}
      </p>
    </div>
  )
}

/** get_data returns raw values: dates as epoch seconds (bucketed by the column's "Month(…)"-style name), percentages as fractions. */
function columnFormat(name, values) {
  const nums = values.filter((v) => typeof v === 'number')
  const bucket = name.match(/^(Day|Week|Month|Quarter|Year)\(/i)?.[1]?.toLowerCase()
  if ((bucket || /date/i.test(name)) && nums.length && nums.every((v) => v > 1e8 && v < 1e11)) {
    const opts =
      bucket === 'year'
        ? { year: 'numeric' }
        : bucket === 'month' || bucket === 'quarter'
          ? { month: 'short', year: 'numeric' }
          : { day: 'numeric', month: 'short', year: 'numeric' }
    const fmt = new Intl.DateTimeFormat(undefined, { ...opts, timeZone: 'UTC' })
    return (v) => (typeof v === 'number' ? fmt.format(v * 1000) : String(v ?? '—'))
  }
  if (/%/.test(name) && nums.length && nums.every((v) => Math.abs(v) <= 1)) {
    return (v) => (typeof v === 'number' ? `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : String(v ?? '—'))
  }
  return (v) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v ?? '—'))
}

/** While exploring: the charts kept so far, laid out as the dashboard-to-be. */
function DraftBoard({ answers, onRemove }) {
  return (
    <div className="labs-draft">
      <p className="labs-note">Draft · {tileCount(answers.length)} kept · BCD AI lays them out and styles them when you make it a dashboard</p>
      <div className="labs-draft-grid">
        {answers.map((a) => (
          <figure key={a.id} className="labs-answer is-kept">
            <figcaption>
              <span className="labs-answer-title">{rebrand(a.title)}</span>
              <button type="button" className="labs-draft-remove" aria-label={`Remove ${a.title}`} title="Don’t keep this chart" onClick={() => onRemove(a.id)}>
                <Icon name="x" size={14} />
              </button>
            </figcaption>
            {a.url && (
              <div className="labs-answer-frame">
                <iframe src={a.url} title={a.title} loading="lazy" />
              </div>
            )}
          </figure>
        ))}
      </div>
    </div>
  )
}

/** The rows behind each chart of the saved dashboard. */
function Numbers({ dashboardId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    dashboardData(dashboardId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [dashboardId])

  const csv = (v) =>
    [v.columns, ...v.data_rows]
      .map((row) => row.map((c) => (c == null ? '' : /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(','))
      .join('\n')
  const formats = useMemo(
    () =>
      data?.map((v) =>
        v.columns.map((name, c) =>
          columnFormat(
            name,
            v.data_rows.map((row) => row[c] ?? null),
          ),
        ),
      ) ?? [],
    [data],
  )

  if (error) return <div className="labs-notice is-error">{rebrand(error)}</div>
  if (!data)
    return (
      <div className="labs-notice">
        <Spinner /> Reading the saved charts…
      </div>
    )
  return (
    <div className="labs-numbers">
      <p className="labs-note">The rows behind each chart, read live from the saved dashboard · up to 25 per chart</p>
      {data.map((v, i) => (
        <section key={v.viz_id ?? i} className="labs-table">
          <header>
            <strong>{rebrand(v.viz_name ?? `Chart ${i + 1}`)}</strong>
            <span className="labs-note">
              {v.data_rows.length}
              {v.total_row_count && v.total_row_count > v.data_rows.length ? ` of ${v.total_row_count.toLocaleString()}` : ''} rows
            </span>
            <button type="button" className="ghost-btn sm" onClick={() => void navigator.clipboard?.writeText(csv(v))}>
              <Icon name="copy" size={13} /> Copy CSV
            </button>
          </header>
          <div className="labs-table-scroll">
            <table>
              <thead>
                <tr>
                  {v.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {v.data_rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className={typeof cell === 'number' ? 'is-num' : undefined}>
                        {formats[i][c](cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

/** The conversation and the dashboard, filling the window below the header. Measures itself whenever it appears. */
function Workspace({ className, children }) {
  const [ref, height] = useFillHeight(560, 24)
  return (
    <div className={className} ref={ref} style={{ height }}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// /labs/build/:id — the builder
// ---------------------------------------------------------------------------

/** Each conversation (`new`, or a dashboard's ID) is its own instance. */
export function LabBuilderRoute() {
  const { id = 'new' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  // Arriving from "Describe it" / "Explore first" starts from scratch; a reload (no such state) picks the saved conversation up.
  const fresh = id === 'new' && !!location.state?.fresh
  const startBrief = fresh ? (location.state?.brief ?? '') : ''
  if (fresh) forgetNewConversation()
  const [brief] = useState(startBrief)
  useEffect(() => {
    if (fresh) navigate(location.pathname + location.search, { replace: true, state: null })
  }, [fresh, navigate, location.pathname, location.search])
  return <LabBuilder key={id} id={id} initialBrief={brief} />
}

function LabBuilder({ id, initialBrief = '' }) {
  const navigate = useNavigate()
  const paths = usePaths()
  const [state, setState] = useState(() => load(id))
  const { entries, dashboardId, title, task, kept } = state
  const [params] = useSearchParams()
  const [mode, setMode] = useState(() => (params.get('mode') === 'explore' ? 'explore' : 'describe'))
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('')
  const [styled, setStyled] = useState(true)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('dashboard')
  /** The dashboard across the whole workspace, conversation folded away. */
  const [focus, setFocus] = useState(false)
  /** Bumped when the designer changes the dashboard, so the embed reloads. */
  const [version, setVersion] = useState(0)
  const [canGetData, setCanGetData] = useState(false)
  const listRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    // A new dashboard that now exists moves to its own address, conversation and all.
    if (id === 'new' && state.dashboardId) {
      save(state.dashboardId, state)
      forgetNewConversation()
      if (!busy) navigate(paths.shuttleViz(state.dashboardId), { replace: true })
      return
    }
    save(id, state)
  }, [id, state, busy, navigate, paths])

  const update = useCallback((fn) => setState((s) => fn(s)), [])
  const push = useCallback((entry) => update((s) => ({ ...s, entries: [...s.entries, entry] })), [update])
  const patch = useCallback((entryId, fn) => update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === entryId ? fn(e) : e)) })), [update])

  // get_data is offered only to users who can download data.
  useEffect(() => {
    listTools()
      .then((tools) => setCanGetData(tools.some((t) => t.name === 'get_data')))
      .catch(() => setCanGetData(false))
  }, [])

  // The dashboard's name, when the conversation starts on an existing one.
  useEffect(() => {
    if (!dashboardId || title) return
    getDashboard(dashboardId)
      .then((d) => update((s) => (s.dashboardId === d.id ? { ...s, title: d.name } : s)))
      .catch(() => undefined)
  }, [dashboardId, title, update])

  // Keep the newest entry in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries])

  /**
   * Follows one designer request to where it needs the user or ends: relays progress while it's in_progress, opens the
   * plan on needs_input, and shows the dashboard on completed.
   */
  const drive = useCallback(
    async (first, kind, label, resumeId) => {
      setBusy(true)
      const workId = resumeId ?? uid()
      if (!resumeId) push({ id: workId, kind: 'work', label, steps: [], startedAt: Date.now() })
      const addStep = (msg) => msg && patch(workId, (e) => (e.kind === 'work' && e.steps[e.steps.length - 1] !== msg ? { ...e, steps: [...e.steps, msg] } : e))
      try {
        let r = await first()
        while (r.status === 'in_progress') {
          if (!r.task_id) throw new Error('BCD AI is working but didn’t say on what. Check My dashboards in a few minutes.')
          const running = { id: r.task_id, kind }
          update((s) => (s.running?.id === running.id ? s : { ...s, running }))
          addStep(r.message)
          r = await dashboardStatus(r.task_id)
        }
        patch(workId, (e) => (e.kind === 'work' ? { ...e, endedAt: Date.now(), failed: r.status === 'failed' } : e))
        if (r.status === 'needs_input') {
          push({ id: uid(), kind: 'plan', message: r.message ?? 'BCD AI has a question.', choices: r.choices ?? [], open: true })
          update((s) => ({ ...s, running: null, task: r.task_id ? { id: r.task_id, kind } : s.task }))
        } else if (r.status === 'completed') {
          const made = dashboardIdOf(r) ?? stateRef.current.dashboardId
          update((s) => ({ ...s, running: null, task: null, dashboardId: made ?? null }))
          push({ id: uid(), kind: 'done', message: r.message ?? 'Done.', changed: r.changes_applied !== false })
          setVersion((v) => v + 1)
          setView('dashboard')
        } else {
          update((s) => ({ ...s, running: null, task: null }))
          push({ id: uid(), kind: 'error', message: r.message ?? 'BCD AI couldn’t finish. Nothing was saved.' })
        }
      } catch (err) {
        patch(workId, (e) => (e.kind === 'work' ? { ...e, endedAt: Date.now(), failed: true } : e))
        update((s) => ({ ...s, running: null }))
        push({ id: uid(), kind: 'error', message: err.message })
      } finally {
        setBusy(false)
      }
    },
    [push, patch, update],
  )

  // Back on the page while a build was running: keep following it.
  const resumed = useRef(false)
  useEffect(() => {
    const running = stateRef.current.running
    if (resumed.current || !running) return
    resumed.current = true
    const open = stateRef.current.entries.findLast((e) => e.kind === 'work' && !e.endedAt)
    void drive(() => dashboardStatus(running.id), running.kind, 'Picking up where BCD AI left off', open?.id)
  }, [drive])

  const closePlans = () => update((s) => ({ ...s, entries: s.entries.map((e) => (e.kind === 'plan' && e.open ? { ...e, open: false } : e)) }))

  /** The user's reply to the designer's plan or question, sent to whichever tool started the task. */
  const reply = (text) => {
    if (!task || !text.trim()) return
    closePlans()
    push({ id: uid(), kind: 'you', text })
    update((s) => ({ ...s, task: null, running: task }))
    const instructions = withGuardrails(text.trim())
    if (task.kind === 'create') void drive(() => createDashboard({ task_id: task.id, instructions }), 'create', 'Building your dashboard')
    else void drive(() => modifyDashboard({ dashboard_id: dashboardId, task_id: task.id, instructions }), 'modify', 'Changing your dashboard')
  }

  const startDesign = (text) => {
    const dashboardTitle = name.trim() || titleFrom(text)
    update((s) => ({ ...s, title: dashboardTitle }))
    push({ id: uid(), kind: 'you', text, note: styled ? 'BCD style' : undefined })
    void drive(
      () => createDashboard({ title: dashboardTitle, instructions: withGuardrails(styled ? `${text}\n\n${BRAND_STYLE}` : text), data_source_id: MODEL_ID }),
      'create',
      'Planning with BCD AI',
    )
  }

  const refine = (text) => {
    if (!dashboardId) return
    push({ id: uid(), kind: 'you', text })
    const handEdited = stateRef.current.handEdited
    if (handEdited) update((s) => ({ ...s, handEdited: false }))
    const instructions = withGuardrails(handEdited ? `${text}\n\n${KEEP_HAND_EDITS}` : text)
    void drive(() => modifyDashboard({ dashboard_id: dashboardId, instructions }), 'modify', 'Changing your dashboard')
  }

  // ---- Editing by hand: the dashboard editor, without its own AI panel ----
  // BCD AI saves the dashboard itself, and the editor saves what it loaded, so the two take turns: no editing while
  // BCD AI works or waits on a plan, and no messages to BCD AI until the edits are saved or cancelled.
  const editorRef = useEmbedRef()
  const [editing, setEditing] = useState(false)
  // A save can be reported more than once: only the first ends the edit.
  const editingRef = useRef(false)
  editingRef.current = editing
  const canEdit = !!dashboardId && !busy && !task
  const onEditorRendered = useCallback(() => {
    editorRef.current?.trigger(HostEvent.Edit, {}, ContextType.Liveboard).catch(() => {})
  }, [editorRef])
  const onHandSaved = useCallback(() => {
    if (!editingRef.current) return
    editingRef.current = false
    setEditing(false)
    setVersion((v) => v + 1)
    update((s) => ({ ...s, handEdited: true, entries: [...s.entries, { id: uid(), kind: 'manual' }] }))
  }, [update])
  const onHandCancelled = useCallback(() => {
    if (!editingRef.current) return
    editingRef.current = false
    setEditing(false)
    setVersion((v) => v + 1)
  }, [])
  // Unsaved edits live in the editor only: warn before the tab is closed or reloaded.
  useEffect(() => {
    if (!editing) return undefined
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editing])

  /** One question to BCD AI's analytics agent, polled until it's answered. */
  const ask = async (question) => {
    setBusy(true)
    push({ id: uid(), kind: 'you', text: question })
    const entryId = uid()
    push({ id: entryId, kind: 'analysis', steps: [], text: '', answers: [], done: false })
    try {
      let sessionId = stateRef.current.analysisId
      if (!sessionId) {
        sessionId = await createAnalysisSession(MODEL_ID)
        update((s) => ({ ...s, analysisId: sessionId }))
      }
      await sendSessionMessage(sessionId, `For client ${CLIENT_NAME}: ${question}`)
      for (;;) {
        const { session_updates: updates, is_done: isDone } = await sessionUpdates(sessionId)
        // The same answer can arrive more than once (as it's drafted, then final): keep the latest.
        const seen = new Set(stateRef.current.entries.flatMap((e) => (e.kind === 'analysis' ? e.answers.map((a) => a.id) : [])))
        const answers = []
        for (const u of updates) {
          if (u.type !== 'answer' || !u.answer_id || seen.has(u.answer_id)) continue
          seen.add(u.answer_id)
          answers.push({ id: u.answer_id, title: u.answer_title ?? 'Answer', url: u.iframe_url, query: u.answer_query })
        }
        patch(entryId, (e) => {
          if (e.kind !== 'analysis') return e
          let { text, steps } = e
          for (const u of updates) {
            if (u.type === 'step_notification' && u.text && steps[steps.length - 1] !== u.text) steps = [...steps, u.text]
            else if ((u.type === 'text' || u.type === 'text_chunk') && !u.is_thinking && u.text) text += u.text
          }
          return { ...e, text, steps, answers: [...e.answers, ...answers], done: isDone }
        })
        // New charts are kept by default; the user unticks the ones they don't want.
        if (answers.length) update((s) => ({ ...s, kept: [...s.kept, ...answers.map((a) => a.id)] }))
        if (isDone) break
        await new Promise((r) => setTimeout(r, 1200))
      }
    } catch (err) {
      patch(entryId, (e) => (e.kind === 'analysis' ? { ...e, done: true } : e))
      push({ id: uid(), kind: 'error', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const allAnswers = [...new Map(entries.flatMap((e) => (e.kind === 'analysis' ? e.answers : [])).map((a) => [a.id, a])).values()]
  const keptAnswers = allAnswers.filter((a) => kept.includes(a.id))
  const toggleKeep = (answerId) => update((s) => ({ ...s, kept: s.kept.includes(answerId) ? s.kept.filter((k) => k !== answerId) : [...s.kept, answerId] }))

  const buildFromAnswers = () => {
    const dashboardTitle = name.trim() || `${CLIENT_NAME} travel findings`
    update((s) => ({ ...s, title: dashboardTitle }))
    push({ id: uid(), kind: 'you', text: `Make a dashboard from the ${keptAnswers.length} charts I kept.`, note: styled ? 'BCD style' : undefined })
    void drive(
      () =>
        createDashboard({
          title: dashboardTitle,
          answers: keptAnswers.map((a) => ({ answer_id: a.id, title: a.title })),
          instructions: withGuardrails(styled ? BRAND_STYLE : 'Organise these charts into a clear dashboard.'),
        }),
      'create',
      'Laying out your charts',
    )
  }

  const startOver = () => {
    forgetNewConversation()
    setState(EMPTY)
    setDraft('')
    setName('')
  }

  const pickMode = (m) => {
    if (m === mode) return
    setMode(m)
    setDraft('') // each mode has its own examples: what was typed for one doesn't carry over
  }

  const phase = task ? 'reply' : dashboardId ? 'refine' : mode === 'explore' ? 'explore' : 'start'

  const submit = (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    if (phase === 'reply') reply(text)
    else if (phase === 'refine') refine(text)
    else if (phase === 'explore') void ask(text)
    else startDesign(text)
  }

  // The user's dashboards, for the Dashboard picker in the bar.
  const [mine, setMine] = useState(null)
  useEffect(() => {
    listDashboards()
      .then(setMine)
      .catch(() => setMine([]))
  }, [version])

  const owned = !!dashboardId && !!mine?.some((d) => d.id === dashboardId)

  const rename = async (next) => {
    if (busy) throw new Error('Wait for BCD AI to finish, then rename.')
    if (editing) throw new Error('Save or cancel your edits first, then rename.')
    const renamed = await renameDashboard(dashboardId, next)
    update((s) => ({ ...s, title: renamed.name }))
    setMine((l) => l?.map((d) => (d.id === renamed.id ? renamed : d)) ?? null)
    setVersion((v) => v + 1)
  }

  const pickDashboard = (next) => {
    if (next === (dashboardId ?? '')) return
    navigate(paths.shuttleViz(next || null), next ? undefined : { state: { fresh: true } })
  }

  /** The brief screen, for a new dashboard: BCD AI starts from one description. */
  const [brief, setBrief] = useState(initialBrief)
  const submitBrief = (e) => {
    e?.preventDefault()
    if (!brief.trim() || busy) return
    const text = brief.trim()
    setBrief('')
    startDesign(text)
  }

  const started = entries.length > 0
  const seed = entries.find((e) => e.kind === 'you')?.text ?? ''
  const working = entries.some((e) => e.kind === 'work' && !e.endedAt)
  const placeholder =
    phase === 'reply'
      ? 'Change something in the plan, or answer its question…'
      : phase === 'refine'
        ? 'What should change? “Make the KPIs bigger”, “Add a tab for suppliers”…'
        : phase === 'explore'
          ? 'Ask BCD AI a question about your travel data…'
          : 'What do you need to see? “A monthly view of spend and policy compliance by department”…'

  return (
    <div className="page labs-builder">
      <header className="page-head labs-head">
        <div>
          <Link to={paths.home} className="labs-back">
            <Icon name="chevron-left" size={14} /> My dashboards
          </Link>
          <div className="eyebrow">
            <span className="labs-badge">BCD AI</span>{' '}
            <span className="labs-badge is-beta">Dashboard Builder</span>
          </div>
          {dashboardId && title && owned ? (
            <EditableTitle name={title} className="labs-h1" onRename={rename} />
          ) : (
            <h1 className="labs-h1">{title || (dashboardId ? ' ' : name.trim() || 'New dashboard')}</h1>
          )}
        </div>
        <div className="labs-head-actions">
          {id === 'new' && started && !dashboardId && (
            <button type="button" className="ghost-btn" onClick={startOver} disabled={busy}>
              <Icon name="reset" size={14} /> Start over
            </button>
          )}
          {/* As in Studio: switch to Search on the same dashboard. */}
          <div className="studio-modes" role="tablist" aria-label="How to build">
            <button
              type="button"
              role="tab"
              aria-selected={false}
              className="studio-mode"
              disabled={busy || editing}
              onClick={() => navigate(paths.search(dashboardId))}
            >
              <Icon name="search" size={16} />
              <span className="studio-mode-text">
                <strong>Search</strong>
                <span>Chart by chart</span>
              </span>
            </button>
            <button type="button" role="tab" aria-selected className="studio-mode is-active">
              <Icon name="sparkles" size={16} />
              <span className="studio-mode-text">
                <strong>BCD AI</strong>
                <span>Talk it through</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="labs-bar">
        <label className="labs-field">
          <span>Dashboard</span>
          <select value={dashboardId ?? ''} onChange={(e) => pickDashboard(e.target.value)} disabled={busy || editing || !mine}>
            <option value="">＋ New dashboard</option>
            {mine && mine.length > 0 && (
              <optgroup label="Yours">
                {mine.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {tileCount(d.tiles)}
                  </option>
                ))}
              </optgroup>
            )}
            {dashboardId && mine && !mine.some((d) => d.id === dashboardId) && <option value={dashboardId}>{title || 'This dashboard'}</option>}
          </select>
        </label>
        {!dashboardId && (
          <label className="labs-field">
            <span>Name</span>
            <input value={name} placeholder="Named from your brief" maxLength={100} onChange={(e) => setName(e.target.value)} disabled={started} />
          </label>
        )}
        <span className="labs-bar-note">
          {dashboardId ? 'Changes go to this dashboard' : 'Created when you send the brief; built once you approve the plan'}
        </span>
        {dashboardId && (
          <Link to={paths.view(dashboardId)} className="labs-open">
            Open dashboard <Icon name="external" size={13} />
          </Link>
        )}
      </section>

      {id === 'new' && !started && mode === 'describe' ? (
        <section className="labs-brief" aria-label="Brief BCD AI">
          <header className="labs-brief-head">
            <span className="labs-brief-mark">
              <Icon name="sparkles" size={20} />
            </span>
            <div>
              <h2>What should this dashboard show?</h2>
              <p>
                Write it the way you’d brief an analyst. BCD AI comes back with a plan and the {CLIENT_NAME} travel data it will use, builds and styles the
                dashboard once you approve, then keeps refining it as you talk. You can also edit it by hand at any point.
              </p>
            </div>
          </header>
          <form onSubmit={submitBrief}>
            <textarea
              value={brief}
              rows={4}
              maxLength={1000}
              placeholder="e.g. A monthly view for the travel manager: spend vs last year by travel type, the departments with the highest out of policy rate, and top destinations."
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitBrief(e)
              }}
            />
            <div className="labs-brief-foot">
              <label className="labs-toggle" title="Sends the BCD colours to BCD AI as hex codes">
                <input type="checkbox" checked={styled} onChange={(e) => setStyled(e.target.checked)} />
                <span className="labs-toggle-track" aria-hidden />
                <span>BCD style</span>
              </label>
              <span className="labs-note">⌘ + Enter to start</span>
              <button type="submit" className="primary-btn" disabled={!brief.trim()}>
                <Icon name="sparkles" size={15} /> Plan it with BCD AI
              </button>
            </div>
          </form>
          <div className="labs-starters">
            <span className="labs-note">Or start from</span>
            <div className="labs-starter-list">
              {LABS_BRIEFS.map((b) => (
                <button key={b.id} type="button" className="labs-starter" onClick={() => setBrief(b.prompt)}>
                  <strong>{b.label}</strong>
                  <span>{b.prompt}</span>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="labs-explore-instead" onClick={() => pickMode('explore')}>
            <Icon name="search" size={18} />
            <span>
              <strong>Not sure yet? Explore first.</strong> Ask BCD AI questions about your travel data, keep the charts worth keeping, and turn them into a
              dashboard.
            </span>
            <span className="labs-explore-cta">
              Explore <Icon name="arrow" size={14} />
            </span>
          </button>
        </section>
      ) : (
        <Workspace className={focus && dashboardId ? 'labs-workspace is-focus' : 'labs-workspace'}>
          {/* ---- Conversation ---- */}
          <section className="labs-talk" aria-label="Conversation with BCD AI">
            {!started && !dashboardId && (
              <div className="labs-intro">
                <p>
                  Tell BCD AI what you need. It comes back with a plan and the data it will use, builds only once you approve, and keeps refining the dashboard
                  as you talk.
                </p>
                <div className="labs-modes" role="tablist" aria-label="How to start">
                  {START_MODES.map((m) => (
                    <button
                      key={m.mode}
                      type="button"
                      role="tab"
                      aria-selected={mode === m.mode}
                      className={mode === m.mode ? 'labs-mode is-active' : 'labs-mode'}
                      onClick={() => pickMode(m.mode)}
                    >
                      <Icon name={m.icon} size={16} />
                      <span>
                        <strong>{m.label}</strong>
                        <small>{m.sub}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!started && dashboardId && (
              <div className="labs-intro">
                <p>Tell BCD AI how to change this dashboard: layout, styling, new charts, notes, groups or tabs.</p>
              </div>
            )}

            <ol className="labs-entries" ref={listRef}>
              {entries.map((e) => {
                switch (e.kind) {
                  case 'you':
                    return (
                      <li key={e.id} className="labs-entry labs-you">
                        <p>{e.text}</p>
                        {e.note && <span className="labs-you-note">{e.note}</span>}
                      </li>
                    )
                  case 'plan':
                    return (
                      <li key={e.id} className={e.open ? 'labs-entry labs-plan is-open' : 'labs-entry labs-plan'}>
                        <span className="labs-from">BCD AI · {e.open ? 'waiting for you' : 'answered'}</span>
                        <Markdown text={e.message} className="labs-md" />
                        {e.open && (
                          <div className="labs-plan-actions">
                            {e.choices.map((c) => (
                              <button key={c} type="button" className="labs-chip" onClick={() => reply(c)} disabled={busy}>
                                {rebrand(c)}
                              </button>
                            ))}
                            {e.choices.length === 0 && (
                              <button type="button" className="primary-btn" onClick={() => reply('Looks good. Build it.')} disabled={busy}>
                                <Icon name="check" size={14} /> Build it
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  case 'work':
                    return <WorkEntry key={e.id} entry={e} />
                  case 'done':
                    return (
                      <li key={e.id} className="labs-entry labs-done">
                        <span className="labs-from">BCD AI · {e.changed ? 'saved' : 'nothing changed'}</span>
                        <Markdown text={e.message} className="labs-md" />
                      </li>
                    )
                  case 'error':
                    return (
                      <li key={e.id} className="labs-entry labs-error" role="alert">
                        {rebrand(e.message)}
                      </li>
                    )
                  case 'manual':
                    return (
                      <li key={e.id} className="labs-entry labs-manual">
                        <Icon name="edit" size={13} /> You edited the dashboard by hand · saved
                      </li>
                    )
                  case 'analysis':
                    return (
                      <li key={e.id} className="labs-entry labs-analysis">
                        <span className="labs-from">
                          {!e.done && <Spinner />} BCD AI {e.done ? '' : `· ${rebrand(e.steps[e.steps.length - 1] ?? 'thinking')}`}
                        </span>
                        {e.answers.map((a) => (
                          <AnswerTile key={a.id} answer={a} kept={kept.includes(a.id)} onToggle={dashboardId ? undefined : () => toggleKeep(a.id)} />
                        ))}
                        {e.text && <Markdown text={e.text} className="labs-md" />}
                      </li>
                    )
                  default:
                    return null
                }
              })}
            </ol>

            {!dashboardId && keptAnswers.length > 0 && !task && (
              <div className="labs-tray">
                <span>
                  <strong>{keptAnswers.length}</strong> {keptAnswers.length === 1 ? 'chart' : 'charts'} kept
                </span>
                <button type="button" className="primary-btn" onClick={buildFromAnswers} disabled={busy}>
                  Make it a dashboard <Icon name="arrow" size={14} />
                </button>
              </div>
            )}

            <form className={busy || editing ? 'labs-composer is-busy' : 'labs-composer'} onSubmit={submit}>
              {editing && (
                <p className="labs-editing-note" role="status">
                  <strong>You’re editing by hand.</strong> Save or cancel in the toolbar above the dashboard to keep talking to BCD AI.
                </p>
              )}
              {phase === 'refine' && !busy && !editing && (
                <div className="labs-suggest">
                  {REFINEMENTS.map((r) => (
                    <button key={r} type="button" className="labs-suggestion" onClick={() => refine(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {(phase === 'start' || phase === 'explore') && !started && (
                <div className="labs-suggest">
                  {EXAMPLES[mode].map((x) => (
                    <button key={x} type="button" className="labs-suggestion" onClick={() => setDraft(x)}>
                      {x.length > 90 ? `${x.slice(0, 88)}…` : x}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={draft}
                rows={2}
                placeholder={busy ? 'BCD AI is working…' : editing ? 'BCD AI waits while you edit…' : placeholder}
                disabled={busy || editing}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e)
                }}
              />
              <div className="labs-composer-row">
                {((phase === 'start' && !started) || (phase === 'explore' && keptAnswers.length > 0)) && !task && (
                  <label className="labs-toggle" title="Sends the BCD colours to BCD AI as hex codes">
                    <input type="checkbox" checked={styled} onChange={(e) => setStyled(e.target.checked)} />
                    <span className="labs-toggle-track" aria-hidden />
                    <span>BCD style</span>
                  </label>
                )}
                <button type="submit" className="primary-btn labs-send" disabled={busy || editing || !draft.trim()}>
                  {phase === 'reply' ? 'Reply' : phase === 'refine' ? 'Change it' : phase === 'explore' ? 'Ask' : 'Brief it'} <Icon name="arrow" size={14} />
                </button>
              </div>
            </form>
          </section>

          {/* ---- Stage ---- */}
          <section className="labs-stage" aria-label="Dashboard">
            <header className="labs-stage-head">
              <div className="labs-tabs" role="tablist" aria-label="Show">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'dashboard'}
                  className={view === 'dashboard' ? 'labs-tab is-active' : 'labs-tab'}
                  onClick={() => setView('dashboard')}
                >
                  Dashboard
                </button>
                {canGetData && dashboardId && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={view === 'numbers'}
                    className={view === 'numbers' ? 'labs-tab is-active' : 'labs-tab'}
                    onClick={() => setView('numbers')}
                    disabled={editing}
                  >
                    The numbers
                  </button>
                )}
              </div>
              {dashboardId && (
                <div className="labs-stage-links">
                  {editing ? (
                    <span className="labs-editing-badge">
                      <Icon name="edit" size={13} /> Editing by hand
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="ghost-btn sm"
                      disabled={!canEdit}
                      onClick={() => {
                        setView('dashboard')
                        setEditing(true)
                      }}
                      title={
                        canEdit
                          ? 'Resize, move and add to the dashboard yourself'
                          : task
                            ? 'Answer BCD AI first, then edit by hand'
                            : 'Wait for BCD AI to finish, then edit by hand'
                      }
                    >
                      <Icon name="edit" size={13} /> Edit by hand
                    </button>
                  )}
                  <button type="button" className="ghost-btn sm" onClick={() => setFocus((f) => !f)} aria-pressed={focus}>
                    <Icon name={focus ? 'shrink' : 'expand'} size={13} /> {focus ? 'Show conversation' : 'Full view'}
                  </button>
                </div>
              )}
            </header>
            <div className={editing ? 'labs-stage-body is-editing' : 'labs-stage-body'}>
              {!dashboardId && keptAnswers.length > 0 && !working ? (
                <DraftBoard answers={keptAnswers} onRemove={toggleKeep} />
              ) : !dashboardId ? (
                <Loom seed={seed} weaving={working} />
              ) : view === 'numbers' ? (
                <Numbers key={`${dashboardId}-${version}`} dashboardId={dashboardId} />
              ) : (
                <div className={busy ? 'labs-embed is-changing' : editing ? 'labs-embed is-editing' : 'labs-embed'}>
                  {editing ? (
                    // The editor: the edit toolbar (Save, Cancel, add, resize), but no AI button: words go through the conversation.
                    // A frame the size of the panel, not the dashboard's full height: a chart's Edit opens search in this same frame.
                    <LiveboardEmbed
                      key={`${dashboardId}-${version}-edit`}
                      ref={editorRef}
                      liveboardId={dashboardId}
                      hiddenActions={HAND_EDIT_HIDDEN}
                      showLiveboardTitle={false}
                      frameParams={EDITOR_FRAME}
                      runtimeFilters={CLIENT_FILTERS}
                      onLiveboardRendered={onEditorRendered}
                      onSave={onHandSaved}
                      onCancel={onHandCancelled}
                    />
                  ) : (
                    <LiveboardEmbed
                      key={`${dashboardId}-${version}`}
                      liveboardId={dashboardId}
                      hideLiveboardHeader
                      fullHeight
                      minimumHeight={480}
                      runtimeFilters={CLIENT_FILTERS}
                    />
                  )}
                  {busy && (
                    <div className="labs-embed-veil">
                      <Spinner /> BCD AI is changing the dashboard
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </Workspace>
      )}
    </div>
  )
}
