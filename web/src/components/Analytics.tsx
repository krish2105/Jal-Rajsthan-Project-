"use client";

import { motion } from "motion/react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Sankey, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { useLang } from "@/lib/i18n";
import data from "@/data/analytics.json";
import { fmtInt } from "@/lib/utils";
import kriging from "@/data/kriging.json";
import { CATEGORY_COLORS } from "@/lib/utils";
import { AXIS, GRID, TT, seriesColor } from "@/lib/chart";

function Card({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className={`glass rounded-2xl p-5 ${wide ? "lg:col-span-2" : ""}`}
    >
      <h3 className="mb-3 text-sm font-medium text-[color:var(--text-2)]">{title}</h3>
      {children}
    </motion.div>
  );
}

type DonutRow = { name: string; nameHi: string; value: number };

/**
 * Structure mix. One type is 85% of the plan and another is 0.05%, so the ring
 * alone cannot be read: the four minor slices are slivers a millimetre wide.
 * The ring keeps the shape, and a ranked legend beside it carries the actual
 * numbers — nobody has to hover a sliver to find out it is twelve wells.
 */
function StructureMix({ lang }: { lang: string }) {
  const rows = [...(data.donut as DonutRow[])].sort((a, b) => b.value - a.value);
  const total = rows.reduce((n, r) => n + r.value, 0);
  const label = (r: DonutRow) => (lang === "hi" ? r.nameHi : r.name);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              {...TT}
              formatter={(v, n) => {
                const num = Number(v ?? 0);
                return [`${fmtInt(num)}  ·  ${((100 * num) / total).toFixed(1)}%`, String(n ?? "")];
              }}
            />
            <Pie
              data={rows}
              dataKey="value"
              nameKey={lang === "hi" ? "nameHi" : "name"}
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1.5}
              stroke="var(--bg-elev)"
              strokeWidth={2}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "var(--accent)" : seriesColor(i + 1)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* the total belongs in the hole — it is the one number the ring omits */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-[family-name:var(--font-mono)] text-xl font-bold tabular-nums">
            {fmtInt(total)}
          </span>
          <span className="text-[10px] text-[color:var(--text-3)]">
            {lang === "hi" ? "कुल संरचनाएँ" : "structures"}
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {rows.map((r, i) => {
          const pct = (100 * r.value) / total;
          return (
            <li key={r.name} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: i === 0 ? "var(--accent)" : seriesColor(i + 1) }}
              />
              <span className="min-w-0 flex-1 truncate text-[color:var(--text-2)]">{label(r)}</span>
              <span className="shrink-0 font-[family-name:var(--font-mono)] tabular-nums">
                {fmtInt(r.value)}
              </span>
              <span className="w-12 shrink-0 text-right font-[family-name:var(--font-mono)] tabular-nums text-[color:var(--text-3)]">
                {pct < 0.1 ? "<0.1%" : `${pct.toFixed(1)}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SANKEY_YEARS = [2017, 2020, 2022, 2023, 2024, 2025];

function SankeyChart() {
  const ids = (data.sankey.nodes as { id: string; cat: string }[]).map((n) => n.id);
  const nodes = ids.map((id) => ({ name: id }));
  const links = (data.sankey.links as { source: string; target: string; value: number }[])
    .map((l) => ({ source: ids.indexOf(l.source), target: ids.indexOf(l.target), value: l.value }))
    .filter((l) => l.source >= 0 && l.target >= 0);
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          nodePadding={8}
          margin={{ top: 8, right: 70, bottom: 8, left: 8 }}
          link={{ stroke: "var(--accent)", strokeOpacity: 0.25 }}
          node={({ x, y, width, height, payload }: { x: number; y: number; width: number; height: number; payload: { name: string } }) => {
            const cat = payload.name.split(":")[1];
            return (
              <g>
                <rect x={x} y={y} width={width} height={height} rx={2}
                  fill={CATEGORY_COLORS[cat] ?? "var(--chart-muted)"} />
                {height > 12 && (
                  <text x={x + width + 4} y={y + height / 2 + 3} fontSize={9}
                    fill="var(--text-3)">{payload.name.replace("_", " ")}</text>
                )}
              </g>
            );
          }}
        >
          <Tooltip {...TT} />
        </Sankey>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[10px] text-[color:var(--text-3)]">
        {SANKEY_YEARS.join(" → ")}
      </p>
    </div>
  );
}

export function Analytics() {
  const { lang } = useLang();
  const k = data.kpis;

  const ridge = (data.ridgeline as { year: number; bins: number[]; counts: number[] }[]).map((r) => ({
    year: r.year,
    rows: r.bins.map((b, i) => ({ stage: b, count: r.counts[i] })),
  }));
  const fan = data.forecastFan as { year: number; stage: number; q10?: number; q90?: number }[];
  const fanData = fan.map((f) => ({ ...f, band: f.q10 != null ? [f.q10, f.q90] : null }));
  const spark = (data.sparklines as { district: string; values: { year: number; stage: number | null }[] }[]).slice(0, 12);
  const scatterPts = (data.scatter.points as { x: number; y: number; n: string; c: string }[]);
  const fit = data.scatter.fit as { alpha: number; beta: number; x0: number; x1: number };
  const fitLine = [
    { x: fit.x0, y: fit.alpha + fit.beta * fit.x0 },
    { x: fit.x1, y: fit.alpha + fit.beta * fit.x1 },
  ];

  const chips = [
    { v: `${k.seasonalRecoveryM}m`, l: lang === "hi" ? "मानसून-पुनर्भरण सूचकांक" : "seasonal recovery index", c: "var(--ok)" },
    { v: `${k.depthTrendMedian > 0 ? "+" : ""}${k.depthTrendMedian}`, l: lang === "hi" ? "गहराई रुझान (मी/वर्ष, माध्यिका)" : "depth trend m/yr (median)", c: "var(--warn)" },
    { v: `${k.stationCoveragePct}%`, l: lang === "hi" ? "स्टेशन कवरेज" : "station coverage", c: "var(--accent-2)" },
    { v: `${k.anomalyCount}`, l: lang === "hi" ? "विसंगतियाँ (M5)" : "anomalies (M5)", c: "var(--danger)" },
    { v: k.verifiedWaterDeltaPts != null ? `${k.verifiedWaterDeltaPts > 0 ? "+" : ""}${k.verifiedWaterDeltaPts}pt` : "…", l: lang === "hi" ? "उपग्रह जल-विस्तार Δ" : "verified water-spread Δ", c: "var(--teal)" },
    { v: `±${kriging.loocv.rmse_m}m`, l: lang === "hi" ? "क्रिगिंग LOOCV त्रुटि" : "kriging LOOCV error", c: "var(--violet)" },
    { v: `${kriging.loocv.skill_vs_mean_pct}%`, l: lang === "hi" ? "औसत-से-बेहतर कौशल" : "skill vs state mean", c: "var(--ok)" },
    { v: `${kriging.adequacyPct}%`, l: lang === "hi" ? "निगरानी पर्याप्तता" : "monitoring adequacy", c: "var(--accent-2)" },
    { v: `₹${(k.efficiencyByDistrict as { lakhPerHam: number }[])[0]?.lakhPerHam}L`, l: lang === "hi" ? `सर्वोत्तम ₹-दक्षता: ${(k.efficiencyByDistrict as { district: string }[])[0]?.district}` : `best ₹/ham: ${(k.efficiencyByDistrict as { district: string }[])[0]?.district}`, c: "var(--accent)" },
  ];

  return (
    <section id="analytics" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20" aria-labelledby="an-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {lang === "hi" ? "विश्लेषण वेधशाला" : "Analytics observatory"}
        </p>
        <h2 id="an-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {lang === "hi" ? "नौ वर्षों का भूजल, आठ दृश्यों में" : "Nine years of groundwater, in eight views"}
        </h2>
      </motion.div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Analytics KPIs" tabIndex={0}>
        {chips.map((c) => (
          <div key={c.l} role="listitem" className="glass shrink-0 rounded-xl px-3.5 py-2">
            <span className="font-[family-name:var(--font-mono)] text-base font-bold tabular-nums" style={{ color: c.c }}>{c.v}</span>
            <span className="ml-1.5 text-[11px] text-[color:var(--text-3)]">{c.l}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={lang === "hi" ? "श्रेणी-प्रवाह 2017→2025 (सैंकी)" : "Category flows 2017→2025 (Sankey)"} wide>
          <SankeyChart />
        </Card>

        <Card title={lang === "hi" ? "दोहन-स्तर वितरण, वर्षवार" : "Stage distribution by year (ridgeline)"}>
          <div className="space-y-1">
            {ridge.map((r) => (
              <div key={r.year} className="flex items-center gap-2">
                <span className="w-9 font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--text-3)]">{r.year}</span>
                <div className="h-9 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={r.rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <Area dataKey="count" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.35} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
            <p className="pl-11 text-[10px] text-[color:var(--text-3)]">0% → 400% {lang === "hi" ? "दोहन-स्तर" : "stage"}</p>
          </div>
        </Card>

        <Card title={lang === "hi" ? "वर्षा बनाम दोहन-स्तर 2025 + OLS" : "Rainfall vs stage 2025 + OLS fit"}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="x" name="rainfall" unit="mm" type="number" {...AXIS} />
                <YAxis dataKey="y" name="stage" unit="%" type="number" {...AXIS} />
                <ZAxis range={[18, 18]} />
                <Tooltip {...TT} labelFormatter={() => ""} />
                <Scatter data={scatterPts} fillOpacity={0.75}>
                  {scatterPts.map((p, i) => (
                    <Cell
                      key={i}
                      fill={p.c === "over_exploited" ? "var(--danger)" : "var(--chart-muted)"}
                      fillOpacity={p.c === "over_exploited" ? 0.7 : 0.45}
                    />
                  ))}
                </Scatter>
                <Scatter
                  data={fitLine}
                  line={{ stroke: "var(--accent)", strokeWidth: 2.5, strokeDasharray: "6 4" }}
                  shape={() => <g />}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-[color:var(--text-3)]">
            β = {fit.beta} {lang === "hi" ? "अंक/मिमी — वर्षा अकेले नियति नहीं है" : "pts/mm — rainfall alone is not destiny"}
          </p>
        </Card>

        <Card title={lang === "hi" ? "राज्य पूर्वानुमान पंखा → 2026" : "State forecast fan → 2026"}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fanData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" {...AXIS} />
                <YAxis domain={[100, 160]} unit="%" {...AXIS} />
                <Tooltip {...TT} />
                <Area dataKey="band" stroke="none" fill="var(--accent)" fillOpacity={0.18} />
                <Line dataKey="stage" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={lang === "hi" ? "संरचना मिश्रण (कुल योजना)" : "Structure mix (whole plan)"}>
          <StructureMix lang={lang} />
        </Card>

        <Card title={lang === "hi" ? "ज़िला स्पार्कलाइन (शीर्ष 12 तनावग्रस्त)" : "District sparklines (12 most stressed)"} wide>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {spark.map((s) => (
              <div key={s.district}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">{s.district}</span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--text-3)]">
                    {s.values.at(-1)?.stage ?? "–"}%
                  </span>
                </div>
                <div className="h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.values}>
                      <Line dataKey="stage" stroke="var(--accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={lang === "hi" ? "बजट जलप्रपात (योजना अनुसार, ₹ करोड़)" : "Budget waterfall by scheme (₹ Cr)"}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.waterfall as { name: string; nameHi: string; value: number }[]} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis
                  dataKey={lang === "hi" ? "nameHi" : "name"}
                  tick={{ fontSize: 9, fill: "var(--text-3)", width: 92 }}
                  interval={0}
                  height={46}
                  tickMargin={6}
                  stroke="var(--axis-line)"
                />
                <YAxis {...AXIS} />
                <Tooltip {...TT} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {(data.waterfall as unknown[]).map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "var(--accent)" : seriesColor(i + 1)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={lang === "hi" ? "क्रिगिंग अनिश्चितता वितरण (ब्लॉकवार)" : "Kriging uncertainty across blocks"}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  const sds = Object.values(kriging.blocks as Record<string, { sd: number }>).map((b) => b.sd);
                  const bins = [8, 10, 12, 14, 16, 18, 20, 22];
                  return bins.map((b, i) => ({
                    sd: `${b}`,
                    n: sds.filter((v) => v >= b && v < (bins[i + 1] ?? 99)).length,
                  }));
                })()}
                margin={{ top: 6, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid {...GRID} />
                <XAxis dataKey="sd" unit="m" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip {...TT} />
                <Bar dataKey="n" radius={[5, 5, 0, 0]} fill="var(--chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px] text-[color:var(--text-3)]">
            {lang === "hi"
              ? `${kriging.stations} स्टेशनों से; दाईं ओर के ब्लॉक = विरल निगरानी, नए पीज़ोमीटर की प्राथमिकता`
              : `from ${kriging.stations} stations; blocks on the right are monitoring-starved — where new piezometers pay most`}
          </p>
        </Card>

      </div>
    </section>
  );
}
