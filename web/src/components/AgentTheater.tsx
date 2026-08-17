"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "@/lib/i18n";
import { pipelineStream, replayEvents, type AgentEvent } from "@/lib/agents";
import replays from "@/data/replays.json";

const AGENT_META: Record<string, { icon: string; en: string; hi: string; color: string }> = {
  hydrologist: { icon: "🌊", en: "Hydrologist", hi: "जलविज्ञानी", color: "var(--accent-2)" },
  economist: { icon: "📊", en: "Economist", hi: "अर्थशास्त्री", color: "var(--accent)" },
  equity: { icon: "⚖️", en: "Equity Auditor", hi: "समानता लेखा-परीक्षक", color: "var(--violet)" },
  writer: { icon: "✍️", en: "Report Writer", hi: "प्रतिवेदक", color: "var(--warn)" },
  critic: { icon: "🔍", en: "Critic", hi: "समीक्षक", color: "var(--danger)" },
};

type Card = { agent: string; text?: string; running?: boolean; verdict?: { accepted: boolean; text: string } };

export function AgentTheater() {
  const { lang } = useLang();
  const [cards, setCards] = useState<Card[]>([]);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState("Talwara");

  const pipelineReplays = (replays as { pipeline: Record<string, AgentEvent[]> }).pipeline ?? {};
  const availableBlocks = Object.keys(pipelineReplays);

  async function run() {
    if (busy) return;
    setBusy(true);
    setCards([]);
    setFinalText(null);
    setRecorded(false);

    const handle = (ev: AgentEvent) => {
      if (ev.type === "agent_start")
        setCards((c) => [...c.map((x) => ({ ...x, running: false })), { agent: ev.agent as string, running: true }]);
      else if (ev.type === "agent_output")
        setCards((c) => {
          const idx = [...c].reverse().findIndex((x) => x.agent === ev.agent && !x.text);
          if (idx === -1) return [...c, { agent: ev.agent as string, text: ev.text as string }];
          const real = c.length - 1 - idx;
          return c.map((x, i) => (i === real ? { ...x, text: ev.text as string, running: false } : x));
        });
      else if (ev.type === "critic_verdict")
        setCards((c) => {
          const last = [...c].reverse().find((x) => x.agent === "critic");
          if (!last) return c;
          return c.map((x) =>
            x === last ? { ...x, running: false, verdict: { accepted: ev.accepted as boolean, text: ev.text as string } } : x
          );
        });
      else if (ev.type === "final") {
        setFinalText(ev.briefing as string);
        setRecorded(Boolean(ev.recorded));
      }
    };

    try {
      for await (const ev of pipelineStream(block)) handle(ev);
    } catch {
      const rec = pipelineReplays[block] ?? Object.values(pipelineReplays)[0];
      if (rec) for await (const ev of replayEvents(rec, 500)) handle(ev);
      else setFinalText(lang === "hi" ? "कोई रिकॉर्डेड रन उपलब्ध नहीं।" : "No recorded run available.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="agents" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="agents-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {lang === "hi" ? "एजेंट पाइपलाइन" : "Agent pipeline"}
        </p>
        <h2 id="agents-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {lang === "hi" ? "पाँच AI विशेषज्ञ, एक ब्रीफ़िंग — तर्क दृश्य में" : "Five AI specialists, one briefing — reasoning in the open"}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-2)]">
          {lang === "hi"
            ? "जलविज्ञानी → अर्थशास्त्री → समानता लेखा-परीक्षक → प्रतिवेदक, और एक समीक्षक जो अप्रमाणित दावों को अस्वीकार करता है। हर संख्या नियतात्मक मॉडलों से आती है; AI केवल समझाता है।"
            : "Hydrologist → Economist → Equity Auditor → Report Writer, with a Critic that rejects unevidenced claims. Every number comes from the deterministic models; the AI only explains."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            aria-label="Block"
            className="glass-lite rounded-xl px-3 py-2 text-sm outline-none"
          >
            {[...new Set([...availableBlocks, "Talwara", "Osian", "Jhotwara", "Kheenvsar"])].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={busy}
            className="rounded-xl bg-[color:var(--violet)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
          >
            {busy
              ? lang === "hi" ? "चल रहा है…" : "Running…"
              : lang === "hi" ? "▶ पाइपलाइन चलाएँ" : "▶ Run the pipeline"}
          </button>
          {recorded && (
            <span className="rounded bg-[color:var(--warn)]/15 px-2 py-1 text-[11px] text-[color:var(--warn)]">
              {lang === "hi" ? "रिकॉर्डेड वास्तविक रन" : "recorded real run"}
            </span>
          )}
        </div>
      </motion.div>

      <div className="mt-8 space-y-3">
        <AnimatePresence>
          {cards.map((c, i) => {
            const meta = AGENT_META[c.agent] ?? { icon: "🤖", en: c.agent, hi: c.agent, color: "var(--text-2)" };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="glass rounded-2xl p-4"
                style={{ borderLeft: `3px solid ${meta.color}`, borderRadius: "0 16px 16px 0" }}
              >
                <div className="flex items-center gap-2 text-sm font-bold" style={{ color: meta.color }}>
                  <span aria-hidden>{meta.icon}</span> {lang === "hi" ? meta.hi : meta.en}
                  {c.running && (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-[11px] font-normal text-[color:var(--text-3)]"
                    >
                      {lang === "hi" ? "विश्लेषण कर रहा है…" : "analysing…"}
                    </motion.span>
                  )}
                </div>
                {c.text && <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[color:var(--text-2)]">{c.text}</p>}
                {c.verdict && (
                  <p className={`mt-2 font-[family-name:var(--font-mono)] text-xs ${c.verdict.accepted ? "text-[color:var(--ok)]" : "text-[color:var(--danger)]"}`}>
                    {c.verdict.text}
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {finalText && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/8 p-5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[color:var(--accent)]">
                {lang === "hi" ? "अंतिम ब्रीफ़िंग" : "Final briefing"} · {block}
              </span>
              <button
                onClick={() => {
                  const w = window.open("", "_blank", "width=800,height=1000");
                  if (!w || !finalText) return;
                  w.document.write(`<!doctype html><html><head><title>Briefing — ${block}</title><meta charset="utf-8"/><style>body{font-family:Georgia,'Noto Sans Devanagari',serif;max-width:680px;margin:40px auto;line-height:1.7;color:#111}h1{font-size:20px;border-bottom:2px solid #7c3aed;padding-bottom:8px}.meta{color:#555;font-size:12px;margin-bottom:24px}pre{white-space:pre-wrap;font-family:inherit;font-size:14px}</style></head><body><h1>Investment Briefing — ${block}</h1><div class="meta">JAL · multi-agent analysis with critic review · ${new Date().toLocaleDateString("en-IN")}</div><pre>${finalText.replace(/</g, "&lt;")}</pre></body></html>`);
                  w.document.close(); w.focus(); w.print();
                }}
                className="glass-lite rounded-lg px-3 py-1 text-xs text-[color:var(--text-2)] hover:text-[color:var(--text)]"
              >
                {lang === "hi" ? "🖨 ब्रीफ़ PDF" : "🖨 Brief PDF"}
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{finalText}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
