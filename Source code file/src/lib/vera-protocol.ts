/** NDJSON event contract between POST /api/vera/chat and the browser. */
export type VeraStreamEvent =
  | { type: "status"; text: string }
  | { type: "thinking"; kind: "step" | "narration"; text: string }
  | { type: "text"; text: string }
  | { type: "iframe"; url: string }
  | { type: "done"; messages: unknown[] }
  | { type: "error"; message: string };
