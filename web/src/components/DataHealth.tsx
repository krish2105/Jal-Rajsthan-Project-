"use client";

import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";

const ROWS = [
  { en: "CGWB categorization PDFs (6 rounds)", hi: "CGWB श्रेणीकरण PDF (6 चक्र)", status: "ok", note: "302=219/22/20/38/3 ✓" },
  { en: "INGRES verified assessments", hi: "INGRES सत्यापित आकलन", status: "ok", note: "counts match PDFs ✓" },
  { en: "Official block geometry (WFS)", hi: "आधिकारिक ब्लॉक ज्यामिति", status: "ok", note: "597 polygons, 2 vintages" },
  { en: "Census 2011 population", hi: "जनगणना 2011", status: "ok", note: "68,548,437 = official ✓" },
  { en: "Reconciliation", hi: "मिलान", status: "ok", note: "1,792 rows · 0 unmatched" },
  { en: "GEC-2015 RAG corpus", hi: "GEC-2015 RAG कॉर्पस", status: "ok", note: "2,128 chunks · eval 92%" },
  { en: "Sentinel-2 verification", hi: "Sentinel-2 सत्यापन", status: "ok", note: "3 sites, live COG reads" },
  { en: "CGWB station depths (bulk mirror)", hi: "CGWB स्टेशन गहराई", status: "ok", note: "1,394 stations · 79% block coverage" },
  { en: "WRIS live feed", hi: "WRIS लाइव फ़ीड", status: "pending", note: "portal down — harness ready; COVID '20-21 gap documented" },
] as const;

export function DataHealth() {
  const { lang } = useLang();
  return (
    <section id="datahealth" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20" aria-labelledby="dh-title">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55 }}
        className="glass rounded-2xl p-5">
        <h3 id="dh-title" className="text-sm font-bold text-[color:var(--accent)]">
          {lang === "hi" ? "🩺 डेटा स्वास्थ्य व उद्गम" : "🩺 Data health & provenance"}
        </h3>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {ROWS.map((r) => (
            <li key={r.en} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[color:var(--accent)]/5">
              <span className="flex items-center gap-2">
                <span className={r.status === "ok" ? "text-[color:var(--ok)]" : "text-[color:var(--warn)]"}>
                  {r.status === "ok" ? "●" : "◐"}
                </span>
                {lang === "hi" ? r.hi : r.en}
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--text-3)]">{r.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-[color:var(--text-3)]">
          {lang === "hi"
            ? "हर स्रोत का URL व SHA-256 चेकसम भंडार में दर्ज — data/raw/*/SOURCE.md"
            : "every source's URL and SHA-256 checksum committed — data/raw/*/SOURCE.md"}
        </p>
      </motion.div>
    </section>
  );
}
