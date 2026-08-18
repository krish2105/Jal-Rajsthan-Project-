"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { scrollPageTo } from "@/lib/scroll";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import blocks from "@/data/blocks.json";
import summary from "@/data/summary.json";

type Block = { uuid: string; name: string; district: string; category: string; stage: number | null };

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: "nav" | "block" | "district" | "action";
  keywords: string;
  dot?: string;
  run: () => void;
};

const CAT_DOT: Record<string, string> = {
  over_exploited: "var(--danger)",
  critical: "var(--warn)",
  semi_critical: "var(--accent-2)",
  safe: "var(--ok)",
};

function scrollTo(hash: string) {
  const el = document.querySelector(hash) as HTMLElement | null;
  if (el) scrollPageTo(el, { offset: -80 });   // clear the fixed nav bar
  else window.location.hash = hash;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const { lang, toggle } = useLang();
  const { logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const hi = lang === "hi";

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setCursor(0);
    restoreTo.current?.focus();
  }, []);

  // ⌘K / Ctrl+K anywhere; Esc closes. Ignored while typing in another field
  // unless the shortcut carries its modifier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) restoreTo.current = document.activeElement as HTMLElement;
          return !v;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = [
      ["#dashboard", hi ? "कमांड डैशबोर्ड" : "Command dashboard", "map"],
      ["#districts", hi ? "ज़िला स्कोरकार्ड" : "District scorecard", "table rank"],
      ["#analytics", hi ? "विश्लेषण" : "Analytics", "charts trends"],
      ["#priorities", hi ? "प्राथमिकता योजना" : "Priority plan", "optimiser milp"],
      ["#ledger", hi ? "कार्य पंजी" : "Works ledger", "works verification"],
      ["#schemes", hi ? "योजनाएँ" : "Schemes", "funding atal mgnrega"],
      ["#wsp", hi ? "WSP स्टूडियो" : "WSP Studio", "water security plan"],
      ["#scenarios", hi ? "परिदृश्य स्टूडियो" : "Scenario studio", "budget equity rainfall"],
      ["#transparency", hi ? "पारदर्शिता" : "Transparency", "models eval backtest"],
    ].map(([href, label, kw]) => ({
      id: `nav:${href}`,
      label,
      hint: href,
      group: "nav" as const,
      keywords: `${label} ${href} ${kw}`,
      run: () => scrollTo(href),
    }));

    const routes: Cmd[] = [
      { id: "route:explorer", label: hi ? "एक्विफ़र एक्सप्लोरर" : "Aquifer Explorer", href: "/explorer", kw: "aquifer explorer deep dive" },
      { id: "route:public", label: hi ? "सार्वजनिक पोर्टल" : "Public portal", href: "/public", kw: "citizen public rti" },
      { id: "route:admin", label: hi ? "एडमिन कंसोल" : "Admin console", href: "/admin", kw: "admin audit log" },
    ].map((r) => ({
      id: r.id,
      label: r.label,
      hint: r.href,
      group: "nav" as const,
      keywords: `${r.label} ${r.href} ${r.kw}`,
      run: () => router.push(r.href),
    }));

    const blockCmds: Cmd[] = (Object.values(blocks) as Block[]).map((b) => ({
      id: `block:${b.uuid}`,
      label: b.name.replace(/_/g, " "),
      hint: b.stage == null ? b.district : `${b.district} · ${Math.round(b.stage)}%`,
      group: "block" as const,
      keywords: `${b.name} ${b.district} ${b.category}`,
      dot: CAT_DOT[b.category] ?? "var(--text-3)",
      run: () => {
        scrollTo("#dashboard");
        window.dispatchEvent(new CustomEvent("jal:select-block", { detail: b.uuid }));
      },
    }));

    const districtCmds: Cmd[] = (summary.districts as { name: string; blocks: number }[]).map((d) => ({
      id: `district:${d.name}`,
      label: d.name,
      hint: hi ? `${d.blocks} ब्लॉक` : `${d.blocks} blocks`,
      group: "district" as const,
      keywords: `${d.name} district ज़िला`,
      run: () => scrollTo("#districts"),
    }));

    const actions: Cmd[] = [
      {
        id: "act:copilot",
        label: hi ? "पॉलिसी कोपायलट खोलें" : "Open Policy Copilot",
        hint: "AI",
        group: "action",
        keywords: "copilot chat ai ask question",
        run: () => window.dispatchEvent(new CustomEvent("jal:open-copilot")),
      },
      {
        id: "act:theme",
        label: resolvedTheme === "dark" ? (hi ? "लाइट थीम" : "Switch to light theme") : hi ? "डार्क थीम" : "Switch to dark theme",
        group: "action",
        keywords: "theme dark light mode toggle",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "act:lang",
        label: hi ? "English पर जाएँ" : "Switch to हिन्दी",
        group: "action",
        keywords: "language hindi english bilingual भाषा",
        run: toggle,
      },
      {
        id: "act:tour",
        label: hi ? "गाइडेड टूर शुरू करें" : "Start guided tour",
        group: "action",
        keywords: "tour walkthrough demo guide help",
        run: () => window.dispatchEvent(new CustomEvent("jal:start-tour")),
      },
      {
        id: "act:logout",
        label: hi ? "साइन आउट" : "Sign out",
        group: "action",
        keywords: "logout sign out exit",
        run: logout,
      },
    ];

    return [...nav, ...routes, ...actions, ...districtCmds, ...blockCmds];
  }, [hi, resolvedTheme, router, setTheme, toggle, logout]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands.filter((c) => c.group !== "block" && c.group !== "district").slice(0, 14);
    const scored = commands
      .map((c) => {
        const hay = c.keywords.toLowerCase();
        const i = hay.indexOf(needle);
        if (i < 0) return null;
        // exact prefix on the label ranks above a mid-string keyword hit
        const rank = c.label.toLowerCase().startsWith(needle) ? 0 : i === 0 ? 1 : 2;
        return { c, rank, i };
      })
      .filter(Boolean) as { c: Cmd; rank: number; i: number }[];
    scored.sort((a, b) => a.rank - b.rank || a.i - b.i);
    return scored.slice(0, 40).map((s) => s.c);
  }, [q, commands]);

  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor, results]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) {
        close();
        hit.run();
      }
    }
  }

  const GROUP_LABEL: Record<Cmd["group"], string> = {
    nav: hi ? "जाएँ" : "Go to",
    action: hi ? "कार्रवाई" : "Actions",
    district: hi ? "ज़िले" : "Districts",
    block: hi ? "ब्लॉक" : "Blocks",
  };

  let lastGroup: string | null = null;

  return (
    <>
      <button
        onClick={() => {
          restoreTo.current = document.activeElement as HTMLElement;
          setOpen(true);
        }}
        aria-label={hi ? "कमांड पैलेट खोलें" : "Open command palette"}
        className="glass hidden items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-[color:var(--text-3)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--text-2)] md:flex"
      >
        <span aria-hidden>⌘</span>
        <span>{hi ? "खोजें" : "Search"}</span>
        <kbd className="rounded border border-[color:var(--surface-border)] px-1 font-[family-name:var(--font-mono)] text-[10px]">K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={hi ? "कमांड पैलेट" : "Command palette"}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--bg-elev)] shadow-2xl"
              onKeyDown={onKeyDown}
            >
              <div className="flex items-center gap-3 border-b border-[color:var(--surface-border)] px-4">
                <span aria-hidden className="text-[color:var(--text-3)]">
                  ⌕
                </span>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={hi ? "ब्लॉक, ज़िला, अनुभाग या कार्रवाई खोजें…" : "Search blocks, districts, sections, actions…"}
                  className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[color:var(--text-3)]"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cmdk-list"
                  aria-activedescendant={results[cursor] ? `cmdk-${results[cursor].id}` : undefined}
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="rounded border border-[color:var(--surface-border)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--text-3)]">
                  esc
                </kbd>
              </div>

              <div ref={listRef} id="cmdk-list" role="listbox" aria-label={hi ? "परिणाम" : "Results"} className="max-h-[52vh] overflow-y-auto p-2">
                {results.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-[color:var(--text-3)]">
                    {hi ? "कुछ नहीं मिला" : "Nothing matches that."}
                  </p>
                )}
                {results.map((c, i) => {
                  const header = c.group !== lastGroup ? ((lastGroup = c.group), GROUP_LABEL[c.group]) : null;
                  const active = i === cursor;
                  return (
                    <div key={c.id}>
                      {header && (
                        <p className="px-3 pt-3 pb-1 font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--text-3)] uppercase">
                          {header}
                        </p>
                      )}
                      <div
                        id={`cmdk-${c.id}`}
                        role="option"
                        aria-selected={active}
                        data-active={active}
                        onMouseMove={() => setCursor(i)}
                        onClick={() => {
                          close();
                          c.run();
                        }}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          active ? "bg-[color:var(--accent)]/15 text-[color:var(--text)]" : "text-[color:var(--text-2)]"
                        }`}
                      >
                        {c.dot && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.dot }} />}
                        <span className="truncate">{c.label}</span>
                        {c.hint && (
                          <span className="ml-auto shrink-0 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--text-3)]">
                            {c.hint}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 border-t border-[color:var(--surface-border)] px-4 py-2 text-[10px] text-[color:var(--text-3)]">
                <span>↑↓ {hi ? "चुनें" : "navigate"}</span>
                <span>↵ {hi ? "खोलें" : "open"}</span>
                <span className="ml-auto">
                  {results.length} {hi ? "परिणाम" : "results"}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
