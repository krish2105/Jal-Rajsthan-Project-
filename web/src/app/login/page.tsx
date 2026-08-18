"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { signIn } from "next-auth/react";
import { ROLE_META, type Role } from "@/lib/auth";

const DISTRICTS = ["Jodhpur", "Nagaur", "Jaipur", "Barmer", "Jaisalmer", "Alwar", "Udaipur",
  "Ajmer", "Bikaner", "Kota", "Sikar", "Pali", "Churu", "Dausa", "Jalor", "Banswara"];

export default function Login() {
  const router = useRouter();
  const [tab, setTab] = useState<"guest" | "account">("guest");
  const [hi, setHi] = useState(false);
  const [role, setRole] = useState<Role>("secretary");
  const [district, setDistrict] = useState("Jodhpur");
  const [code, setCode] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guestLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/guest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, role, district: role === "district_officer" ? district : null }),
    });
    setBusy(false);
    if (res.ok) { router.push("/"); router.refresh(); }
    else setErr(hi ? "ग़लत कोड। डेमो: JAL2026" : "Wrong code. Demo: JAL2026");
  }

  async function accountLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await signIn("credentials", { username: user, password: pass, redirect: false });
    setBusy(false);
    if (res && !res.error) { router.push("/"); router.refresh(); }
    else setErr(hi ? "ग़लत उपयोगकर्ता/पासवर्ड" : "Invalid username or password");
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center px-4">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(55%_55%_at_50%_45%,black,transparent)]" aria-hidden />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="glass relative w-full max-w-md rounded-3xl p-7">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold">
            <span className="text-gradient">JAL</span> · जल
          </span>
          <button onClick={() => setHi(!hi)} className="glass-lite rounded-full px-3 py-1 text-xs font-medium text-[color:var(--accent)]">
            {hi ? "English" : "हिन्दी"}
          </button>
        </div>
        <p className="text-sm text-[color:var(--text-3)]">
          {hi ? "राजस्थान भूजल इंटेलिजेंस · सर्वर-सत्यापित पहुँच" : "Rajasthan Groundwater Intelligence · server-verified access"}
        </p>

        <div className="glass-lite mt-5 flex rounded-xl p-1" role="tablist">
          {(["guest", "account"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setErr(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === t ? "bg-[color:var(--accent)] text-[color:var(--on-accent)]" : "text-[color:var(--text-2)]"}`}>
              {t === "guest" ? (hi ? "अतिथि डेमो" : "Guest demo") : hi ? "अधिकारी लॉगिन" : "Officer sign-in"}
            </button>
          ))}
        </div>

        {tab === "guest" ? (
          <form onSubmit={guestLogin} className="mt-5 space-y-4">
            <div className="space-y-2">
              {(Object.keys(ROLE_META) as Role[]).map((r) => (
                <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${role === r ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/8" : "hairline glass-lite"}`}>
                  <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="mt-1 accent-[color:var(--accent)]" />
                  <span>
                    <span className="block text-sm font-semibold">{ROLE_META[r].icon} {hi ? ROLE_META[r].hi : ROLE_META[r].en}</span>
                    <span className="block text-xs text-[color:var(--text-3)]">{hi ? ROLE_META[r].desc_hi : ROLE_META[r].desc_en}</span>
                  </span>
                </label>
              ))}
            </div>
            {role === "district_officer" && (
              <select value={district} onChange={(e) => setDistrict(e.target.value)}
                className="glass-lite w-full rounded-xl px-3 py-2.5 text-sm outline-none" aria-label="District">
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            )}
            <div>
              <input type="password" value={code} onChange={(e) => { setCode(e.target.value); setErr(null); }}
                placeholder={hi ? "डेमो कोड" : "Demo access code"} autoComplete="off"
                className="glass-lite w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--accent)]/50" />
              <p className="mt-1.5 text-[11px] text-[color:var(--text-3)]">
                {hi ? "डेमो कोड: " : "Demo code: "}
                <code className="rounded bg-[color:var(--accent)]/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[color:var(--accent)]">JAL2026</code>
              </p>
            </div>
            {err && <p className="text-xs text-[color:var(--danger)]">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full rounded-xl bg-[color:var(--accent)] py-3 text-sm font-bold text-[color:var(--on-accent)] disabled:opacity-50">
              {busy ? "…" : hi ? "अतिथि रूप में प्रवेश" : "Enter as guest"}
            </button>
          </form>
        ) : (
          <form onSubmit={accountLogin} className="mt-5 space-y-4">
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="secretary@jal"
              autoComplete="username"
              className="glass-lite w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--accent)]/50" />
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              placeholder={hi ? "पासवर्ड" : "Password"} autoComplete="current-password"
              className="glass-lite w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--accent)]/50" />
            <div className="glass-lite rounded-xl p-3 text-[11px] leading-relaxed text-[color:var(--text-3)]">
              {hi ? "डेमो खाते:" : "Demo accounts:"}<br />
              <code className="font-[family-name:var(--font-mono)]">secretary@jal / jal-secretary-2026</code><br />
              <code className="font-[family-name:var(--font-mono)]">officer.jodhpur@jal / jal-officer-2026</code><br />
              <code className="font-[family-name:var(--font-mono)]">analyst@jal / jal-analyst-2026</code>
            </div>
            {err && <p className="text-xs text-[color:var(--danger)]">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full rounded-xl bg-[color:var(--accent)] py-3 text-sm font-bold text-[color:var(--on-accent)] disabled:opacity-50">
              {busy ? "…" : hi ? "साइन इन" : "Sign in"}
            </button>
          </form>
        )}

        <p className="mt-4 border-t border-[color:var(--surface-border)] pt-3 text-[11px] leading-relaxed text-[color:var(--text-3)]">
          {hi
            ? "सत्र httpOnly कुकीज़ में, भूमिका-जाँच सर्वर मिडलवेयर में। उत्पादन: RajSSO/Parichay OIDC + TOTP (SECURITY.md)।"
            : "Sessions live in httpOnly cookies; role checks run in server middleware. Production: RajSSO/Parichay OIDC + TOTP (SECURITY.md)."}
        </p>
      </motion.div>
    </main>
  );
}
