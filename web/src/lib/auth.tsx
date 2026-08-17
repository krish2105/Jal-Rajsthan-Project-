"use client";

/* Demo RBAC — three government roles with different access scopes.
   This is DEMO authentication (role selection + shared demo passcode) so a C-level
   audience can experience role-scoped views. The production path is documented in
   SECURITY.md: Rajasthan SSO (RajSSO) / Parichay OIDC + server-side sessions +
   Postgres row-level security scoping districts per officer. */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Role = "secretary" | "district_officer" | "analyst";

export type Session = {
  role: Role;
  district: string | null; // district officers are scoped to one district
  name: string;
};

export const ROLE_META: Record<
  Role,
  { en: string; hi: string; desc_en: string; desc_hi: string; icon: string }
> = {
  secretary: {
    en: "Secretary / C-level",
    hi: "सचिव / उच्चाधिकारी",
    desc_en: "Full access: state map, plan, scenarios, AI pipeline",
    desc_hi: "पूर्ण पहुँच: राज्य मानचित्र, योजना, परिदृश्य, AI पाइपलाइन",
    icon: "🏛️",
  },
  district_officer: {
    en: "District Officer",
    hi: "ज़िला अधिकारी",
    desc_en: "District-scoped view: your blocks, your priorities",
    desc_hi: "ज़िला-सीमित दृश्य: आपके ब्लॉक, आपकी प्राथमिकताएँ",
    icon: "📍",
  },
  analyst: {
    en: "Analyst",
    hi: "विश्लेषक",
    desc_en: "Models, transparency and scenario tooling; no plan approval",
    desc_hi: "मॉडल, पारदर्शिता व परिदृश्य उपकरण; योजना-अनुमोदन नहीं",
    icon: "🔬",
  },
};

export const DEMO_PASSCODE = "JAL2026";

/** capability checks used by components */
export const can = {
  runScenarios: (r: Role) => r !== "district_officer",
  seePipeline: (r: Role) => r === "secretary" || r === "analyst",
  seeStatePlan: (_r: Role) => true,
  scopeDistrict: (s: Session) => (s.role === "district_officer" ? s.district : null),
};

const KEY = "jal-session-v1";

const Ctx = createContext<{
  session: Session | null;
  login: (s: Session) => void;
  logout: () => void;
  ready: boolean;
}>({ session: null, login: () => {}, logout: () => {}, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* corrupted session — treat as logged out */
    }
    setReady(true);
  }, []);
  const login = useCallback((s: Session) => {
    window.localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
  }, []);
  const logout = useCallback(() => {
    window.localStorage.removeItem(KEY);
    setSession(null);
  }, []);
  return <Ctx.Provider value={{ session, login, logout, ready }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
