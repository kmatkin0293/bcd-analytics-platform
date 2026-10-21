// Headless Spotter via the Spotter Agent REST API, proxied through this app's server
// (server/index.js -> /api/spotter/*), so the browser never holds a ThoughtSpot token.

/** Product wording: the assistant is "BCD AI", never "Spotter". */
export const rebrand = (text = '') => text.replace(/Spotter/g, 'BCD AI')

export class SpotterError extends Error {
  constructor(status, detail) {
    super(
      status === 401 ? 'Your session has expired. Reload the page and try again.'
        : status === 403 ? 'Your account does not have access to BCD AI yet.'
        : `BCD AI couldn't answer (${status}). ${detail}`,
    )
    this.status = status
  }
}

async function post(path, body, { signal } = {}) {
  const res = await fetch(`/api/spotter${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal,
  })
  if (!res.ok) throw new SpotterError(res.status, (await res.text().catch(() => '')).slice(0, 200))
  return res
}

export async function createConversation() {
  const body = await (await post('/conversation')).json()
  return body.conversation_identifier ?? body.conversation_id
}

/** Asks Spotter to stop generating; the conversation stays usable. */
export const stopResponse = (conversationId) => post(`/conversation/${conversationId}/stop`).catch(() => {})

/** Sends a message and calls `onEvent` for each Server-Sent Event (`data: <json>`, one event or an array). */
export async function streamMessage(conversationId, message, onEvent, signal) {
  const res = await post(`/conversation/${conversationId}/stream`, { message }, { signal })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const flush = (raw) => {
    const data = raw.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
    if (!data) return
    try {
      const parsed = JSON.parse(data)
      for (const e of Array.isArray(parsed) ? parsed : [parsed]) onEvent(e)
    } catch {
      console.warn('BCD AI: unparsed stream message', data.slice(0, 200))
    }
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let at
    while ((at = buffer.indexOf('\n\n')) >= 0) {
      flush(buffer.slice(0, at))
      buffer = buffer.slice(at + 2)
    }
  }
  flush(buffer)
}

let hostPromise
const thoughtSpotHost = () => (hostPromise ??= fetch('/api/config').then((r) => r.json()).then((c) => c.host))

/** URL of the interactive answer (chart) for an `answer` event. The SDK's frame renderer authenticates it. */
export const answerFrameUrl = async (a) =>
  `${await thoughtSpotHost()}/?tsmcp=true#/embed/conv-assist-answer` +
  `?sessionId=${encodeURIComponent(a.session_id)}&genNo=${a.gen_no}` +
  `&acSessionId=${encodeURIComponent(a.transaction_id)}&acGenNo=${a.generation_number}`

// ---------------------------------------------------------------------------
// Turn model: what the UI renders for one question
// ---------------------------------------------------------------------------
export const newTurn = (question) => ({ question, phase: 'starting', steps: [], answers: [], text: '', startedAt: Date.now() })

const STAGES = {
  nls_start: 'Reading the question',
  QH: 'Matching columns',
  TML_GEN: 'Writing the search',
  ANSWER_GEN: 'Building the answer',
  nls_table_data_fetch: 'Fetching the data',
}
export const stageLabel = (code) => STAGES[code] ?? code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())

const sameAnswer = (a, b) => a.session_id === b.session_id && a.gen_no === b.gen_no

/** Folds one streamed event into the turn (immutably). */
export function applyEvent(turn, e) {
  const t = { ...turn, phase: turn.phase === 'starting' ? 'working' : turn.phase }
  const withStep = (id, title) => {
    const key = id ?? 'misc'
    if (t.steps.some((s) => s.id === key)) return t.steps
    return [...t.steps, { id: key, title: title ?? 'Working', running: true, thinking: '', outputs: [], stages: [] }]
  }
  const update = (id, fn) => {
    const key = id ?? 'misc'
    t.steps = t.steps.map((s) => (s.id === key ? fn(s) : s))
  }
  const finishSteps = () => { t.steps = t.steps.map((s) => ({ ...s, running: false })) }

  switch (e.type) {
    case 'conv_title':
      t.title = e.title
      break
    case 'notification':
      if (e.code === 'FINAL_RESPONSE_NOTIFICATION') {
        finishSteps()
        t.phase = 'answering'
      } else if (e.code === 'TOOL_CALL_NOTIFICATION') {
        finishSteps()
        t.steps = withStep(e.group_id, e.metadata?.tool_title)
      } else if (e.code) {
        t.steps = withStep(e.group_id)
        update(e.group_id, (s) => (s.stages.includes(e.code) ? s : { ...s, stages: [...s.stages, e.code] }))
      }
      break
    case 'text-chunk':
    case 'text':
      if (!e.content) break
      if (e.metadata?.type === 'thinking') {
        t.steps = withStep(e.group_id)
        update(e.group_id, (s) => (e.type === 'text' ? { ...s, outputs: [...s.outputs, e.content] } : { ...s, thinking: s.thinking + e.content }))
      } else {
        t.phase = 'answering'
        t.text = e.type === 'text' && e.content.length > t.text.length ? e.content : t.text + (e.type === 'text-chunk' ? e.content : '')
      }
      break
    case 'answer':
      if (e.metadata?.type === 'thinking') {
        t.steps = withStep(e.group_id)
        update(e.group_id, (s) => ({ ...s, answer: e.metadata }))
      } else if (!t.answers.some((a) => sameAnswer(a, e.metadata))) {
        t.answers = [...t.answers, e.metadata]
      }
      break
    case 'error':
      t.phase = 'error'
      t.error = e.message ? rebrand(e.message) : 'BCD AI ran into a problem.'
      break
    default:
      break
  }
  return t
}

/** Marks the turn finished once the stream closes. */
export const finishTurn = (turn, phase = 'done', error) => ({
  ...turn,
  phase: turn.phase === 'error' ? 'error' : phase,
  error: turn.error ?? error,
  steps: turn.steps.map((s) => ({ ...s, running: false })),
  endedAt: Date.now(),
})
