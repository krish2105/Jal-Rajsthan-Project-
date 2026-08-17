"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import blocks from "@/data/blocks.json";

type B = { name: string; district: string; category: string; stage: number | null; fluoride: boolean };
const CAT_HI: Record<string, string> = {
  safe: "सुरक्षित", semi_critical: "अर्ध-संवेदनशील", critical: "संवेदनशील",
  over_exploited: "अति-दोहित", saline: "लवणीय",
};
const CAT_COLOR: Record<string, string> = {
  safe: "#34d399", semi_critical: "#38bdf8", critical: "#fbbf24",
  over_exploited: "#f87171", saline: "#a3a3a3",
};

export default function PublicPortal() {
  const [q, setQ] = useState("");
  const all = useMemo(() => Object.values(blocks) as B[], []);
  const hits = q.length >= 2
    ? all.filter((b) => (b.name + " " + b.district).toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : [];
  return (
    <main className="mx-auto max-w-xl px-5 py-12" lang="hi">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
        <span className="text-gradient">जल</span> · जन-पोर्टल
      </h1>
      <p className="mt-2 text-sm text-[color:var(--text-2)]">
        अपने ब्लॉक का भूजल-स्तर जानिए। आँकड़े: CGWB भूजल आकलन (GWRA 2025)।
        <span className="block text-xs text-[color:var(--text-3)]">Know your block&apos;s groundwater status · official CGWB data.</span>
      </p>
      <label htmlFor="q" className="mt-6 block text-sm font-medium">ब्लॉक या ज़िला खोजें / Search block or district</label>
      <input
        id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="जैसे: Jhotwara, Jodhpur…"
        className="glass-lite mt-2 w-full rounded-xl px-4 py-3 text-base outline-none focus:border-[color:var(--accent)]/50"
      />
      <ul className="mt-4 space-y-2" aria-live="polite">
        {hits.map((b) => (
          <li key={b.name + b.district} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{b.name} <span className="text-xs font-normal text-[color:var(--text-3)]">{b.district}</span></span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-[#08131c]" style={{ background: CAT_COLOR[b.category] ?? "#999" }}>
                {CAT_HI[b.category] ?? b.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[color:var(--text-2)]">
              दोहन-स्तर: <b>{b.stage != null ? Math.round(b.stage) + "%" : "–"}</b>
              {b.stage != null && b.stage > 100 && " — पुनर्भरण से अधिक निकासी हो रही है"}
              {b.fluoride && <span className="ml-2 text-fuchsia-400">◆ फ्लोराइड-प्रभावित</span>}
            </p>
          </li>
        ))}
        {q.length >= 2 && hits.length === 0 && <li className="text-sm text-[color:var(--text-3)]">कोई ब्लॉक नहीं मिला।</li>}
      </ul>
      <p className="mt-10 text-xs text-[color:var(--text-3)]">
        100% से ऊपर दोहन-स्तर का अर्थ: ब्लॉक हर वर्ष जितना पानी प्रकृति लौटाती है उससे अधिक निकाल रहा है।
        अधिकारी-डैशबोर्ड: <Link href="/" className="text-[color:var(--accent)] underline">jal-rajasthan.vercel.app</Link>
      </p>
    </main>
  );
}
