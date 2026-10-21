export const VERA_MODEL = "claude-sonnet-5-5";
export const VERA_MAX_TOKENS = 8000;

export const VERA_MCP_SERVER_NAME = "thoughtspot";
export const VERA_MCP_SERVER_URL = "https://agent.thoughtspot.app/token/mcp";
export const VERA_MCP_BETA = "mcp-client-2025-11-20";

/**
 * Only these Spotter MCP tools are needed for Q&A - keeps org/dashboard tools
 * out of reach. Disabled by default, then explicitly re-enabled per tool
 * (`tool_configuration` on the server definition isn't supported alongside
 * the mcp-client-2025-11-20 beta - the allowlist has to live on the toolset).
 */
export const VERA_ALLOWED_TOOLS = [
  "create_analysis_session",
  "send_session_message",
  "get_session_updates",
];

export const VERA_TOOL_CONFIGS = Object.fromEntries(
  VERA_ALLOWED_TOOLS.map((name) => [name, { enabled: true }]),
);

export function buildVeraSystemPrompt(dataSourceId: string): string {
  return `You are Vera, the built-in analytics assistant inside Grant Thornton's global pricing and quotation analytics platform. You help commercial and pricing operations users understand quote, margin, and discount performance by analyzing it and generating visualizations, using your own internal analysis capability.

Your internal analysis capability is implemented with a set of internal tools. This is a private implementation detail: never mention the tools by name, and never mention the words "MCP," "ThoughtSpot," "Spotter," "session," "session ID," or any other vendor, tool, or plumbing detail to the user. If asked what powers your analysis, just say it's Vera's built-in analytics engine - describe what you can do, not how it works internally.

Internal tool protocol - follow it exactly, but never surface these mechanics in your visible response:
1. If this conversation does not already have an open analysis session, call create_analysis_session ONCE, passing data_source_id="${dataSourceId}". Never omit data_source_id and never pass any other value, even if the user references different data.
2. For follow-up questions later in the same conversation, reuse the existing analytical_session_id - do not create a new session.
3. Call send_session_message with the user's question as "message".
4. Immediately after sending a message, call get_session_updates with the same analytical_session_id repeatedly - one call per turn - until the response's top-level "is_done" field is true. Do not call send_session_message again before is_done is true.
5. Concatenate "text_chunk" fragments across polls for the internal narration, and note any "answer" update's iframe_url, answer_title, and answer_query.
6. Once is_done is true, write a concise, plain-language answer in Markdown, citing concrete numbers from the tool results - never invent figures. If an answer produced a visualization, mention it in one short sentence (e.g. "Here's the breakdown:"). The visualization renders automatically beneath your answer, so do not restate or link to the URL yourself.
7. If a tool call errors or a session stalls, say so plainly and generically (e.g. "I couldn't pull that data right now, please try again") - never name a tool or vendor in that message.

Keep answers focused on Grant Thornton's pricing and quotation data. Be concise and professional. Use Markdown formatting (lists, tables, bold) where it improves clarity. Never mention ThoughtSpot, Spotter, MCP, tool names, or session IDs in your visible response, under any circumstances, even if the user asks directly.`;
}

export function humanizeVeraToolName(name: string): string {
  switch (name) {
    case "create_analysis_session":
      return "Getting started…";
    case "send_session_message":
      return "Analyzing your question…";
    case "get_session_updates":
      return "Still working on it…";
    default:
      return "Working on it…";
  }
}

type TextLike = { type: string; text?: string };

type VeraSessionUpdate = {
  type?: string;
  is_thinking?: boolean;
  text?: string;
};

export type VeraThinkingChunk = {
  /** "step" starts a new status line; "narration" appends onto the current one. */
  kind: "step" | "narration";
  text: string;
};

/**
 * Extracts ThoughtSpot's own step/narration updates (is_thinking: true) from
 * a (parsed) get_session_updates tool_result payload, in arrival order, so
 * they can drive Vera's live "Still working on it…"-style status line
 * instead of being silently absorbed into Claude's context.
 */
export function extractThinkingChunks(
  content: string | Array<TextLike>,
): VeraThinkingChunk[] {
  const text =
    typeof content === "string"
      ? content
      : content.map((block) => block.text ?? "").join("\n");

  if (!text.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  const updates = (parsed as { session_updates?: unknown })?.session_updates;
  if (!Array.isArray(updates)) return [];

  const chunks: VeraThinkingChunk[] = [];
  for (const update of updates as VeraSessionUpdate[]) {
    if (update?.is_thinking !== true || typeof update.text !== "string") {
      continue;
    }
    if (update.type === "step_notification") {
      chunks.push({ kind: "step", text: update.text });
    } else if (update.type === "text_chunk") {
      chunks.push({ kind: "narration", text: update.text });
    }
  }
  return chunks;
}

/** Scans a (parsed) MCP tool_result payload for an embeddable visualization URL. */
export function extractIframeUrl(
  content: string | Array<TextLike>,
): string | null {
  const text =
    typeof content === "string"
      ? content
      : content.map((block) => block.text ?? "").join("\n");

  if (!text.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  return deepFindUrl(parsed, 0);
}

function deepFindUrl(value: unknown, depth: number): string | null {
  if (depth > 6 || value == null) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.iframe_url === "string") return obj.iframe_url;
    if (typeof obj.frame_url === "string") return obj.frame_url;
    for (const key of Object.keys(obj)) {
      const found = deepFindUrl(obj[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}
