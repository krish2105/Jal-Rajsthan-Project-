"use client";

import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import kpis from "@/data/exec_kpis.json";
import plan from "@/data/plan.json";
import { fmtInt } from "@/lib/utils";

export function ExecutiveBand() {
  const { lang } = useLang();
  const mig = kpis.migration;
  const mgmt = kpis.managementEffect;
  const mjsa = kpis.mjsa;
  const eq = kpis.equityDelivery;

  const cards = [
    {
      big: `${mig.net >= 0 ? "+" : ""}${mig.net}`,
      unit: lang === "hi" ? "ब्लॉक (शुद्ध)" : "blocks (net)",
      label: lang === "hi" ? "श्रेणी सुधार 2024→25" : "Category migration 2024→25",
      sub: lang === "hi" ? `${mig.improved} सुधरे · ${mig.worsened} बिगड़े` : `${mig.improved} improved · ${mig.worsened} worsened`,
      color: mig.net >= 0 ? "var(--ok)" : "var(--danger)",
    },
    {
      big: `${mgmt.meanStagePts > 0 ? "+" : ""}${mgmt.meanStagePts}`,
      unit: lang === "hi" ? "अंक" : "stage pts",
      label: lang === "hi" ? "प्रबंधन-प्रभाव (वर्षा-समायोजित)" : "Management effect (rainfall-adjusted)",
      sub: lang === "hi"
        ? "वर्षा का असर हटाने के बाद वास्तविक सुधार"
        : "real change after removing the weather effect",
      color: mgmt.meanStagePts <= 0 ? "var(--ok)" : "var(--danger)",
    },
    {
      big: `${mjsa.sharePct}%`,
      unit: "",
      label: lang === "hi" ? "MJSA 2.0 वार्षिक लक्ष्य-संरेखण" : "MJSA 2.0 annual-target alignment",
      sub: lang === "hi"
        ? `योजना: ${fmtInt(mjsa.planStructures)} / लक्ष्य ${fmtInt(mjsa.annualTarget)} संरचनाएँ`
        : `plan: ${fmtInt(mjsa.planStructures)} of ${fmtInt(mjsa.annualTarget)} structures/yr`,
      color: "var(--accent-2)",
    },
    {
      big: eq.rsPerPerson ? `₹${fmtInt(eq.rsPerPerson)}` : "—",
      unit: lang === "hi" ? "प्रति व्यक्ति" : "per person",
      label: lang === "hi" ? "फ्लोराइड-सुरक्षा लागत" : "Fluoride-protection cost",
      sub: lang === "hi"
        ? `${fmtInt(eq.peopleCovered)} लोग कवर्ड`
        : `${fmtInt(eq.peopleCovered)} people covered by funded works`,
      color: "var(--violet)",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 pt-4 pb-2" aria-label="Executive KPIs">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.55 }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-[family-name:var(--font-mono)] text-3xl font-bold tabular-nums" style={{ color: c.color }}>
                {c.big}
              </span>
              {c.unit && <span className="text-xs text-[color:var(--text-3)]">{c.unit}</span>}
            </div>
            <div className="mt-1 text-sm font-medium">{c.label}</div>
            <div className="mt-0.5 text-xs leading-snug text-[color:var(--text-3)]">{c.sub}</div>
          </div>
        ))}
      </motion.div>
      <p className="mt-2 text-right text-[10px] text-[color:var(--text-3)]">
        {lang === "hi"
          ? `भारित लक्ष्य-संरेखण ₹${Math.round((plan.budgetLakh as number) / 100)} करोड़ योजना पर आधारित · DLI-शैली संकेतक`
          : `computed on the ₹${Math.round((plan.budgetLakh as number) / 100)} Cr plan · Atal Jal DLI-style indicators`}
      </p>
    </section>
  );
}
