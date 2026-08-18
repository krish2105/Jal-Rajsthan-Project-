"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { centreOnElement, scrollPageTo } from "@/lib/scroll";
import { useLang } from "@/lib/i18n";

type Step = {
  /** element to spotlight */
  sel: string;
  /** section to scroll to first — lazy sections only mount once near the viewport */
  anchor: string;
  en: { title: string; body: string };
  hi: { title: string; body: string };
};

/** The 8-step narrative: diagnosis → forecast → exposure → prescription → proof. */
const STEPS: Step[] = [
  {
    sel: "#dashboard [aria-label='Key indicators']",
    anchor: "#dashboard",
    en: {
      title: "The diagnosis, in five numbers",
      body: "Every figure here is parsed straight from CGWB's published block-wise assessment — 302 blocks, six assessment years. Nothing is estimated at this layer.",
    },
    hi: {
      title: "निदान — पाँच संख्याओं में",
      body: "हर आँकड़ा CGWB की प्रकाशित ब्लॉक-वार आकलन रिपोर्ट से सीधे लिया गया है — 302 ब्लॉक, छह आकलन वर्ष। इस परत पर कुछ भी अनुमानित नहीं है।",
    },
  },
  {
    sel: "#dashboard [aria-label='Map layer']",
    anchor: "#dashboard",
    en: {
      title: "Ten layers over one basemap",
      body: "Switch between category, extraction stage, trend, P(worsens), fluoride risk and people-at-risk. The 3D toggle extrudes each block by its extraction stage.",
    },
    hi: {
      title: "एक बेसमैप, दस परतें",
      body: "श्रेणी, दोहन स्तर, प्रवृत्ति, P(बिगड़ने की), फ़्लोराइड जोखिम और जोखिम-ग्रस्त जनसंख्या के बीच बदलें। 3D टॉगल हर ब्लॉक को उसके दोहन स्तर के अनुसार उभारता है।",
    },
  },
  {
    sel: "[aria-label='District scorecard table']",
    anchor: "#districts",
    en: {
      title: "33 districts, ranked and sortable",
      body: "Sort by over-exploited share, mean stage, or population at risk. A district officer signing in sees their own district pinned and highlighted.",
    },
    hi: {
      title: "33 ज़िले — क्रमबद्ध",
      body: "अति-दोहित हिस्सा, औसत दोहन या जोखिम-ग्रस्त जनसंख्या के अनुसार क्रमबद्ध करें। ज़िला अधिकारी के साइन-इन करने पर उनका ज़िला हाइलाइट दिखता है।",
    },
  },
  {
    sel: "[aria-label='Analytics KPIs']",
    anchor: "#analytics",
    en: {
      title: "Where the models earn their keep",
      body: "Forecast fans with 80% intervals, category-transition flows between assessment years, and the rainfall–depth relationship that drives the recharge term.",
    },
    hi: {
      title: "यहाँ मॉडल अपना मूल्य सिद्ध करते हैं",
      body: "80% अंतराल के साथ पूर्वानुमान, आकलन वर्षों के बीच श्रेणी-परिवर्तन प्रवाह, और वर्षा–गहराई संबंध जो पुनर्भरण को संचालित करता है।",
    },
  },
  {
    sel: "[aria-label='Priority plan table']",
    anchor: "#priorities",
    en: {
      title: "The prescription — and its price",
      body: "A MILP allocates the recharge budget across blocks and structure types. Each row shows ₹ per hectare-metre bought, so you can defend the ranking line by line.",
    },
    hi: {
      title: "उपचार — और उसकी लागत",
      body: "एक MILP पुनर्भरण बजट को ब्लॉकों और संरचना-प्रकारों में आवंटित करता है। हर पंक्ति ₹ प्रति हेक्टेयर-मीटर दिखाती है, ताकि क्रम को पंक्ति-दर-पंक्ति सिद्ध किया जा सके।",
    },
  },
  {
    sel: "[data-tour='scenarios']",
    anchor: "#scenarios",
    en: {
      title: "Ask the counterfactual",
      body: "Move budget, equity floor and rainfall. The optimiser re-solves and the plan re-ranks — this is the tension between reaching the worst blocks and buying the most water.",
    },
    hi: {
      title: "प्रति-तथ्यात्मक प्रश्न पूछें",
      body: "बजट, समता-सीमा और वर्षा बदलें। ऑप्टिमाइज़र फिर से हल करता है — यही सबसे बुरे ब्लॉकों तक पहुँचने और सर्वाधिक जल अर्जित करने के बीच का तनाव है।",
    },
  },
  {
    sel: "[aria-label='Open Policy Copilot']",
    anchor: "#dashboard",
    en: {
      title: "Ask it in plain Hindi or English",
      body: "The copilot routes your question to the same tools that built these screens. It never invents a number — every claim carries a citation you can click.",
    },
    hi: {
      title: "सादी हिन्दी या अंग्रेज़ी में पूछें",
      body: "कोपायलट आपके प्रश्न को उन्हीं टूल्स तक भेजता है जिन्होंने ये स्क्रीन बनाई हैं। यह कभी संख्या नहीं गढ़ता — हर दावे के साथ क्लिक-योग्य प्रमाण होता है।",
    },
  },
  {
    sel: "[data-tour='transparency']",
    anchor: "#transparency",
    en: {
      title: "Read the report card first",
      body: "Backtests against held-out years, baselines the models had to beat, and the failures we did not hide. Judge the plan after you have judged the evidence.",
    },
    hi: {
      title: "पहले रिपोर्ट कार्ड पढ़ें",
      body: "रोके गए वर्षों पर बैकटेस्ट, वे बेसलाइन जिन्हें मॉडलों को हराना था, और वे विफलताएँ जो हमने छिपाई नहीं। साक्ष्य परखने के बाद ही योजना परखें।",
    },
  },
];

const PAD = 10;

export function GuidedTour() {
  const { lang } = useLang();
  const [on, setOn] = useState(false);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const hi = lang === "hi";
  const step = STEPS[i];

  const stop = useCallback(() => {
    setOn(false);
    setI(0);
    document.body.style.overflow = "";
    try {
      localStorage.setItem("jal_tour_seen", "1");
    } catch {}
    restoreTo.current?.focus();
  }, []);

  useEffect(() => {
    const start = () => {
      restoreTo.current = document.activeElement as HTMLElement;
      setI(0);
      setOn(true);
    };
    window.addEventListener("jal:start-tour", start);
    return () => window.removeEventListener("jal:start-tour", start);
  }, []);

  // Bring the step's target on screen, then track it. Two things make this
  // fiddly: Lenis owns the scroll position (so scrolling must go through
  // scrollPageTo), and the chart-heavy sections are lazily mounted — the target
  // element does not exist until its section has been scrolled near.
  useLayoutEffect(() => {
    if (!on) return;
    let cancelled = false;
    let raf = 0;
    let settleTimer: ReturnType<typeof setTimeout>;

    const find = () => document.querySelector(step.sel) as HTMLElement | null;

    const track = (el: HTMLElement) => {
      let last = "";
      const measure = () => {
        const b = el.getBoundingClientRect();
        const key = `${Math.round(b.top)}:${Math.round(b.left)}:${Math.round(b.width)}:${Math.round(b.height)}`;
        // only re-render when the rectangle actually moves; a per-frame setState
        // restarts the overlay's own fade and strands it part-way
        if (key !== last) {
          last = key;
          setBox(b);
        }
      };
      measure();
      const loop = () => {
        if (cancelled) return;
        measure();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      settleTimer = setTimeout(() => cancelAnimationFrame(raf), reduced ? 200 : 1600);
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    };

    let removeResize: (() => void) | undefined;

    const begin = async () => {
      let el = find();
      if (!el) {
        // nudge the lazy section into range, then wait for it to mount
        scrollPageTo(step.anchor, { instant: Boolean(reduced) });
        for (let tries = 0; tries < 25 && !cancelled; tries++) {
          await new Promise((r) => setTimeout(r, 100));
          el = find();
          if (el) break;
        }
      }
      if (cancelled) return;
      if (!el) return setBox(null);

      // Lenis ignores the first scrollTo issued right after a page load, which
      // left step 1 spotlighting an element still far below the fold. Ask, check,
      // ask again — cheap, and immune to whatever the underlying cause is.
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        centreOnElement(el, Boolean(reduced));
        await new Promise((r) => setTimeout(r, attempt === 0 ? 350 : 500));
        const b = el.getBoundingClientRect();
        if (b.top < window.innerHeight && b.bottom > 0) break;
      }
      if (cancelled) return;
      removeResize = track(el);
    };
    void begin();

    return () => {
      cancelled = true;
      clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      removeResize?.();
    };
  }, [on, i, step, reduced]);

  useEffect(() => {
    if (on) requestAnimationFrame(() => cardRef.current?.focus());
  }, [on, i]);

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      else if (e.key === "ArrowRight") setI((v) => (v + 1 < STEPS.length ? v + 1 : v));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, stop]);

  if (!on) return null;

  const CARD_H = 230;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // prefer just below the highlight, fall back to above it, and clamp either way
  // so a tall target or a short viewport can never push the card off-screen
  const cardTop = box
    ? Math.min(
        Math.max(16, box.bottom + 16 + CARD_H < vh ? box.bottom + 16 : box.top - CARD_H - 16),
        Math.max(16, vh - CARD_H - 16)
      )
    : Math.max(16, vh / 2 - CARD_H / 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="fixed inset-0 z-[90]"
      >
        {/* the spotlight: one div whose enormous outer shadow darkens everything
            except the rounded rect sitting over the current target */}
        <div
          onClick={stop}
          className="tour-move absolute rounded-2xl ring-2 ring-[color:var(--accent)]/70"
          style={{
            boxShadow: "0 0 0 9999px rgba(2,6,12,0.72)",
            top: box ? box.top - PAD : vh / 2,
            left: box ? box.left - PAD : "50%",
            width: box ? box.width + PAD * 2 : 0,
            height: box ? box.height + PAD * 2 : 0,
          }}
          aria-hidden
        />

        <div
          ref={cardRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={hi ? "गाइडेड टूर" : "Guided tour"}
          style={{ top: cardTop }}
          className="tour-move absolute left-1/2 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--bg-elev)] p-5 shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--accent)] uppercase">
              {hi ? `चरण ${i + 1} / ${STEPS.length}` : `Step ${i + 1} of ${STEPS.length}`}
            </span>
            <button onClick={stop} className="text-xs text-[color:var(--text-3)] hover:text-[color:var(--text)]">
              {hi ? "बंद करें" : "Skip"} ✕
            </button>
          </div>

          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold">{(hi ? step.hi : step.en).title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-2)]">{(hi ? step.hi : step.en).body}</p>

          <div className="mt-5 flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((_, n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-[color:var(--accent)]" : "w-1.5 bg-[color:var(--text-3)]/40"}`}
                />
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setI((v) => Math.max(0, v - 1))}
                disabled={i === 0}
                className="glass rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                {hi ? "पिछला" : "Back"}
              </button>
              <button
                onClick={() => (i + 1 < STEPS.length ? setI(i + 1) : stop())}
                className="rounded-lg bg-[color:var(--accent)] px-4 py-1.5 text-xs font-bold text-[color:var(--on-accent)]"
              >
                {i + 1 < STEPS.length ? (hi ? "आगे" : "Next") : hi ? "समाप्त" : "Finish"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
