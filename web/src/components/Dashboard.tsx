"use client";

import { useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import { useLang, type DictKey } from "@/lib/i18n";
import type { MapLayer } from "./MapView";
import { BlockDrawer } from "./BlockDrawer";
import summary from "@/data/summary.json";
import v2 from "@/data/v2_kpis.json";
import ek from "@/data/exec_kpis.json";
import blocks from "@/data/blocks.json";
import { CATEGORY_COLORS } from "@/lib/utils";

const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[color:var(--text-3)]">
      Loading map…
    </div>
  ),
});

const LAYERS: { id: MapLayer; label: DictKey | { en: string; hi: string } }[] = [
  { id: "category", label: "layerCategory" },
  { id: "stage", label: "layerStage" },
  { id: "trend", label: "layerTrend" },
  { id: "pWorsens", label: "layerWorsens" },
  { id: "fluoride", label: "layerFluoride" },
  { id: "personas", label: { en: "Personas", hi: "प्रकार" } },
  { id: "anomaly", label: { en: "Anomalies", hi: "विसंगतियाँ" } },
  { id: "depthTrend", label: { en: "Depth trend", hi: "गहराई रुझान" } },
  { id: "kriged", label: { en: "Kriged depth", hi: "क्रिग्ड गहराई" } },
  { id: "uncertainty", label: { en: "Uncertainty", hi: "अनिश्चितता" } },
];

const LEGEND: Record<MapLayer, { color: string; label: DictKey | string }[]> = {
  category: [
    { color: CATEGORY_COLORS.safe, label: "catSafe" },
    { color: CATEGORY_COLORS.semi_critical, label: "catSemi" },
    { color: CATEGORY_COLORS.critical, label: "catCritical" },
    { color: CATEGORY_COLORS.over_exploited, label: "catOver" },
    { color: CATEGORY_COLORS.saline, label: "catSaline" },
  ],
  stage: [
    { color: "#134e4a", label: "<70%" },
    { color: "#22d3ee", label: "100%" },
    { color: "#fbbf24", label: "150%" },
    { color: "#fb7185", label: "250%" },
    { color: "#7f1d1d", label: "400%" },
  ],
  trend: [
    { color: "#34d399", label: "▼ −20" },
    { color: "#334155", label: "0" },
    { color: "#f87171", label: "▲ +20" },
  ],
  pWorsens: [
    { color: "#1e293b", label: "0%" },
    { color: "#7c3aed", label: "10%" },
    { color: "#c084fc", label: "30%" },
    { color: "#f0abfc", label: "70%" },
  ],
  fluoride: [
    { color: "#e879f9", label: "layerFluoride" },
    { color: "#1e293b", label: "—" },
  ],
  personas: [
    { color: "#f87171", label: "Deep & falling" },
    { color: "#fb923c", label: "Arid over-drafted" },
    { color: "#34d399", label: "Rocky safe" },
    { color: "#38bdf8", label: "Mainstream" },
    { color: "#e879f9", label: "Fluoride" },
    { color: "#94a3b8", label: "Outlier" },
  ],
  anomaly: [
    { color: "#fb7185", label: "⚠ anomaly (M5)" },
    { color: "#1e293b", label: "—" },
  ],
  depthTrend: [
    { color: "#34d399", label: "▼ −2 m/yr" },
    { color: "#334155", label: "0" },
    { color: "#fbbf24", label: "+2" },
    { color: "#ef4444", label: "+6 m/yr" },
  ],
  kriged: [
    { color: "#5eead4", label: "0 m" },
    { color: "#38bdf8", label: "20" },
    { color: "#a78bfa", label: "50" },
    { color: "#f472b6", label: "90 m deep" },
  ],
  uncertainty: [
    { color: "#1e293b", label: "±8 m (dense)" },
    { color: "#fbbf24", label: "±14" },
    { color: "#ef4444", label: "±20 m (sparse)" },
  ],
};

export function Dashboard() {
  const { t, lang } = useLang();
  const [layer, setLayer] = useState<MapLayer>("category");
  const [extrude, setExtrude] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExplain, setShowExplain] = useState(false);

  // the command palette can open any of the 302 blocks from anywhere on the page
  useEffect(() => {
    const onPick = (e: Event) => setSelected((e as CustomEvent<string>).detail);
    window.addEventListener("jal:select-block", onPick);
    return () => window.removeEventListener("jal:select-block", onPick);
  }, []);

  const topWatch = useMemo(() => {
    const all = Object.values(blocks) as { name: string; district: string; pWorsens: number | null }[];
    return all.filter((b) => b.pWorsens != null).sort((a, b) => b.pWorsens! - a.pWorsens!)[0];
  }, []);

  return (
    <section id="dashboard" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20" aria-labelledby="dash-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {t("dashKicker")}
        </p>
        <h2 id="dash-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {t("dashTitle")}
        </h2>
      </motion.div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]" role="list" aria-label="Key indicators" tabIndex={0}>
        {[
          { v: `${summary.overExploited}/${summary.blocks}`, l: t("overExploited"), c: "var(--danger)" },
          { v: `${Math.round(summary.extractionOverRecharge)}%`, l: t("extractionRate"), c: "var(--warn)" },
          { v: `${v2.waterDebt.stateYears}y`, l: lang === "hi" ? "जल-ऋण" : "water debt", c: "var(--danger)" },
          { v: `${v2.dayZero.blocksUnder5y}`, l: lang === "hi" ? "डे-ज़ीरो <5 वर्ष" : "day-zero <5y", c: "var(--warn)" },
          { v: `${ek.migration.net >= 0 ? "+" : ""}${ek.migration.net}`, l: lang === "hi" ? "शुद्ध सुधार" : "net improved", c: "var(--ok)" },
          { v: `${(summary.peopleAtRisk / 1e7).toFixed(1)}Cr`, l: t("peopleAtRisk"), c: "var(--violet)" },
          { v: `${v2.equityGini.state}`, l: "Gini", c: "var(--accent-2)" },
        ].map((k) => (
          <div key={k.l} role="listitem" className="glass shrink-0 rounded-xl px-3.5 py-2">
            <span className="font-[family-name:var(--font-mono)] text-base font-bold tabular-nums" style={{ color: k.c }}>{k.v}</span>
            <span className="ml-1.5 text-[11px] text-[color:var(--text-3)]">{k.l}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* map card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="glass relative overflow-hidden rounded-3xl"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--surface-border)] p-3">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Map layer">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={layer === l.id}
                  onClick={() => setLayer(l.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    layer === l.id
                      ? "bg-[color:var(--accent)] text-[color:var(--on-accent)]"
                      : "text-[color:var(--text-2)] hover:bg-[color:var(--accent)]/10"
                  }`}
                >
                  {typeof l.label === "string" ? t(l.label) : lang === "hi" ? l.label.hi : l.label.en}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowExplain((s) => !s)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-[color:var(--accent-2)] hover:bg-[color:var(--accent)]/10"
                aria-expanded={showExplain}
              >
                ⓘ {t("whatMeans")}
              </button>
              <button
                onClick={() => setExtrude((e) => !e)}
                className={`rounded-lg px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs font-bold transition-colors ${
                  extrude
                    ? "bg-[color:var(--violet)] text-[color:var(--on-violet)]"
                    : "glass-lite text-[color:var(--text-2)] hover:text-[color:var(--text)]"
                }`}
                aria-pressed={extrude}
              >
                {extrude ? t("view2d") : t("view3d")}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showExplain && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-[color:var(--surface-border)] px-4 text-sm leading-relaxed text-[color:var(--text-2)]"
              >
                <span className="block py-3">{t("stageExplain")}</span>
              </motion.p>
            )}
          </AnimatePresence>

          <div className="relative h-[520px] sm:h-[560px]">
            <MapView layer={layer} extrude={extrude} onSelect={setSelected} />
            {/* legend */}
            <div className="glass absolute bottom-3 left-3 rounded-xl px-3 py-2">
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {LEGEND[layer].map((item, i) => {
                  const isKey = /^[a-z]/.test(item.label as string) && !/[%▼▲<—0-9]/.test(item.label as string);
                  return (
                    <li key={i} className="flex items-center gap-1.5 text-[11px] text-[color:var(--text-2)]">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                      {isKey ? t(item.label as DictKey) : (item.label as string)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <p className="border-t border-[color:var(--surface-border)] px-4 py-2.5 text-center text-xs text-[color:var(--text-3)]">
            {t("clickHint")}
          </p>
        </motion.div>

        {/* KPI bento */}
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {[
            {
              big: `${summary.overExploited}/${summary.blocks}`,
              label: t("overExploited"),
              sub: `${t("catCritical")}: ${summary.critical} · ${t("catSemi")}: ${summary.semiCritical} · ${t("catSafe")}: ${summary.safe}`,
              color: "var(--danger)",
            },
            {
              big: topWatch ? topWatch.name : "—",
              label: t("kpiWatchlist"),
              sub: topWatch ? `${topWatch.district} · P = ${Math.round((topWatch.pWorsens ?? 0) * 100)}% · ${t("kpiWatchlistSub")}` : "",
              color: "var(--violet)",
            },
            {
              big: `${summary.fluorideBlocks}`,
              label: t("kpiFluoride"),
              sub: t("kpiFluorideSub"),
              color: "var(--accent-2)",
            },
            {
              big: `${(summary.peopleAtRisk / 1e7).toFixed(2)} Cr`,
              label: t("peopleAtRisk"),
              sub: "≈ " + new Intl.NumberFormat("en-IN").format(summary.peopleAtRisk),
              color: "var(--warn)",
            },
          ].map((k, i) => (
            <motion.div
              key={i}
              // y, not x: these cards reach the right edge of the grid, and a
              // 24px horizontal offset extends the document's scroll width until
              // the card is scrolled into view — a phantom sideways scrollbar
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="glass rounded-2xl p-4"
            >
              <div
                className="truncate font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums"
                style={{ color: k.color }}
                title={k.big}
              >
                {k.big}
              </div>
              <div className="mt-0.5 text-sm font-medium text-[color:var(--text)]">{k.label}</div>
              <div className="mt-1 text-xs leading-snug text-[color:var(--text-3)]">{k.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <BlockDrawer uuid={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
