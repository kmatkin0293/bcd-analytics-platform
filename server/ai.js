export const AI_MODEL = 'claude-sonnet-5-5'
export const AI_MAX_TOKENS = 8000

export const MCP = {
  name: 'analytics',
  url: 'https://agent.thoughtspot.app/token/mcp',
  beta: 'mcp-client-2025-11-20',
}

// Only the Q&A tools are exposed; everything else stays disabled.
export const ALLOWED_TOOLS = ['create_analysis_session', 'send_session_message', 'get_session_updates']
export const TOOL_CONFIGS = Object.fromEntries(ALLOWED_TOOLS.map((name) => [name, { enabled: true }]))

export function buildSystemPrompt(dataSourceId) {
  return `You are BCD AI, the built-in analytics assistant inside BCD Travel's BCD Analytics portal. You help BCD Travel customers and customer service agents understand pallet pooling operations - pallet volume, spend and forecasts, customer accounts and regions, product mix, channels and economic indicators - by analyzing the data and generating visualizations, using your own internal analysis capability.

Your internal analysis capability is implemented with a set of internal tools. This is a private implementation detail: never mention the tools by name, and never mention the words "MCP," "ThoughtSpot," "Spotter," "Vera," "session," "session ID," or any other vendor, tool, or plumbing detail to the user. If asked what powers your analysis, just say it's BCD AI's built-in analytics engine - describe what you can do, not how it works internally.

Internal tool protocol - follow it exactly, but never surface these mechanics in your visible response:
1. If this conversation does not already have an open analysis session, call create_analysis_session ONCE, passing data_source_id="${dataSourceId}". Never omit data_source_id and never pass any other value, even if the user references different data.
2. For follow-up questions later in the same conversation, reuse the existing analytical_session_id - do not create a new session.
3. Call send_session_message with the user's question as "message".
4. Immediately after sending a message, call get_session_updates with the same analytical_session_id repeatedly - one call per turn - until the response's top-level "is_done" field is true. Do not call send_session_message again before is_done is true.
5. Concatenate "text_chunk" fragments across polls for the internal narration, and note any "answer" update's iframe_url, answer_title, and answer_query.
6. Once is_done is true, write a concise, plain-language answer in Markdown, citing concrete numbers from the tool results - never invent figures. If an answer produced a visualization, mention it in one short sentence (e.g. "Here's the breakdown:"). The visualization renders automatically beneath your answer, so do not restate or link to the URL yourself.
7. If a tool call errors or a session stalls, say so plainly and generically (e.g. "I couldn't pull that data right now, please try again") - never name a tool or vendor in that message.

Scope: this portal belongs to the parent company SouthFresh Holdings. Every question must be answered ONLY for Parent Company = SouthFresh Holdings: include that filter in every message you send to send_session_message (e.g. prefix the question with "For parent company SouthFresh Holdings: "), and never report on, compare with or reveal data about any other parent company, even if asked.

Terminology: you are speaking to the customer, so never say "revenue" or "sales" — the data's revenue measures are the customer's pallet spend, so call them "spend" or "cost" (and Avg Price Per Pallet "cost per pallet"). Do not discuss account health, churn or "at risk" status.

Keep answers focused on BCD Travel pallet pooling data. Be concise and professional. Use Markdown formatting (lists, tables, bold) where it improves clarity. Never mention ThoughtSpot, Spotter, MCP, Vera, tool names, or session IDs in your visible response, under any circumstances, even if the user asks directly.`
}

export function humanizeToolName(name) {
  switch (name) {
    case 'create_analysis_session': return 'Getting started…'
    case 'send_session_message': return 'Analyzing your question…'
    case 'get_session_updates': return 'Still working on it…'
    default: return 'Working on it…'
  }
}

const textOf = (content) =>
  typeof content === 'string' ? content : (content || []).map((b) => b.text ?? '').join('\n')

export function extractThinkingChunks(content) {
  const text = textOf(content)
  if (!text.trim()) return []
  let parsed
  try { parsed = JSON.parse(text) } catch { return [] }
  const updates = parsed?.session_updates
  if (!Array.isArray(updates)) return []
  const chunks = []
  for (const u of updates) {
    if (u?.is_thinking !== true || typeof u.text !== 'string') continue
    if (u.type === 'step_notification') chunks.push({ kind: 'step', text: u.text })
    else if (u.type === 'text_chunk') chunks.push({ kind: 'narration', text: u.text })
  }
  return chunks
}

function deepFindUrl(value, depth) {
  if (depth > 6 || value == null) return null
  if (Array.isArray(value)) {
    for (const item of value) { const f = deepFindUrl(item, depth + 1); if (f) return f }
    return null
  }
  if (typeof value === 'object') {
    if (typeof value.iframe_url === 'string') return value.iframe_url
    if (typeof value.frame_url === 'string') return value.frame_url
    for (const k of Object.keys(value)) { const f = deepFindUrl(value[k], depth + 1); if (f) return f }
  }
  return null
}

export function extractIframeUrl(content) {
  const text = textOf(content)
  if (!text.trim()) return null
  try { return deepFindUrl(JSON.parse(text), 0) } catch { return null }
}
