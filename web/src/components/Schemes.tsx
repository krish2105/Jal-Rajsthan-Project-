"use client";

import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import plan from "@/data/plan.json";
import { fmtLakhCr, fmtInt } from "@/lib/utils";

type SchemeRow = {
  scheme: string;
  label_en: string;
  label_hi: string;
  capLakh: number;
  spentLakh: number;
  utilisationPct: number;
  structures: number;
  overCap: boolean;
};

const SCHEME_COLORS: Record<string, string> = {
  mgnrega: "var(--accent)",
  mjsa: "var(--accent-2)",
  atal_jal: "var(--violet)",
  fc15: "var(--warn)",
};

export function Schemes() {
  const { lang } = useLang();
  const rollup = (plan as unknown as { schemeRollup: SchemeRow[] }).schemeRollup ?? [];

  return (
    <section id="schemes" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="schemes-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {lang === "hi" ? "योजना अभिसरण" : "Scheme convergence"}
        </p>
        <h2 id="schemes-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {lang === "hi" ? "हर संरचना का वित्त-स्रोत, नियम-सम्मत" : "Every structure, funded by the right scheme"}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-2)]">
          {lang === "hi"
            ? "अभिसरण घोषित नीति-लक्ष्य है, पर उसका कोई टूल नहीं। JAL हर नियोजित संरचना को मनरेगा / MJSA 2.0 / अटल भूजल / 15वें वित्त आयोग में से अनुमत योजना पर आवंटित करता है — प्रत्येक की सीमा और पात्रता-नियमों के भीतर। नियम विन्यास-योग्य हैं (config/structures.yaml), आँकड़े नहीं।"
            : "Convergence of schemes is stated policy with no tooling behind it. JAL assigns every planned structure to MGNREGA / MJSA 2.0 / Atal Bhujal / 15th-FC within each scheme's admissible works and budget caps — rules are editable policy config, not hard-coded facts."}
        </p>
      </motion.div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {rollup.map((s, i) => {
          const color = SCHEME_COLORS[s.scheme] ?? "var(--text-2)";
          return (
            <motion.div
              key={s.scheme}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold" style={{ color }}>
                  {lang === "hi" ? s.label_hi : s.label_en}
                </h3>
                {s.overCap && (
                  <span className="rounded bg-[color:var(--danger)]/15 px-2 py-0.5 text-[10px] font-medium text-[color:var(--danger)]">
                    {lang === "hi" ? "सीमा से अधिक — पुनरावंटन आवश्यक" : "over cap — needs reallocation"}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--text-3)]/15">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(s.utilisationPct, 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <span className="font-[family-name:var(--font-mono)] text-sm font-bold tabular-nums" style={{ color }}>
                  {s.utilisationPct}%
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dd className="font-[family-name:var(--font-mono)] text-sm font-bold">{fmtLakhCr(s.spentLakh)}</dd>
                  <dt className="text-[10px] text-[color:var(--text-3)]">{lang === "hi" ? "आवंटित" : "allocated"}</dt>
                </div>
                <div>
                  <dd className="font-[family-name:var(--font-mono)] text-sm font-bold">{fmtLakhCr(s.capLakh)}</dd>
                  <dt className="text-[10px] text-[color:var(--text-3)]">{lang === "hi" ? "सीमा" : "cap"}</dt>
                </div>
                <div>
                  <dd className="font-[family-name:var(--font-mono)] text-sm font-bold">{fmtInt(s.structures)}</dd>
                  <dt className="text-[10px] text-[color:var(--text-3)]">{lang === "hi" ? "संरचनाएँ" : "structures"}</dt>
                </div>
              </dl>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
