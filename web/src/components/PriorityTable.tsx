"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "@/lib/i18n";
import plan from "@/data/plan.json";
import { fmtInt, fmtLakhCr, CATEGORY_COLORS } from "@/lib/utils";

type Row = (typeof plan.rows)[number];

const STRUCT_LABELS = plan.structureCatalog as Record<
  string,
  { en: string; hi: string; costLakh: number; ham: number }
>;

export function PriorityTable() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const rows = (plan.rows as Row[]).slice(0, 25);

  return (
    <section id="priorities" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="prio-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {t("prioKicker")}
        </p>
        <h2 id="prio-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {t("prioTitle")}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-2)]">{t("prioSub")}</p>
        <p className="mt-4 inline-block rounded-xl border border-[color:var(--ok)]/30 bg-[color:var(--ok)]/8 px-4 py-2.5 text-sm font-medium text-[color:var(--ok)]">
          ▲ {t("liftLine")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="glass mt-8 overflow-x-auto rounded-2xl"
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[color:var(--surface-border)] text-left text-xs text-[color:var(--text-3)]">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">{t("colBlock")}</th>
              <th className="px-4 py-3 font-medium">{t("colDistrict")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colCost")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colRecharge")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("colEfficiency")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <motion.tr
                key={r.uuid}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => setOpen(open === r.uuid ? null : r.uuid)}
                className="cursor-pointer border-b border-[color:var(--surface-border)]/60 transition-colors last:border-0 hover:bg-[color:var(--accent)]/6"
              >
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-[color:var(--text-3)]">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: CATEGORY_COLORS[r.category] ?? "#999" }}
                      aria-hidden
                    />
                    {r.name}
                    {r.fluoride && <span title="Fluoride-affected" className="text-fuchsia-400">◆</span>}
                  </div>
                  <AnimatePresence>
                    {open === r.uuid && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {Object.entries(r.structures).map(([s, n]) => (
                            <span
                              key={s}
                              className="rounded-md bg-[color:var(--accent)]/10 px-2 py-0.5 text-[11px] text-[color:var(--accent)]"
                            >
                              {n} × {STRUCT_LABELS[s]?.[lang] ?? s}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
                <td className="px-4 py-3 text-[color:var(--text-2)]">{r.district}</td>
                <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] tabular-nums">
                  {fmtLakhCr(r.costLakh)}
                </td>
                <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] tabular-nums">
                  {fmtInt(r.rechargeHam)} ham
                </td>
                <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] font-bold text-[color:var(--accent)] tabular-nums">
                  ₹{r.lakhPerHam}L
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
      <p className="mt-3 text-center text-xs text-[color:var(--text-3)]">{t("colMix")}: ▸ click a row · ◆ = fluoride-affected block</p>
    </section>
  );
}
