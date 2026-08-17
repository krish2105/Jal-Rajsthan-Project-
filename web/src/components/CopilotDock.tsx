"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "@/lib/i18n";
import { chatStream, replayEvents, type AgentEvent } from "@/lib/agents";
import replays from "@/data/replays.json";

type Msg =
  | { kind: "user"; text: string }
  | { kind: "tool"; tool: string; args: Record<string, unknown> }
  | { kind: "answer"; text: string; recorded?: boolean; audit?: { cited_evidence: boolean; unevidenced_numbers: string[] } }
  | { kind: "error"; text: string };

const SUGGESTIONS = {
  en: [
    "Which blocks are most likely to worsen next year?",
    "Give me the current groundwater picture for Rajasthan.",
    "What happens to the plan if the budget is cut to 300 crore?",
    "What does GEC-2015 say about how blocks are categorized?",
  ],
  hi: ["राजस्थान में भूजल की वर्तमान स्थिति क्या है?"],
};

function pickReplay(message: string): AgentEvent[] | null {
  const chat = (replays as { chat: Record<string, AgentEvent[]> }).chat ?? {};
  const q = new Set(message.toLowerCase().split(/\s+/));
  let best: AgentEvent[] | null = null;
  let bestScore = 0.12;
  for (const [key, events] of Object.entries(chat)) {
    const k = key.toLowerCase().split(/\s+/);
    const score = k.filter((w) => q.has(w)).length / (k.length + 1);
    if (score > bestScore) {
      best = events;
      bestScore = score;
    }
  }
  return best;
}

export function CopilotDock() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [live, setLive] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function ask(message: string) {
    if (busy || !message.trim()) return;
    setBusy(true);
    setInput("");
    setMsgs((m) => [...m, { kind: "user", text: message }]);
    const push = (msg: Msg) => setMsgs((m) => [...m, msg]);

    const handle = (ev: AgentEvent) => {
      if (ev.type === "tool_call")
        push({ kind: "tool", tool: ev.tool as string, args: (ev.args as Record<string, unknown>) ?? {} });
      else if (ev.type === "text")
        push({
          kind: "answer",
          text: ev.text as string,
          recorded: Boolean(ev.recorded),
          audit: ev.audit as { cited_evidence: boolean; unevidenced_numbers: string[] } | undefined,
        });
      else if (ev.type === "error") push({ kind: "error", text: ev.message as string });
    };

    try {
      for await (const ev of chatStream(message)) handle(ev);
      setLive(true);
    } catch {
      setLive(false);
      const rec = pickReplay(message);
      if (rec) {
        for await (const ev of replayEvents(rec)) handle(ev);
      } else {
        push({
          kind: "error",
          text:
            lang === "hi"
              ? "लाइव AI उपलब्ध नहीं है। रिकॉर्ड किए गए उदाहरण प्रश्न आज़माएँ, या लोकल API के साथ चलाएँ।"
              : "Live AI isn't reachable here. Try a suggested question (recorded runs), or run the local API for live answers.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => setOpen(true)}
        aria-label="Open Policy Copilot"
        className="fixed right-5 bottom-5 z-[70] flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-2xl shadow-lg shadow-[color:var(--accent)]/25 transition-transform hover:scale-105 active:scale-95"
      >
        💧
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Policy Copilot"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass fixed right-4 bottom-4 z-[71] flex h-[min(620px,85vh)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-[color:var(--bg-elev)]/95"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--surface-border)] px-4 py-3">
              <div>
                <div className="font-[family-name:var(--font-display)] font-bold">
                  {lang === "hi" ? "नीति सहायक" : "Policy Copilot"}
                </div>
                <div className="text-[11px] text-[color:var(--text-3)]">
                  {live === true
                    ? lang === "hi" ? "लाइव · लोकल मॉडल · हर संख्या प्रमाण-सहित" : "live · local model · every number evidenced"
                    : live === false
                      ? lang === "hi" ? "रिकॉर्ड किए गए वास्तविक रन" : "recorded real runs (no live LLM here)"
                      : lang === "hi" ? "हर संख्या प्रमाण-सहित" : "every number traces to a model tool"}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1 text-[color:var(--text-3)] hover:bg-[color:var(--text-3)]/10 hover:text-[color:var(--text)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--text-2)]">
                    {lang === "hi"
                      ? "भूजल जोखिम, पूर्वानुमान या निवेश-योजना के बारे में पूछिए:"
                      : "Ask about groundwater risk, forecasts, or the investment plan:"}
                  </p>
                  {[...SUGGESTIONS.en, ...SUGGESTIONS.hi].map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="glass-lite block w-full rounded-xl px-3 py-2 text-left text-xs text-[color:var(--accent-2)] transition-colors hover:border-[color:var(--accent)]/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => {
                if (m.kind === "user")
                  return (
                    <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-[color:var(--accent)]/15 px-3.5 py-2.5 text-sm">
                      {m.text}
                    </div>
                  );
                if (m.kind === "tool")
                  return (
                    <div key={i} className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--text-3)]">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--accent)]" />
                      {m.tool}({Object.entries(m.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})
                    </div>
                  );
                if (m.kind === "answer")
                  return (
                    <div key={i} className="glass-lite mr-4 space-y-2 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed">
                      <div className="whitespace-pre-wrap">{m.text}</div>
                      <div className="flex flex-wrap gap-1.5 border-t border-[color:var(--surface-border)] pt-2 text-[10px]">
                        {m.recorded && (
                          <span className="rounded bg-[color:var(--warn)]/15 px-1.5 py-0.5 text-[color:var(--warn)]">
                            {lang === "hi" ? "रिकॉर्डेड रन" : "recorded run"}
                          </span>
                        )}
                        {m.audit?.cited_evidence && (
                          <span className="rounded bg-[color:var(--ok)]/15 px-1.5 py-0.5 text-[color:var(--ok)]">
                            {lang === "hi" ? "प्रमाण-सहित" : "evidence-cited"}
                          </span>
                        )}
                        {m.audit && m.audit.unevidenced_numbers.length > 0 && (
                          <span className="rounded bg-[color:var(--danger)]/15 px-1.5 py-0.5 text-[color:var(--danger)]">
                            {lang === "hi" ? "अप्रमाणित संख्या: " : "unevidenced: "}
                            {m.audit.unevidenced_numbers.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                return (
                  <div key={i} className="rounded-xl border border-[color:var(--warn)]/30 bg-[color:var(--warn)]/8 px-3 py-2 text-xs text-[color:var(--warn)]">
                    {m.text}
                  </div>
                );
              })}
              {busy && (
                <div className="flex gap-1 px-1" aria-label="thinking">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1.1, delay: d * 0.18 }}
                      className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]"
                    />
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex gap-2 border-t border-[color:var(--surface-border)] p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={lang === "hi" ? "प्रश्न पूछें…" : "Ask a question…"}
                className="glass-lite flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[color:var(--text-3)] focus:border-[color:var(--accent)]/50"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-xl bg-[color:var(--accent)] px-4 text-sm font-bold text-[#04202a] disabled:opacity-40"
              >
                →
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
