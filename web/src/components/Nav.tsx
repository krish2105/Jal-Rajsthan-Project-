"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";
import { ROLE_META, useAuth } from "@/lib/auth";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // before mount, assume dark (the SSR default) so server and client HTML agree
  const dark = mounted ? resolvedTheme === "dark" : true;
  return (
    <button
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="glass relative flex h-9 w-16 items-center rounded-full px-1 transition-colors hover:border-[color:var(--accent)]/40"
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent)]/15 text-sm"
        style={{ marginLeft: mounted && !dark ? "auto" : 0 }}
      >
        {mounted ? (dark ? "🌙" : "☀️") : "🌙"}
      </motion.span>
    </button>
  );
}

export function Nav() {
  const { t, toggle, lang } = useLang();
  const { session, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#dashboard", label: t("dashboard") },
    { href: "#districts", label: lang === "hi" ? "ज़िले" : "Districts" },
    { href: "#analytics", label: lang === "hi" ? "विश्लेषण" : "Analytics" },
    { href: "#priorities", label: t("priorities") },
    { href: "#schemes", label: lang === "hi" ? "योजनाएँ" : "Schemes" },
    { href: "#wsp", label: "WSP" },
    { href: "#scenarios", label: t("scenarios") },
    { href: "#transparency", label: t("transparency") },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-all duration-300 ${
          scrolled ? "glass mx-3 sm:mx-auto" : "bg-transparent"
        }`}
        aria-label="Main"
      >
        <a href="#top" className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
            <span className="text-gradient">JAL</span>
            <span className="ml-1.5 text-[color:var(--text)]">जल</span>
          </span>
          <span className="hidden text-xs text-[color:var(--text-3)] md:inline">{t("tagline")}</span>
        </a>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-[color:var(--text-2)] transition-colors hover:bg-[color:var(--accent)]/10 hover:text-[color:var(--text)]"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={logout}
              title={lang === "hi" ? "लॉग आउट" : "Sign out"}
              className="glass hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[color:var(--text-2)] transition-colors hover:border-[color:var(--danger)]/40 hover:text-[color:var(--danger)] sm:flex"
            >
              <span aria-hidden>{ROLE_META[session.role].icon}</span>
              {ROLE_META[session.role][lang]}
              {session.district ? ` · ${session.district}` : ""}
              <span className="ml-1 opacity-60">⏻</span>
            </button>
          )}
          <button
            onClick={toggle}
            className="glass rounded-full px-3.5 py-1.5 text-sm font-medium text-[color:var(--accent)] transition-colors hover:border-[color:var(--accent)]/40"
            aria-label="Toggle language"
          >
            {t("language")}
          </button>
          <ThemeToggle />
          <button
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-label="Menu"
            className="glass rounded-full px-3 py-1.5 text-sm lg:hidden"
          >
            ☰
          </button>
        </div>
      </nav>
      {menu && (
        <div className="glass mx-3 mt-2 rounded-2xl p-2 lg:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenu(false)}
              className="block rounded-lg px-4 py-2.5 text-sm text-[color:var(--text-2)] hover:bg-[color:var(--accent)]/10">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
