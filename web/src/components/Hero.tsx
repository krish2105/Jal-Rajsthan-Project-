"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "@/lib/i18n";
import summary from "@/data/summary.json";
import { fmtInt } from "@/lib/utils";

const WaterScene = dynamic(() => import("./hero/WaterScene"), { ssr: false });

function Counter({ to, suffix = "", duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return setVal(to);
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / (duration * 1000), 1);
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration, reduced]);
  return (
    <span ref={ref}>
      {fmtInt(val)}
      {suffix}
    </span>
  );
}

const lineVariants = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  const { t } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => setMounted(true), []);

  const stats = [
    { v: summary.blocks, label: t("blocksAssessed"), color: "var(--accent-2)" },
    { v: summary.overExploited, label: t("overExploited"), color: "var(--danger)" },
    { v: Math.round(summary.extractionOverRecharge), suffix: "%", label: t("extractionRate"), color: "var(--warn)" },
    { v: Math.round(summary.peopleAtRisk / 1e5) / 10, raw: `${(summary.peopleAtRisk / 1e7).toFixed(2)} Cr`, label: t("peopleAtRisk"), color: "var(--violet)" },
  ];

  return (
    <section ref={sectionRef} id="top" className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden">
      {mounted && !reduced && (
        <motion.div style={{ y: yBg }} className="absolute inset-0">
          <WaterScene dark={resolvedTheme !== "light"} />
        </motion.div>
      )}
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" aria-hidden />

      <motion.div style={{ opacity }} className="relative mx-auto w-full max-w-6xl px-5 pt-28 pb-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-block rounded-full border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/8 px-4 py-1.5 font-[family-name:var(--font-mono)] text-xs tracking-wide text-[color:var(--accent)]"
        >
          {t("heroKicker")}
        </motion.p>

        <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-[length:var(--step-5)] leading-[1.02] font-bold tracking-tight">
          {[t("heroTitleA"), t("heroTitleB"), t("heroTitleC")].map((line, i) => (
            <span key={i} className="block overflow-hidden pb-1">
              <motion.span
                custom={i}
                variants={lineVariants}
                initial={reduced ? undefined : "hidden"}
                animate="show"
                className={`block ${i === 2 ? "text-gradient" : ""}`}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="mt-6 max-w-2xl text-[length:var(--step-0)] leading-relaxed text-[color:var(--text-2)]"
        >
          {t("heroSub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <a
            href="#dashboard"
            className="rounded-xl bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-[#04202a] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {t("exploreMap")}
          </a>
          <a
            href="#priorities"
            className="glass rounded-xl px-6 py-3 text-sm font-semibold text-[color:var(--text)] transition-colors hover:border-[color:var(--accent)]/40"
          >
            {t("viewPlan")}
          </a>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <dd
                className="font-[family-name:var(--font-mono)] text-[length:var(--step-3)] font-bold tabular-nums"
                style={{ color: s.color }}
              >
                {"raw" in s && s.raw ? s.raw : <Counter to={s.v} suffix={s.suffix ?? ""} />}
              </dd>
              <dt className="mt-1 text-xs leading-snug text-[color:var(--text-3)]">{s.label}</dt>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2" aria-hidden>
        <motion.div
          animate={reduced ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="h-9 w-5 rounded-full border border-[color:var(--text-3)]/50 p-1"
        >
          <div className="h-2 w-full rounded-full bg-[color:var(--accent)]" />
        </motion.div>
      </div>
    </section>
  );
}
