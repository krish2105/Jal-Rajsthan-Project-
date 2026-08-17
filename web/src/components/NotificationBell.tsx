"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "@/lib/i18n";
import { API_BASE } from "@/lib/agents";
import anomalies from "@/data/anomalies.json";
import blocks from "@/data/blocks.json";

type Note = { kind: string; severity: string; title: string; detail: string };

function offlineFeed(hi: boolean): Note[] {
  const a = (anomalies as { block: string; district: string; stageDelta: number | null; depthTrend: number | null }[]).slice(0, 5);
  const watch = (Object.values(blocks) as { name: string; district: string; pWorsens: number | null }[])
    .filter((b) => b.pWorsens != null).sort((x, y) => y.pWorsens! - x.pWorsens!).slice(0, 4);
  return [
    ...a.map((x) => ({
      kind: "anomaly", severity: "high",
      title: hi ? `${x.block} (${x.district}) असामान्य` : `${x.block} (${x.district}) flagged anomalous`,
      detail: hi ? `स्तर Δ ${x.stageDelta ?? "–"} · गहराई ${x.depthTrend ?? "–"} मी/वर्ष`
                 : `stage Δ ${x.stageDelta ?? "–"} · depth ${x.depthTrend ?? "–"} m/yr`,
    })),
    ...watch.map((w) => ({
      kind: "watchlist", severity: "medium",
      title: hi ? `${w.name} की श्रेणी बिगड़ सकती है` : `${w.name} may worsen category`,
      detail: `P = ${Math.round((w.pWorsens ?? 0) * 100)}% · ${w.district}`,
    })),
    { kind: "data", severity: "low",
      title: hi ? "डेटा GWRA 2025 तक अद्यतन" : "Data current to GWRA 2025",
      detail: hi ? "अगला ऑटोपायलट रन GWRA 2026 पर" : "next autopilot run on GWRA 2026" },
  ];
}

const DOT: Record<string, string> = {
  high: "var(--danger)", medium: "var(--warn)", low: "var(--text-3)",
};

export function NotificationBell() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (API_BASE) {
        try {
          const r = await fetch(`${API_BASE}/api/notifications`);
          if (r.ok) { const d = await r.json(); if (!cancelled && Array.isArray(d) && d.length) { setNotes(d); return; } }
        } catch { /* offline feed below */ }
      }
      if (!cancelled) setNotes(offlineFeed(lang === "hi"));
    })();
    return () => { cancelled = true; };
  }, [lang]);

  const high = notes.filter((n) => n.severity === "high").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={lang === "hi" ? "सूचनाएँ" : "Notifications"}
        aria-expanded={open}
        className="glass relative rounded-full px-3 py-1.5 text-sm"
      >
        🔔
        {high > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--danger)] px-1 text-[10px] font-bold text-white">
            {high}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="glass absolute right-0 z-[80] mt-2 max-h-[70vh] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-[color:var(--bg-elev)]/97 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">{lang === "hi" ? "सूचना केंद्र" : "Notification centre"}</span>
              <span className="text-[10px] text-[color:var(--text-3)]">
                {lang === "hi" ? "मॉडल-जनित" : "model-generated"}
              </span>
            </div>
            <ul className="space-y-1.5">
              {notes.map((n, i) => (
                <li key={i} className="glass-lite rounded-xl p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[n.severity] ?? "var(--text-3)" }} />
                    <div>
                      <div className="text-xs font-medium leading-snug">{n.title}</div>
                      <div className="mt-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--text-3)]">{n.detail}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
