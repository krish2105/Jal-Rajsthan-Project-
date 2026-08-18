"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLang } from "@/lib/i18n";
import scenarios from "@/data/scenarios.json";
import plan from "@/data/plan.json";
import { fmtInt, fmtLakhCr } from "@/lib/utils";

type Scenario = (typeof scenarios)[number];

const BUDGETS = [0.5, 1.0, 1.5];
const EQUITIES = [0.0, 0.25, 0.5];
const RAINS = [0.8, 1.0, 1.2];

function Seg({
  options, value, onChange, format, label,
}: {
  options: number[]; value: number; onChange: (v: number) => void;
  format: (v: number) => string; label: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium tracking-wide text-[color:var(--text-3)] uppercase">{label}</legend>
      <div className="glass-lite inline-flex rounded-xl p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              value === o ? "text-[color:var(--on-accent)]" : "text-[color:var(--text-2)] hover:text-[color:var(--text)]"
            }`}
          >
            {value === o && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-lg bg-[color:var(--accent)]"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
              />
            )}
            <span className="relative">{format(o)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ScenarioStudio() {
  const { t } = useLang();
  const [bf, setBf] = useState(1.0);
  const [eq, setEq] = useState(0.25);
  const [rf, setRf] = useState(1.0);

  const scen = useMemo(
    () =>
      (scenarios as Scenario[]).find(
        (s) => s.budgetFactor === bf && s.equityShare === eq && s.rainfallFactor === rf
      ),
    [bf, eq, rf]
  );

  const baseBudget = plan.budgetLakh as number;

  return (
    <section id="scenarios" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20" aria-labelledby="scen-title">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest text-[color:var(--accent)] uppercase">
          {t("scenKicker")}
        </p>
        <h2 id="scen-title" className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-bold tracking-tight">
          {t("scenTitle")}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--text-2)]">{t("scenSub")}</p>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          className="glass space-y-6 rounded-2xl p-6"
          data-tour="scenarios"
        >
          <Seg
            label={t("budget")}
            options={BUDGETS}
            value={bf}
            onChange={setBf}
            format={(v) => fmtLakhCr(baseBudget * v)}
          />
          <Seg
            label={t("equityFloor")}
            options={EQUITIES}
            value={eq}
            onChange={setEq}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Seg
            label={t("rainfallScenario")}
            options={RAINS}
            value={rf}
            onChange={setRf}
            format={(v) => (v < 1 ? t("drier") : v > 1 ? t("wetter") : t("normal"))}
          />
          <p className="border-t border-[color:var(--surface-border)] pt-4 text-xs leading-relaxed text-[color:var(--text-3)]">
            {t("equityNote")}
          </p>
        </motion.div>

        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${bf}-${eq}-${rf}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {scen ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { v: `${fmtInt(scen.totalRechargeHam)}`, u: "ham/yr", l: t("annualRecharge"), c: "var(--accent)" },
                      { v: fmtInt(scen.structureCount), u: "", l: t("structuresBuilt"), c: "var(--accent-2)" },
                      { v: fmtInt(scen.blockCount), u: "", l: t("blocksFunded"), c: "var(--violet)" },
                    ].map((k) => (
                      <div key={k.l} className="glass rounded-2xl p-5">
                        <div className="font-[family-name:var(--font-mono)] text-3xl font-bold tabular-nums" style={{ color: k.c }}>
                          {k.v}
                          {k.u && <span className="ml-1 text-sm font-medium text-[color:var(--text-3)]">{k.u}</span>}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--text-3)]">{k.l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="glass mt-4 rounded-2xl p-5">
                    <h4 className="mb-3 text-sm font-medium text-[color:var(--text-2)]">{t("topAllocations")}</h4>
                    <ul className="space-y-2">
                      {scen.topBlocks.map((b, i) => {
                        const max = scen.topBlocks[0]?.costLakh ?? 1;
                        return (
                          <li key={`${b.name}-${i}`} className="flex items-center gap-3 text-sm">
                            <span className="w-36 shrink-0 truncate sm:w-44">
                              {b.name}
                              <span className="ml-1 text-xs text-[color:var(--text-3)]">{b.district}</span>
                            </span>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--text-3)]/15">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(b.costLakh / max) * 100}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                                className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)]"
                              />
                            </div>
                            <span className="w-20 shrink-0 text-right font-[family-name:var(--font-mono)] text-xs tabular-nums text-[color:var(--text-2)]">
                              {fmtLakhCr(b.costLakh)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="glass rounded-2xl p-8 text-sm text-[color:var(--text-3)]">No scenario data.</div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
