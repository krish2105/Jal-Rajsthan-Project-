"use client";

import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import plan from "@/data/plan.json";
import verify from "@/data/works_verify.json";
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="glass mt-6 rounded-2xl p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-[color:var(--teal)]">
            🛰 {lang === "hi" ? "उपग्रह सत्यापन (Sentinel-2 NDWI)" : "Satellite verification (Sentinel-2 NDWI)"}
          </h3>
          <span className="text-[10px] text-[color:var(--text-3)]">
            {lang === "hi" ? "मानसून-पूर्व बनाम पश्चात · मुक्त Copernicus डेटा" : "pre- vs post-monsoon · open Copernicus data"}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[color:var(--text-3)]">
          {lang === "hi"
            ? "क्या बनी संरचनाओं में सच में पानी रुका? शीर्ष योजना-ब्लॉकों के केंद्र-बिंदु पर 1.6 किमी विंडो में जल-पिक्सेल अंश — उत्पादन संस्करण सटीक संरचना-निर्देशांक सत्यापित करेगा।"
            : "Did built structures actually hold water? Water-pixel fraction over a 1.6 km window at top plan-block centroids — the production version verifies exact structure coordinates."}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(verify.sites as {block:string;district:string;preDate:string;postDate:string;preWaterPct:number;postWaterPct:number;deltaPct:number}[]).map((v) => (
            <div key={v.block} className="glass-lite rounded-xl p-3">
              <div className="text-sm font-semibold">{v.block}
                <span className="ml-1 text-[10px] font-normal text-[color:var(--text-3)]">{v.district}</span>
              </div>
              <div className="mt-1.5 font-[family-name:var(--font-mono)] text-xs tabular-nums text-[color:var(--text-2)]">
                {v.preDate}: {v.preWaterPct}% → {v.postDate}: {v.postWaterPct}%
              </div>
              <div className={`mt-1 font-[family-name:var(--font-mono)] text-sm font-bold ${v.deltaPct > 0 ? "text-[color:var(--ok)]" : "text-[color:var(--text-3)]"}`}>
                Δ {v.deltaPct > 0 ? "+" : ""}{v.deltaPct} pts
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="glass mt-6 rounded-2xl p-5"
      >
        <h3 className="text-sm font-bold text-[color:var(--warn)]">
          📋 {lang === "hi" ? "अटल भूजल DLI तत्परता" : "Atal Bhujal DLI readiness"}
        </h3>
        <p className="mt-1 text-xs text-[color:var(--text-3)]">
          {lang === "hi" ? "संवितरण-सम्बद्ध संकेतक — आकलन आने से पहले प्रक्षेपित" : "disbursement-linked indicators — projected before the assessment lands"}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { en: "DLI#5 GW-level improvement", hi: "DLI#5 भूजल-स्तर सुधार", v: lang === "hi" ? "+4 ब्लॉक शुद्ध सुधार (24→25)" : "+4 blocks net improvement (24→25)", ok: true },
            { en: "Water budgeting coverage", hi: "जल-बजट कवरेज", v: lang === "hi" ? "302/302 ब्लॉक पैनल में" : "302/302 blocks budgeted in panel", ok: true },
            { en: "WSP preparation", hi: "WSP तैयारी", v: lang === "hi" ? "AI-मसौदा प्रणाली सक्रिय" : "AI drafting system operational", ok: true },
            { en: "Works verification", hi: "कार्य-सत्यापन", v: lang === "hi" ? "उपग्रह-पाइपलाइन सिद्ध, विस्तार शेष" : "satellite pipeline proven, rollout pending", ok: false },
          ].map((d) => (
            <li key={d.en} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs">
              <span>{d.ok ? "✅" : "◐"} {lang === "hi" ? d.hi : d.en}</span>
              <span className="text-[10px] text-[color:var(--text-3)]">{d.v}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
