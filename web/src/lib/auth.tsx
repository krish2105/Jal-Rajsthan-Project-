"use client";

/* Client auth context — now backed by SERVER state (/api/me): either a NextAuth
   session (httpOnly JWT cookie) or a signed guest cookie. localStorage is gone;
   the client copy is for UI display only — enforcement lives in middleware.ts
   and the API routes. Production path (RajSSO OIDC + Postgres RLS): SECURITY.md. */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";

export type Role = "secretary" | "district_officer" | "analyst";

export type Session = {
  role: Role;
  district: string | null;
  name: string;
  mode: "account" | "guest";
};

export const ROLE_META: Record<Role, { en: string; hi: string; desc_en: string; desc_hi: string; icon: string }> = {
  secretary: {
    en: "Secretary / C-level", hi: "सचिव / उच्चाधिकारी",
    desc_en: "Full access: state map, plan, scenarios, AI pipeline",
    desc_hi: "पूर्ण पहुँच: राज्य मानचित्र, योजना, परिदृश्य, AI पाइपलाइन", icon: "🏛️",
  },
  district_officer: {
    en: "District Officer", hi: "ज़िला अधिकारी",
    desc_en: "District-scoped view: your blocks, your priorities",
    desc_hi: "ज़िला-सीमित दृश्य: आपके ब्लॉक, आपकी प्राथमिकताएँ", icon: "📍",
  },
  analyst: {
    en: "Analyst", hi: "विश्लेषक",
    desc_en: "Models, transparency and scenario tooling; no plan approval",
    desc_hi: "मॉडल, पारदर्शिता व परिदृश्य उपकरण; योजना-अनुमोदन नहीं", icon: "🔬",
  },
};

export const can = {
  runScenarios: (r: Role) => r !== "district_officer",
  seePipeline: (r: Role) => r === "secretary" || r === "analyst",
  seeStatePlan: (_r: Role) => true,
  scopeDistrict: (s: Session) => (s.role === "district_officer" ? s.district : null),
};

const Ctx = createContext<{ session: Session | null; logout: () => void; ready: boolean }>({
  session: null, logout: () => {}, ready: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.role) setSession({ role: d.role, district: d.district ?? null, name: d.name ?? "User", mode: d.mode });
      })
      .finally(() => setReady(true));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/guest", { method: "DELETE" }).catch(() => {});
    await nextAuthSignOut({ redirect: false }).catch(() => {});
    window.location.href = "/login";
  }, []);

  return <Ctx.Provider value={{ session, logout, ready }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
