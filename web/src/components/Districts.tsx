"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import summary from "@/data/summary.json";
import blocks from "@/data/blocks.json";
import { fmtInt } from "@/lib/utils";

type Row = {
  name: string;
  blocks: number;
  overExploited: number;
  meanStage: number | null;
  peopleAtRisk: number;
  oePct: number;
};

type SortKey = "oePct" | "meanStage" | "peopleAtRisk" | "blocks";

export function Districts() {
  const { lang } = useLang();
  const { session } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>("meanStage");

  const rows = useMemo<Row[]>(() => {
    const risk: Record<string, number> = {};
    for (const b of Object.values(blocks) as { district: string; peopleAtRisk: number }[]) {
      risk[b.district] = (risk[b.district] ?? 0) + b.peopleAtRisk;
    }
    return (summary.districts as Omit<Row, "peopleAtRisk" | "oePct">[])
      .map((d) => ({
        ...d,
        peopleAtRisk: risk[d.name] ?? 0,
        oePct: d.blocks ? Math.round((100 * d.overExploited) / d.blocks) : 0,
      }))
      .sort((a, b) => ((b[sortKey] ?? 0) as number) - ((a[sortKey] ?? 0) as number));
  }, [sortKey]);

  const myDistrict = session?.district ?? null;

  const TH = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-3 py-2.5 text-right">
      <button
        onClick={() => setSortKey(k)}
        className={`text-xs font-medium ${sortKey === k ? "text-[color:var(--accent)]" : "text-[color:var(--text-3)] hover:text-[color:var(--text-2)]"}`}
      >
        {label} {sortKey === k ? "↓" : ""}
      </button>
    </th>
  );

  return (
    <section id="districts" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="dist-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {lang === "hi" ? "ज़िला स्कोरकार्ड" : "District scorecard"}
        </p>
        <h2 id="dist-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {lang === "hi" ? "33 ज़िले, आमने-सामने" : "33 districts, side by side"}
        </h2>
        {myDistrict && (
          <p className="mt-3 inline-block rounded-xl border border-[color:var(--violet)]/30 bg-[color:var(--violet)]/8 px-3 py-1.5 text-xs text-[color:var(--violet)]">
            {lang === "hi" ? `आपका ज़िला हाइलाइट किया गया है: ${myDistrict}` : `Your district is highlighted: ${myDistrict}`}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, delay: 0.08 }}
        className="glass mt-8 max-h-[460px] overflow-auto rounded-2xl"
      >
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 z-10 bg-[color:var(--bg-elev)]">
            <tr className="border-b border-[color:var(--surface-border)] text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-[color:var(--text-3)]">
                {lang === "hi" ? "ज़िला" : "District"}
              </th>
              <TH k="blocks" label={lang === "hi" ? "ब्लॉक" : "Blocks"} />
              <TH k="oePct" label={lang === "hi" ? "अति-दोहित %" : "Over-exploited %"} />
              <TH k="meanStage" label={lang === "hi" ? "औसत दोहन %" : "Mean stage %"} />
              <TH k="peopleAtRisk" label={lang === "hi" ? "जोखिम में लोग" : "People at risk"} />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const mine = d.name === myDistrict;
              return (
                <tr
                  key={d.name}
                  className={`border-b border-[color:var(--surface-border)]/50 last:border-0 ${
                    mine ? "bg-[color:var(--violet)]/10" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium">
                    {d.name} {mine && <span aria-hidden>📍</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] tabular-nums">{d.blocks}</td>
                  <td className="px-3 py-2.5">
                    <div className="ml-auto flex max-w-[140px] items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[color:var(--text-3)]/15">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d.oePct}%`,
                            background: d.oePct > 66 ? "var(--danger)" : d.oePct > 33 ? "var(--warn)" : "var(--ok)",
                          }}
                        />
                      </div>
                      <span className="w-9 text-right font-[family-name:var(--font-mono)] text-xs tabular-nums">{d.oePct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] tabular-nums">
                    {d.meanStage != null ? Math.round(d.meanStage) : "–"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-mono)] tabular-nums">
                    {d.peopleAtRisk ? fmtInt(d.peopleAtRisk) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </section>
  );
}
