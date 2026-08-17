"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import blocks from "@/data/blocks.json";

type B = {
  uuid: string; name: string; district: string; category: string; stage: number | null;
  timeseries: { year: number; stage: number | null; rechargeHam: number | null; extractionHam: number | null; rainfallMm: number | null }[];
  forecast: { q10: number | null; q50: number | null; q90: number | null };
  pWorsens: number | null; fluoride: boolean; peopleAtRisk: number; population: number;
};

export default function Explorer() {
  const all = useMemo(() => (Object.values(blocks) as B[]).sort((a, b) => a.name.localeCompare(b.name)), []);
  const [uuid, setUuid] = useState(all[0]?.uuid);
  const b = all.find((x) => x.uuid === uuid)!;

  function download(fmt: "json" | "csv") {
    const data = fmt === "json"
      ? JSON.stringify(b, null, 1)
      : ["year,stage_pct,recharge_ham,extraction_ham,rainfall_mm",
         ...b.timeseries.map((t) => `${t.year},${t.stage ?? ""},${t.rechargeHam ?? ""},${t.extractionHam ?? ""},${t.rainfallMm ?? ""}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: fmt === "json" ? "application/json" : "text/csv" }));
    a.download = `${b.name}_${fmt === "json" ? "profile.json" : "timeseries.csv"}`;
    a.click();
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
        <span className="text-gradient">Aquifer Explorer</span>
      </h1>
      <p className="mt-1 text-sm text-[color:var(--text-2)]">Every assessed block, full history, no GIS needed. <Link href="/" className="text-[color:var(--accent)] underline">← dashboard</Link></p>
      <div className="mt-5 flex flex-wrap gap-2">
        <select value={uuid} onChange={(e) => setUuid(e.target.value)} aria-label="Block"
          className="glass-lite min-w-56 rounded-xl px-3 py-2 text-sm outline-none">
          {all.map((x) => <option key={x.uuid} value={x.uuid}>{x.name} · {x.district}</option>)}
        </select>
        <button onClick={() => download("csv")} className="glass rounded-xl px-4 py-2 text-sm">⬇ CSV</button>
        <button onClick={() => download("json")} className="glass rounded-xl px-4 py-2 text-sm">⬇ JSON</button>
      </div>
      <div className="glass mt-5 rounded-2xl p-5">
        <h2 className="text-xl font-bold">{b.name} <span className="text-sm font-normal text-[color:var(--text-3)]">{b.district} · {b.category}</span></h2>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-xs text-[color:var(--text-3)]">
            <th className="py-1">Year</th><th className="text-right">Stage %</th><th className="text-right">Recharge (ham)</th><th className="text-right">Extraction (ham)</th><th className="text-right">Rain (mm)</th></tr></thead>
          <tbody>
            {b.timeseries.map((t) => (
              <tr key={t.year} className="border-t border-[color:var(--surface-border)]/50 font-[family-name:var(--font-mono)] tabular-nums">
                <td className="py-1.5">{t.year}</td>
                <td className="text-right">{t.stage != null ? Math.round(t.stage) : "–"}</td>
                <td className="text-right">{t.rechargeHam?.toLocaleString("en-IN") ?? "–"}</td>
                <td className="text-right">{t.extractionHam?.toLocaleString("en-IN") ?? "–"}</td>
                <td className="text-right">{t.rainfallMm ?? "–"}</td>
              </tr>
            ))}
            <tr className="border-t border-[color:var(--surface-border)] font-[family-name:var(--font-mono)] text-[color:var(--accent)]">
              <td className="py-1.5">2026 (forecast)</td>
              <td className="text-right">{b.forecast.q50 != null ? Math.round(b.forecast.q50) : "–"} [{b.forecast.q10 != null ? Math.round(b.forecast.q10) : "–"}–{b.forecast.q90 != null ? Math.round(b.forecast.q90) : "–"}]</td>
              <td colSpan={3} className="text-right text-xs text-[color:var(--text-3)]">P(worsens) {b.pWorsens != null ? Math.round(b.pWorsens * 100) + "%" : "–"} · pop {b.population.toLocaleString("en-IN")}{b.fluoride ? " · fluoride ◆" : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
