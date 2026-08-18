"use client";

import { motion } from "motion/react";
import { useLang } from "@/lib/i18n";

const cards = [
  { t: "story1T", b: "story1B", n: "01", color: "var(--accent-2)" },
  { t: "story2T", b: "story2B", n: "02", color: "var(--accent)" },
  { t: "story3T", b: "story3B", n: "03", color: "var(--violet)" },
  { t: "story4T", b: "story4B", n: "04", color: "var(--warn)" },
] as const;

export function Story() {
  const { t } = useLang();
  return (
    <section className="relative mx-auto max-w-6xl px-5 py-24" aria-labelledby="story-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {t("storyKicker")}
        </p>
        <h2 id="story-title" className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {t("storyTitle")}
        </h2>
      </motion.div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <motion.article
            key={c.n}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: i * 0.08 }}
            className="glass group relative overflow-hidden rounded-2xl p-6"
          >
            <div
              className="decorative-watermark absolute -top-10 -right-6 font-[family-name:var(--font-display)] text-[7rem] leading-none font-bold opacity-[0.07] transition-opacity group-hover:opacity-[0.12]"
              style={{ color: c.color }}
              aria-hidden
            >
              {c.n}
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold" style={{ color: c.color }}>
              {t(c.t)}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[color:var(--text-2)]">{t(c.b)}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
