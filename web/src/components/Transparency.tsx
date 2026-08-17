"use client";

import { motion } from "motion/react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useLang } from "@/lib/i18n";
import evalData from "@/data/eval.json";
import dl from "@/data/dl_benchmark.json";
import copilotEval from "@/data/copilot_eval.json";

export function Transparency() {
  const { t, lang } = useLang();
  const maeData = evalData.m1.testYears.map((y, i) => ({
    year: y,
    persistence: evalData.m1.maePersistence[i],
    challenger: evalData.m1.maeChallenger[i],
  }));
  const recallData = evalData.m1.testYears.map((y, i) => ({
    year: y,
    recall: evalData.m2.macroRecall[i],
    precision50: evalData.m2.precisionTop50[i],
  }));

  const cards = [
    { t: "trans1T", b: "trans1B", badge: "302 = 219+22+20+38+3 ✓", color: "var(--ok)" },
    { t: "trans2T", b: "trans2B", badge: "champion: persistence", color: "var(--accent-2)" },
    { t: "trans3T", b: "trans3B", badge: "5–7× lift @ top-50", color: "var(--violet)" },
  ] as const;

  const tooltipStyle = {
    background: "var(--bg-elev)", border: "1px solid var(--surface-border)",
    borderRadius: 10, fontSize: 12, color: "var(--text)",
  };

  return (
    <section id="transparency" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="trans-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {t("transKicker")}
        </p>
        <h2 id="trans-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {t("transTitle")}
        </h2>
      </motion.div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.article
            key={c.t}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="glass rounded-2xl p-5"
          >
            <span
              className="inline-block rounded-full px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] font-bold"
              style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 12%, transparent)` }}
            >
              {c.badge}
            </span>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-bold">{t(c.t)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-2)]">{t(c.b)}</p>
          </motion.article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          className="glass rounded-2xl p-5"
        >
          <h4 className="mb-3 text-sm font-medium text-[color:var(--text-2)]">{t("maeChart")}</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--text-3)" }} stroke="var(--text-3)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-3)" }} stroke="var(--text-3)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--grid-line)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="persistence" name={t("persistence")} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="challenger" name={t("challenger")} fill="var(--text-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="glass rounded-2xl p-5"
        >
          <h4 className="mb-3 text-sm font-medium text-[color:var(--text-2)]">{t("recallChart")}</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recallData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--text-3)" }} stroke="var(--text-3)" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--text-3)" }} stroke="var(--text-3)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--grid-line)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="recall" name="macro-recall" fill="var(--violet)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="precision50" name="precision@50 (base 0.02)" fill="var(--accent-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {(dl.rows as unknown[]).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.55 }}
          className="glass mt-6 rounded-2xl p-5"
        >
          <h4 className="mb-1 text-sm font-medium text-[color:var(--text-2)]">
            {lang === "hi" ? "गहन शिक्षण बनाम ग्रेडिएंट बूस्टिंग (गहराई पूर्वानुमान)" : "Deep learning vs gradient boosting (depth forecast)"}
          </h4>
          <p className="mb-3 text-[11px] text-[color:var(--text-3)]">
            {lang === "hi"
              ? `समान स्प्लिट्स, समान लक्ष्य · विजेता: ${dl.winner}`
              : `identical splits, identical target · winner: ${dl.winner}`}
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dl.rows as { target_year: number; persistence: number; lightgbm: number; lstm: number; nbeats: number }[]}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                <XAxis dataKey="target_year" tick={{ fontSize: 11, fill: "var(--text-3)" }} stroke="var(--text-3)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-3)" }} stroke="var(--text-3)" unit="m" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--grid-line)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="persistence" name="persistence" fill="var(--text-3)" radius={[3,3,0,0]} />
                <Bar dataKey="lightgbm" name="LightGBM" fill="var(--accent)" radius={[3,3,0,0]} />
                <Bar dataKey="lstm" name="LSTM" fill="var(--violet)" radius={[3,3,0,0]} />
                <Bar dataKey="nbeats" name="N-BEATS" fill="var(--warn)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {copilotEval.cases > 0 && (
            <p className="mt-3 border-t border-[color:var(--surface-border)] pt-2 text-[11px] text-[color:var(--text-3)]">
              {lang === "hi" ? "कोपायलट मूल्यांकन: " : "Copilot eval: "}
              <b className="text-[color:var(--accent)]">{copilotEval.routing_pct}%</b>
              {lang === "hi" ? " टूल-रूटिंग · " : " tool routing · "}
              <b className="text-[color:var(--accent)]">{copilotEval.grounding_pct}%</b>
              {lang === "hi" ? " तथ्य-आधार · " : " grounding · "}
              {copilotEval.cases} {lang === "hi" ? "मामले" : "cases"}
            </p>
          )}
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-lite mt-6 rounded-2xl p-5 text-xs leading-relaxed text-[color:var(--text-3)]"
      >
        <strong className="text-[color:var(--text-2)]">{t("sourcesTitle")}: </strong>
        {t("sourcesLine")}
      </motion.p>
    </section>
  );
}
