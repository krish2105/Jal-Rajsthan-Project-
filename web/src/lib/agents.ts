"use client";

export type AgentEvent = {
  type: string;
  [k: string]: unknown;
};

export const API_BASE =
  process.env.NEXT_PUBLIC_JAL_API ??
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : null);

/** Parse an SSE stream of `data: {json}` lines into events. */
export async function* sseEvents(res: Response): AsyncGenerator<AgentEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.trim();
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6)) as AgentEvent;
        } catch {
          /* skip malformed frame */
        }
      }
    }
  }
}

export async function* chatStream(message: string): AsyncGenerator<AgentEvent> {
  if (!API_BASE) throw new Error("no-api");
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok || !res.body) throw new Error("no-api");
  yield* sseEvents(res);
}

export async function* pipelineStream(block: string): AsyncGenerator<AgentEvent> {
  if (!API_BASE) throw new Error("no-api");
  const res = await fetch(`${API_BASE}/api/pipeline/${encodeURIComponent(block)}`);
  if (!res.ok || !res.body) throw new Error("no-api");
  yield* sseEvents(res);
}

/** Replay fallback: bundled recorded runs, streamed with realistic pacing. */
export async function* replayEvents(
  events: AgentEvent[],
  pace = 350
): AsyncGenerator<AgentEvent> {
  for (const ev of events) {
    await new Promise((r) => setTimeout(r, ev.type === "text" || ev.type === "agent_output" ? pace * 2 : pace));
    yield ev;
  }
}
