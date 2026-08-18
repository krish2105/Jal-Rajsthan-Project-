"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useLang } from "@/lib/i18n";
import { AXIS, GRID, TT } from "@/lib/chart";
import blocksData from "@/data/blocks.json";
import { CATEGORY_COLORS, fmtInt } from "@/lib/utils";

type Block = {
  uuid: string; name: string; district: string; category: string;
  stage: number | null;
  timeseries: { year: number; stage: number | null; rechargeHam: number | null; extractionHam: number | null; rainfallMm: number | null; category: string | null }[];
  forecast: { year: number; q10: number | null; q50: number | null; q90: number | null };
  pWorsens: number | null;
  probs: Record<string, number | null>;
  fluoride: boolean; fluoridePartial: boolean; peopleAtRisk: number; population: number;
};

const CAT_LABEL: Record<string, { en: string }> = {
  safe: { en: "Safe" }, semi_critical: { en: "Semi-critical" },
  critical: { en: "Critical" }, over_exploited: { en: "Over-exploited" }, saline: { en: "Saline" },
};

export function BlockDrawer({ uuid, onClose }: { uuid: string | null; onClose: () => void }) {
  const { t } = useLang();
  const block = uuid ? ((blocksData as Record<string, Block>)[uuid] ?? null) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chartData = block
    ? [
        ...block.timeseries.map((d) => ({ ...d, q10: null as number | null, q90: null as number | null, band: null as [number, number] | null })),
        {
          year: block.forecast.year, stage: block.forecast.q50,
          rechargeHam: null, extractionHam: null, rainfallMm: null, category: null,
          q10: block.forecast.q10, q90: block.forecast.q90,
          band: block.forecast.q10 != null && block.forecast.q90 != null
            ? ([block.forecast.q10, block.forecast.q90] as [number, number]) : null,
        },
      ]
    : [];

  return (
    <AnimatePresence>
      {block && (
        <>
          <motion.button
            aria-label={t("close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] cursor-default bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label={`${block.name} details`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 z-[61] flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[color:var(--surface-border)] bg-[color:var(--bg-elev)] p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">{block.name}</h3>
                <p className="text-sm text-[color:var(--text-3)]">{block.district}</p>
              </div>
              <button
                onClick={onClose}
                className="glass rounded-lg px-3 py-1.5 text-sm text-[color:var(--text-2)] hover:text-[color:var(--text)]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold text-[#08131c]"
                style={{ background: CATEGORY_COLORS[block.category] ?? "#999" }}
              >
                {CAT_LABEL[block.category]?.en ?? block.category}
              </span>
              {block.fluoride && (
                <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-300">
                  {t("fluorideTagged")}{block.fluoridePartial ? " · partial" : ""}
                </span>
              )}
            </div>

            {/* stage + forecast */}
            <div className="glass-lite mt-5 rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[color:var(--text-2)]">{t("stageOfExtraction")}</span>
                <span className="font-[family-name:var(--font-mono)] text-2xl font-bold text-[color:var(--accent)]">
                  {block.stage != null ? `${Math.round(block.stage)}%` : "–"}
                </span>
              </div>
              {block.pWorsens != null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--text-3)]/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(block.pWorsens * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-[color:var(--violet)]"
                    />
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--violet)]">
                    {Math.round(block.pWorsens * 100)}%
                  </span>
                </div>
              )}
              {block.pWorsens != null && (
                <p className="mt-1 text-xs text-[color:var(--text-3)]">{t("pWorsensLabel")}</p>
              )}
            </div>

            {/* history + forecast chart */}
            <div className="glass-lite mt-4 rounded-2xl p-4">
              <h4 className="mb-2 text-sm font-medium text-[color:var(--text-2)]">
                {t("history")} · {t("forecast2026")}
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="year" {...AXIS} />
                    <YAxis {...AXIS} unit="%" />
                    <Tooltip {...TT} />
                    <Area dataKey="band" stroke="none" fill="var(--accent)" fillOpacity={0.18} />
                    <Line
                      dataKey="stage" stroke="var(--accent)" strokeWidth={2}
                      dot={{ r: 3, fill: "var(--accent)" }} connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* next-category odds */}
            {Object.keys(block.probs).length > 0 && (
              <div className="glass-lite mt-4 rounded-2xl p-4">
                <h4 className="mb-3 text-sm font-medium text-[color:var(--text-2)]">{t("categoryProbs")}</h4>
                <ul className="space-y-2">
                  {(["safe", "semi_critical", "critical", "over_exploited"] as const).map((c) => {
                    const v = block.probs[c] ?? 0;
                    return (
                      <li key={c} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 text-[color:var(--text-3)]">{CAT_LABEL[c].en}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--text-3)]/15">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(v ?? 0) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                            className="h-full rounded-full"
                            style={{ background: CATEGORY_COLORS[c] }}
                          />
                        </div>
                        <span className="w-10 text-right font-[family-name:var(--font-mono)] text-[color:var(--text-2)]">
                          {Math.round((v ?? 0) * 100)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* facts */}
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {[
                { k: t("population"), v: fmtInt(block.population) },
                { k: t("peopleAtRisk"), v: fmtInt(block.peopleAtRisk) },
                {
                  k: `${t("recharge")} 2025`,
                  v: `${fmtInt(block.timeseries.at(-1)?.rechargeHam ?? 0)} ham`,
                },
                {
                  k: `${t("extraction")} 2025`,
                  v: `${fmtInt(block.timeseries.at(-1)?.extractionHam ?? 0)} ham`,
                },
              ].map((f) => (
                <div key={f.k} className="glass-lite rounded-xl p-3">
                  <dt className="text-[11px] text-[color:var(--text-3)]">{f.k}</dt>
                  <dd className="mt-0.5 font-[family-name:var(--font-mono)] text-sm font-bold">{f.v}</dd>
                </div>
              ))}
            </dl>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
