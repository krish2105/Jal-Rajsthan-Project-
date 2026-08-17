"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/agents";
import plan from "@/data/plan.json";
import { fmtInt } from "@/lib/utils";

type Row = {
  id?: number; district: string; structure: string; scheme: string;
  sanctioned: number; built: number; verified: number;
};

/* Offline seed: the plan itself, so the ledger demonstrates the workflow even
   without the API running. Live mode (API_BASE reachable) reads/writes Postgres
   with row-level security deciding what each officer can even see. */
function seedRows(scope: string | null): Row[] {
  const cat = plan.structureCatalog as Record<string, { en: string }>;
  const rows: Row[] = [];
  for (const r of plan.rows as unknown as { district: string; structures: Record<string, number>; schemes?: Record<string, number> }[]) {
    if (scope && r.district !== scope) continue;
    for (const [s, n] of Object.entries(r.structures)) {
      rows.push({
        district: r.district, structure: cat[s]?.en ?? s,
        scheme: Object.keys(r.schemes ?? {})[0] ?? "mgnrega",
        sanctioned: n, built: Math.round(n * 0.42), verified: Math.round(n * 0.11),
      });
    }
  }
  return rows.slice(0, 40);
}

export function WorksLedger() {
  const { lang } = useLang();
  const { session } = useAuth();
  const scope = session?.district ?? null;
  const [rows, setRows] = useState<Row[]>([]);
  const [liveDb, setLiveDb] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (API_BASE) {
      try {
        const q = scope
          ? `?role=district_officer&district=${encodeURIComponent(scope)}`
          : "?role=secretary";
        const res = await fetch(`${API_BASE}/api/ledger${q}`);
        if (res.ok) {
          const d = (await res.json()) as Row[];
          if (Array.isArray(d) && d.length && !("error" in d[0])) {
            setRows(d); setLiveDb(true); return;
          }
        }
      } catch { /* fall through to seed */ }
    }
    setRows(seedRows(scope)); setLiveDb(false);
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  async function bump(i: number, delta: number) {
    const r = rows[i];
    const next = Math.max(0, Math.min(r.sanctioned, r.built + delta));
    setRows((rs) => rs.map((x, j) => (j === i ? { ...x, built: next } : x)));
    if (liveDb && r.id != null && API_BASE) {
      setSaving(i);
      await fetch(`${API_BASE}/api/ledger/update`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: r.id, built_n: next,
          role: scope ? "district_officer" : "secretary", district: scope,
        }),
      }).catch(() => {});
      setSaving(null);
    }
  }

  const tot = rows.reduce((a, r) => ({
    s: a.s + r.sanctioned, b: a.b + r.built, v: a.v + r.verified,
  }), { s: 0, b: 0, v: 0 });
  const execPct = tot.s ? Math.round((100 * tot.b) / tot.s) : 0;
  const verPct = tot.b ? Math.round((100 * tot.v) / tot.b) : 0;
  const canEdit = session?.role === "district_officer" || session?.role === "secretary";

  return (
    <section id="ledger" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="ledger-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {lang === "hi" ? "कार्य पंजी" : "Works ledger"}
        </p>
        <h2 id="ledger-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {lang === "hi" ? "स्वीकृत → निर्मित → सत्यापित" : "Sanctioned → built → verified"}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-2)]">
          {lang === "hi"
            ? "यह वह जगह है जहाँ योजना वास्तविकता से मिलती है। ज़िला अधिकारी अपने ज़िले की प्रगति दर्ज करते हैं — डेटाबेस की row-level security तय करती है कि कौन सी पंक्तियाँ उन्हें दिखेंगी भी। उपग्रह सत्यापन तीसरा स्तंभ है।"
            : "Where the plan meets reality. District officers record progress on their own blocks — Postgres row-level security decides which rows they can even see, let alone edit. Satellite verification is the third column."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs ${liveDb ? "bg-[color:var(--ok)]/15 text-[color:var(--ok)]" : "bg-[color:var(--warn)]/15 text-[color:var(--warn)]"}`}>
            {liveDb
              ? (lang === "hi" ? "● लाइव Postgres + RLS" : "● live Postgres + RLS")
              : (lang === "hi" ? "◐ डेमो डेटा (API बंद)" : "◐ demo data (API offline)")}
          </span>
          {scope && (
            <span className="rounded-full bg-[color:var(--violet)]/15 px-3 py-1 text-xs text-[color:var(--violet)]">
              {lang === "hi" ? `ज़िला-सीमित: ${scope}` : `scoped to ${scope}`}
            </span>
          )}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { v: `${execPct}%`, l: lang === "hi" ? "योजना क्रियान्वयन" : "plan execution", c: "var(--accent)",
            sub: `${fmtInt(tot.b)} / ${fmtInt(tot.s)}` },
          { v: `${verPct}%`, l: lang === "hi" ? "उपग्रह-सत्यापित" : "satellite verified", c: "var(--teal)",
            sub: `${fmtInt(tot.v)} ${lang === "hi" ? "संरचनाएँ" : "structures"}` },
          { v: fmtInt(rows.length), l: lang === "hi" ? "पंजी पंक्तियाँ" : "ledger lines", c: "var(--accent-2)",
            sub: scope ?? (lang === "hi" ? "पूरा राज्य" : "whole state") },
        ].map((k) => (
          <div key={k.l} className="glass rounded-2xl p-4">
            <div className="font-[family-name:var(--font-mono)] text-3xl font-bold tabular-nums" style={{ color: k.c }}>{k.v}</div>
            <div className="mt-1 text-sm font-medium">{k.l}</div>
            <div className="text-xs text-[color:var(--text-3)]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="glass mt-4 max-h-[420px] overflow-auto rounded-2xl">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="sticky top-0 z-10 bg-[color:var(--bg-elev)]">
            <tr className="border-b border-[color:var(--surface-border)] text-left text-xs text-[color:var(--text-3)]">
              <th className="px-4 py-2.5">{lang === "hi" ? "ज़िला" : "District"}</th>
              <th className="px-3 py-2.5">{lang === "hi" ? "संरचना" : "Structure"}</th>
              <th className="px-3 py-2.5">{lang === "hi" ? "योजना" : "Scheme"}</th>
              <th className="px-3 py-2.5 text-right">{lang === "hi" ? "स्वीकृत" : "Sanctioned"}</th>
              <th className="px-3 py-2.5 text-right">{lang === "hi" ? "निर्मित" : "Built"}</th>
              <th className="px-3 py-2.5 text-right">{lang === "hi" ? "सत्यापित" : "Verified"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = r.sanctioned ? (100 * r.built) / r.sanctioned : 0;
              return (
                <tr key={`${r.district}-${r.structure}-${i}`} className="border-b border-[color:var(--surface-border)]/50 last:border-0">
                  <td className="px-4 py-2">{r.district}</td>
                  <td className="px-3 py-2 text-[color:var(--text-2)]">{r.structure}</td>
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--text-3)]">{r.scheme}</td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)] tabular-nums">{fmtInt(r.sanctioned)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[color:var(--text-3)]/15">
                        <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="w-12 text-right font-[family-name:var(--font-mono)] tabular-nums">{fmtInt(r.built)}</span>
                      {canEdit && (
                        <span className="flex gap-0.5">
                          <button onClick={() => bump(i, -Math.max(1, Math.round(r.sanctioned * 0.05)))}
                            aria-label="decrease built" className="glass-lite rounded px-1.5 text-xs">−</button>
                          <button onClick={() => bump(i, Math.max(1, Math.round(r.sanctioned * 0.05)))}
                            aria-label="increase built" className="glass-lite rounded px-1.5 text-xs">+</button>
                        </span>
                      )}
                      {saving === i && <span className="text-[10px] text-[color:var(--text-3)]">…</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)] tabular-nums text-[color:var(--teal)]">{fmtInt(r.verified)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-3)]">
        {lang === "hi"
          ? "लाइव मोड में एक अधिकारी दूसरे ज़िले की पंक्ति बदलने की कोशिश करे तो डेटाबेस 0 पंक्तियाँ अपडेट करता है — नीति कोड में नहीं, डेटाबेस में लागू है।"
          : "In live mode, an officer editing another district's row updates zero rows — the policy lives in the database, not in application code."}
      </p>
    </section>
  );
}
