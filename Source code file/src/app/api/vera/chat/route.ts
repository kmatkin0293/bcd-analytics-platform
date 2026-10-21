import Anthropic from "@anthropic-ai/sdk";

import { THOUGHTSPOT_MODEL_ID } from "@/config";
import { env } from "@/env";
import { getThoughtSpotSession } from "@/lib/thoughtspot-session";
import {
  buildVeraSystemPrompt,
  extractIframeUrl,
  extractThinkingChunks,
  humanizeVeraToolName,
  VERA_MAX_TOKENS,
  VERA_MCP_BETA,
  VERA_MCP_SERVER_NAME,
  VERA_MCP_SERVER_URL,
  VERA_MODEL,
  VERA_TOOL_CONFIGS,
} from "@/lib/vera";
import type { VeraStreamEvent } from "@/lib/vera-protocol";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const session = await getThoughtSpotSession();
  if (!session) {
    return new Response("Not authenticated", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: Anthropic.Beta.BetaMessageParam[];
  } | null;

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("messages is required", { status: 400 });
  }

  const host = new URL(env.NEXT_PUBLIC_THOUGHTSPOT_HOST).host;
  const encoder = new TextEncoder();
  const messages = [...body.messages];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: VeraStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const seenIframeUrls = new Set<string>();

      try {
        // Loop to auto-resume if a long tool-polling turn hits `pause_turn`.
        while (true) {
          const mcpStream = client.beta.messages.stream({
            model: VERA_MODEL,
            max_tokens: VERA_MAX_TOKENS,
            betas: [VERA_MCP_BETA],
            system: buildVeraSystemPrompt(THOUGHTSPOT_MODEL_ID),
            mcp_servers: [
              {
                type: "url",
                url: VERA_MCP_SERVER_URL,
                name: VERA_MCP_SERVER_NAME,
                authorization_token: `${session.token}@${host}`,
              },
            ],
            tools: [
              {
                type: "mcp_toolset",
                mcp_server_name: VERA_MCP_SERVER_NAME,
                default_config: { enabled: false },
                configs: VERA_TOOL_CONFIGS,
              },
            ],
            messages,
          });

          for await (const event of mcpStream) {
            if (event.type !== "content_block_start") {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                send({ type: "text", text: event.delta.text });
              }
              continue;
            }

            if (event.content_block.type === "mcp_tool_use") {
              // get_session_updates is polled repeatedly, and each poll's
              // result carries real "thinking" narration (below) — sending
              // this generic label on every one of those polls would just
              // keep clobbering that narration the instant it lands.
              if (event.content_block.name !== "get_session_updates") {
                send({
                  type: "status",
                  text: humanizeVeraToolName(event.content_block.name),
                });
              }
            } else if (
              event.content_block.type === "mcp_tool_result" &&
              !event.content_block.is_error
            ) {
              // MCP tool results arrive whole in content_block_start (they're
              // not model-generated tokens, so there's no delta to wait for)
              // — extracting here, per poll, is what makes narration live
              // instead of arriving as one batch after the whole turn ends.
              for (const chunk of extractThinkingChunks(
                event.content_block.content,
              )) {
                send({ type: "thinking", kind: chunk.kind, text: chunk.text });
              }

              const url = extractIframeUrl(event.content_block.content);
              if (url && !seenIframeUrls.has(url)) {
                seenIframeUrls.add(url);
                send({ type: "iframe", url });
              }
            }
          }

          const finalMessage = await mcpStream.finalMessage();
          messages.push({ role: "assistant", content: finalMessage.content });

          if (finalMessage.stop_reason === "pause_turn") {
            continue;
          }
          break;
        }

        send({ type: "done", messages });
      } catch (error) {
        console.error("Vera chat error", error);
        send({
          type: "error",
          message: "Vera hit an error. Try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
