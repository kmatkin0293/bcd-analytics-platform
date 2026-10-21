// A minimal client for the analytics agent behind BCD AI (ThoughtSpot's Spotter MCP Server): JSON-RPC over
// MCP's streamable HTTP, no SDK. The tools are designed for an AI assistant, but their contract is plain JSON,
// so Dashboard Labs drives them itself.
//
// Requests go through this app's own server (/api/ts-mcp), which adds the token: the browser never holds one,
// and the same token serves the whole visit (the server keeps designer tasks and analysis sessions under it).

const ENDPOINT = '/api/ts-mcp'
const PROTOCOL_VERSION = '2025-06-18'

/** Dashboard Labs keeps each conversation for the tab under this prefix. */
export const LABS_STORE_PREFIX = 'bcd.labs.'

export class McpError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

let session = null
let nextId = 1

/** A JSON-RPC reply, from either a JSON body or a server-sent event stream. */
async function readReply(res, id) {
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('application/json')) return res.json()
  if (!type.includes('text/event-stream') || !res.body) return null
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    let at
    while ((at = buffer.indexOf('\n\n')) >= 0) {
      const data = buffer.slice(0, at).split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
      buffer = buffer.slice(at + 2)
      if (!data) continue
      const msg = JSON.parse(data)
      // Progress notifications share the stream; wait for our reply.
      if (msg.id === id) {
        void reader.cancel()
        return msg
      }
    }
    if (done) return null
  }
}

function post(body, sessionId) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'mcp-protocol-version': PROTOCOL_VERSION }
  if (sessionId) headers['mcp-session-id'] = sessionId
  return fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) })
}

const NO_SERVER = 'BCD AI can’t reach the analytics agent: the API server isn’t running. Restart it (npm run dev), then retry.'

async function rpc(method, params, sessionId) {
  const id = nextId++
  let res
  try {
    res = await post({ jsonrpc: '2.0', id, method, params }, sessionId)
  } catch {
    throw new McpError(NO_SERVER)
  }
  if ((res.headers.get('content-type') ?? '').includes('text/html')) throw new McpError(NO_SERVER, res.status)
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200)
    throw new McpError(res.status === 401 ? 'The analytics service didn’t accept the connection. Reload and retry.' : `The analytics agent answered ${res.status}. ${detail}`, res.status)
  }
  const reply = await readReply(res, id)
  if (!reply) throw new McpError('The analytics agent sent no reply.')
  if (reply.error) throw new McpError(reply.error.message)
  return { result: reply.result, sessionId: res.headers.get('mcp-session-id') }
}

function connect() {
  session ??= (async () => {
    const init = await rpc('initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'bcd-analytics', version: '1.0.0' } }, null)
    const id = init.sessionId
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, id)
    const listed = await rpc('tools/list', {}, id)
    return { id, tools: listed.result.tools }
  })().catch((err) => {
    session = null
    throw err
  })
  return session
}

/** Drops the connection and any conversation built on it. */
export function forgetMcpSession() {
  session = null
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(LABS_STORE_PREFIX)) sessionStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing was kept.
  }
}

/** The tools this user gets: some depend on their privileges (get_data needs Can download data). */
export async function listTools() {
  return (await connect()).tools
}

/** Calls a tool and returns its structured result. Reconnects once if the server dropped the session. */
export async function callTool(name, args, retried = false) {
  const { id } = await connect()
  let result
  try {
    result = (await rpc('tools/call', { name, arguments: args }, id)).result
  } catch (err) {
    if (!retried && err instanceof McpError && err.status === 404) {
      session = null
      return callTool(name, args, true)
    }
    throw err
  }
  const text = result.content?.find((c) => c.type === 'text')?.text ?? ''
  if (result.isError) throw new McpError(text || `${name} failed.`)
  if (result.structuredContent) return result.structuredContent
  try {
    return JSON.parse(text)
  } catch {
    throw new McpError(`${name} returned something unexpected.`)
  }
}

// ---------------------------------------------------------------------------
// The dashboard designer
// ---------------------------------------------------------------------------
// A result is { status: 'completed' | 'in_progress' | 'needs_input' | 'failed', task_id, dashboard_id, dashboard_url,
// changes_applied, message, choices }.

export const createDashboard = (args) => callTool('create_dashboard', args)
export const modifyDashboard = (args) => callTool('modify_dashboard', args)
/** Waits a short while server-side before answering, so it's called in a loop. */
export const dashboardStatus = (taskId) => callTool('get_dashboard_status', { task_id: taskId })
/** The dashboard a result points at: its ID, or the GUID at the end of its URL. */
export const dashboardIdOf = (r) => r.dashboard_id ?? r.dashboard_url?.match(/pinboard\/([0-9a-f-]{36})/i)?.[1]

// ---------------------------------------------------------------------------
// The analytics agent
// ---------------------------------------------------------------------------

export const createAnalysisSession = (dataSourceId) => callTool('create_analysis_session', { data_source_id: dataSourceId }).then((r) => r.analytical_session_id)
export const sendSessionMessage = (sessionId, message) => callTool('send_session_message', { analytical_session_id: sessionId, message })
export const sessionUpdates = (sessionId) => callTool('get_session_updates', { analytical_session_id: sessionId })

// ---------------------------------------------------------------------------
// get_data: the rows behind a saved dashboard
// ---------------------------------------------------------------------------

export const dashboardData = (dashboardId, maxRows = 25) =>
  callTool('get_data', { object_id: dashboardId, object_type: 'LIVEBOARD', max_rows: maxRows }).then((r) => r.data)
