"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import { API_BASE, sseEvents } from "@/lib/agents";
import replays from "@/data/replays.json";
import plan from "@/data/plan.json";
import { prettyBlock } from "@/lib/utils";

const PLAN_BLOCKS = (plan.rows as { name: string }[]).map((r) => r.name).slice(0, 25);

export function WSPStudio() {
  const { lang } = useLang();

  const samples = (replays as unknown as { wsp?: Record<string, string> }).wsp ?? {};

  /* Same rule as the agent theatre: never list a block whose plan we cannot
     produce. Without the local API only recorded drafts can be shown, and
     handing back a different block's water-security plan is worse than
     saying so. */
  const options = useMemo(() => {
    const recorded = Object.keys(samples);
    if (!API_BASE) return recorded.length ? recorded : PLAN_BLOCKS.slice(0, 1);
    return [...new Set([...recorded, ...PLAN_BLOCKS])];
  }, [samples]);

  const [block, setBlock] = useState(options[0] ?? "Talwara");
  const [doc, setDoc] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setDoc(null);
    setErr(null);
    setRecorded(false);
    try {
      if (!API_BASE) throw new Error("no-api");
      const res = await fetch(
        `${API_BASE}/api/wsp/${encodeURIComponent(block)}?language=${lang === "hi" ? "Hindi" : "English"}`
      );
      if (!res.ok || !res.body) throw new Error("no-api");
      for await (const ev of sseEvents(res)) {
        if (ev.type === "final") {
          setDoc(ev.document as string);
          setRecorded(Boolean(ev.recorded));
        } else if (ev.type === "error") setErr(ev.message as string);
      }
    } catch {
      const sample = samples[block];
      if (sample) {
        setDoc(sample);
        setRecorded(true);
      } else {
        setErr(
          lang === "hi"
            ? `${prettyBlock(block)} के लिए कोई रिकॉर्डेड मसौदा नहीं — किसी भी ब्लॉक के लिए लोकल API चलाएँ।`
            : `No recorded draft for ${prettyBlock(block)} — start the local API to draft any block live.`
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function printDoc() {
    if (!doc) return;
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>WSP — ${block}</title>
      <meta charset="utf-8"/>
      <style>
        body{font-family:Georgia,'Noto Sans Devanagari',serif;max-width:680px;margin:40px auto;line-height:1.7;color:#111}
        h1{font-size:20px;border-bottom:2px solid #0e7490;padding-bottom:8px}
        .meta{color:#555;font-size:12px;margin-bottom:24px}
        pre{white-space:pre-wrap;font-family:inherit;font-size:14px}
      </style></head><body>
      <h1>जल सुरक्षा योजना / Water Security Plan — ${block}</h1>
      <div class="meta">JAL · Rajasthan Groundwater Intelligence · draft for Gram Sabha review · ${new Date().toLocaleDateString("en-IN")}</div>
      <pre>${doc.replace(/</g, "&lt;")}</pre>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <section id="wsp" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="wsp-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {lang === "hi" ? "WSP स्टूडियो · अटल भूजल योजना" : "WSP Studio · Atal Bhujal Yojana"}
        </p>
        <h2 id="wsp-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {lang === "hi" ? "जल सुरक्षा योजना — मिनटों में मसौदा" : "Water Security Plans — drafted in minutes"}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-2)]">
          {lang === "hi"
            ? "अटल भूजल योजना हर क्षेत्र के लिए WSP माँगती है — हज़ारों दस्तावेज़, हाथ से बनते हैं। JAL साक्ष्य-पैक (प्रोफ़ाइल, जल-बजट, प्रस्तावित कार्य व वित्त-स्रोत) से मसौदा तैयार करता है; अधिकारी संपादित कर अनुमोदित करते हैं। हर संख्या मॉडल-प्रमाणित।"
            : "Atal Bhujal Yojana requires a Water Security Plan per area — thousands of documents, written by hand today. JAL drafts each from the evidence pack (profile, water budget, proposed works with funding schemes); officials edit and approve. Every number is model-evidenced."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            aria-label="Block"
            className="glass-lite rounded-xl px-3 py-2 text-sm outline-none"
          >
            {options.map((b) => (
              <option key={b} value={b}>{prettyBlock(b)}</option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--on-accent)] transition-transform hover:scale-[1.03] disabled:opacity-50"
          >
            {busy ? (lang === "hi" ? "मसौदा बन रहा है…" : "Drafting…") : lang === "hi" ? "📄 WSP मसौदा बनाएँ" : "📄 Draft the WSP"}
          </button>
          {doc && (
            <button
              onClick={printDoc}
              className="glass rounded-xl px-4 py-2.5 text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--accent)]/40"
            >
              {lang === "hi" ? "🖨 प्रिंट / PDF" : "🖨 Print / PDF"}
            </button>
          )}
          {recorded && (
            <span className="rounded bg-[color:var(--warn)]/15 px-2 py-1 text-[11px] text-[color:var(--warn)]">
              {lang === "hi" ? "रिकॉर्डेड वास्तविक मसौदा" : "recorded real draft"}
            </span>
          )}
        </div>
      </motion.div>

      {err && (
        <p className="mt-6 rounded-xl border border-[color:var(--warn)]/30 bg-[color:var(--warn)]/8 px-4 py-3 text-sm text-[color:var(--warn)]">
          {err}
        </p>
      )}
      {doc && (
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mt-6 max-w-3xl rounded-2xl p-6"
        >
          <pre className="font-[family-name:var(--font-sans)] text-sm leading-relaxed whitespace-pre-wrap">{doc}</pre>
        </motion.article>
      )}
    </section>
  );
}
