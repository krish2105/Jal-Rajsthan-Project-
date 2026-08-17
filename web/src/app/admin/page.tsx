"use client";

import Link from "next/link";
import plan from "@/data/plan.json";

export default function Admin() {
  const cat = plan.structureCatalog as Record<string, { en: string; costLakh: number; ham: number }>;
  const rollup = (plan as unknown as { schemeRollup: { label_en: string; capLakh: number; spentLakh: number }[] }).schemeRollup ?? [];
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold"><span className="text-gradient">Admin console</span></h1>
      <p className="mt-1 text-sm text-[color:var(--text-2)]">Policy configuration, read-only view. Editable via <code className="text-xs">config/structures.yaml</code> — a form editor writes back in production. <Link href="/" className="text-[color:var(--accent)] underline">← dashboard</Link></p>
      <div className="glass mt-5 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[color:var(--accent)]">Structure catalogue (unit assumptions)</h2>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left text-xs text-[color:var(--text-3)]"><th className="py-1">Structure</th><th className="text-right">₹ lakh/unit</th><th className="text-right">ham/yr</th></tr></thead>
          <tbody>{Object.values(cat).map((s) => (
            <tr key={s.en} className="border-t border-[color:var(--surface-border)]/50"><td className="py-1.5">{s.en}</td>
              <td className="text-right font-[family-name:var(--font-mono)]">{s.costLakh}</td>
              <td className="text-right font-[family-name:var(--font-mono)]">{s.ham}</td></tr>))}
          </tbody>
        </table>
      </div>
      <div className="glass mt-4 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[color:var(--accent)]">Scheme caps</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>{rollup.map((s) => (
            <tr key={s.label_en} className="border-t border-[color:var(--surface-border)]/50 first:border-0">
              <td className="py-1.5">{s.label_en}</td>
              <td className="text-right font-[family-name:var(--font-mono)]">cap ₹{(s.capLakh / 100).toFixed(0)} Cr · used ₹{(s.spentLakh / 100).toFixed(0)} Cr</td></tr>))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-[color:var(--text-3)]">Access: Secretary role (production enforces server-side; see SECURITY.md).</p>
    </main>
  );
}
