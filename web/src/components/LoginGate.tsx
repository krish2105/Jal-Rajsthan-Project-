"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "@/lib/i18n";
import { AuthProvider, DEMO_PASSCODE, ROLE_META, useAuth, type Role } from "@/lib/auth";
import summary from "@/data/summary.json";

const DISTRICTS = (summary.districts as { name: string }[])
  .map((d) => d.name)
  .sort();

function LoginScreen() {
  const { login } = useAuth();
  const { lang, toggle, t } = useLang();
  const [role, setRole] = useState<Role>("secretary");
  const [district, setDistrict] = useState(DISTRICTS[0] ?? "Jaipur");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().toUpperCase() !== DEMO_PASSCODE) {
      setErr(
        lang === "hi"
          ? `ग़लत एक्सेस कोड। डेमो कोड: ${DEMO_PASSCODE}`
          : `Wrong access code. Demo code: ${DEMO_PASSCODE}`
      );
      return;
    }
    login({
      role,
      district: role === "district_officer" ? district : null,
      name: ROLE_META[role][lang],
    });
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center px-4">
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(55%_55%_at_50%_45%,black,transparent)]" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass relative w-full max-w-md rounded-3xl p-7"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold">
            <span className="text-gradient">JAL</span> · जल
          </span>
          <button
            onClick={toggle}
            className="glass-lite rounded-full px-3 py-1 text-xs font-medium text-[color:var(--accent)]"
          >
            {t("language")}
          </button>
        </div>
        <p className="text-sm text-[color:var(--text-3)]">
          {lang === "hi"
            ? "राजस्थान भूजल इंटेलिजेंस · सुरक्षित पहुँच"
            : "Rajasthan Groundwater Intelligence · secure access"}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <fieldset>
            <legend className="mb-2 text-xs font-medium tracking-wide text-[color:var(--text-3)] uppercase">
              {lang === "hi" ? "भूमिका चुनें" : "Select role"}
            </legend>
            <div className="space-y-2">
              {(Object.keys(ROLE_META) as Role[]).map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    role === r
                      ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/8"
                      : "hairline glass-lite hover:border-[color:var(--accent)]/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-1 accent-[color:var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      {ROLE_META[r].icon} {ROLE_META[r][lang]}
                    </span>
                    <span className="block text-xs text-[color:var(--text-3)]">
                      {lang === "hi" ? ROLE_META[r].desc_hi : ROLE_META[r].desc_en}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <AnimatePresence>
            {role === "district_officer" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <label className="block pb-1 text-xs font-medium tracking-wide text-[color:var(--text-3)] uppercase">
                  {lang === "hi" ? "ज़िला" : "District"}
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="glass-lite w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block pb-1 text-xs font-medium tracking-wide text-[color:var(--text-3)] uppercase">
              {lang === "hi" ? "एक्सेस कोड" : "Access code"}
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErr(null);
              }}
              placeholder={lang === "hi" ? "डेमो कोड दर्ज करें" : "Enter demo code"}
              className="glass-lite w-full rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--accent)]/50"
              autoComplete="off"
            />
            {err && <p className="mt-1.5 text-xs text-[color:var(--danger)]">{err}</p>}
            <p className="mt-1.5 text-[11px] text-[color:var(--text-3)]">
              {lang === "hi" ? "डेमो एक्सेस कोड: " : "Demo access code: "}
              <code className="rounded bg-[color:var(--accent)]/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[color:var(--accent)]">
                {DEMO_PASSCODE}
              </code>
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[color:var(--accent)] py-3 text-sm font-bold text-[#04202a] transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            {lang === "hi" ? "प्रवेश करें" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 border-t border-[color:var(--surface-border)] pt-3 text-[11px] leading-relaxed text-[color:var(--text-3)]">
          {lang === "hi"
            ? "डेमो प्रमाणीकरण। उत्पादन: RajSSO/Parichay OIDC, सर्वर-सत्र, ज़िला-स्तरीय row-level security — विवरण SECURITY.md में।"
            : "Demo authentication. Production path: RajSSO/Parichay OIDC, server sessions, district-level row-level security — see SECURITY.md."}
        </p>
      </motion.div>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return <div className="min-h-svh" aria-hidden />;
  if (!session) return <LoginScreen />;
  return <>{children}</>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
