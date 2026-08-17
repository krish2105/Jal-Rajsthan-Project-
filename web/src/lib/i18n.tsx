"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "en" | "hi";

const dict = {
  // nav + global
  appName: { en: "JAL", hi: "जल" },
  tagline: { en: "Rajasthan Groundwater Intelligence", hi: "राजस्थान भूजल इंटेलिजेंस" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  priorities: { en: "Priorities", hi: "प्राथमिकताएँ" },
  scenarios: { en: "Scenarios", hi: "परिदृश्य" },
  transparency: { en: "Model transparency", hi: "मॉडल पारदर्शिता" },
  language: { en: "हिन्दी", hi: "English" },
  theme: { en: "Theme", hi: "थीम" },

  // hero
  heroKicker: { en: "Government of Rajasthan · groundwater decision platform", hi: "राजस्थान सरकार · भूजल निर्णय प्लेटफ़ॉर्म" },
  heroTitleA: { en: "The water under", hi: "राजस्थान की धरती के" },
  heroTitleB: { en: "Rajasthan is running out.", hi: "नीचे का पानी घट रहा है।" },
  heroTitleC: { en: "Every rupee must count.", hi: "हर रुपया सही जगह लगे।" },
  heroSub: {
    en: "219 of 302 assessed blocks are over-exploited. JAL turns six years of official CGWB assessments into forecasts, risk watchlists and a budget-optimised recharge plan — every number traceable to a government source.",
    hi: "302 में से 219 मूल्यांकित ब्लॉक अति-दोहित हैं। JAL छह वर्षों के आधिकारिक CGWB आँकड़ों को पूर्वानुमान, जोखिम सूची और बजट-अनुकूलित पुनर्भरण योजना में बदलता है — हर संख्या सरकारी स्रोत से प्रमाणित।",
  },
  exploreMap: { en: "Explore the map", hi: "मानचित्र देखें" },
  viewPlan: { en: "See the ₹600 Cr plan", hi: "₹600 करोड़ की योजना देखें" },

  // stats
  blocksAssessed: { en: "blocks assessed", hi: "मूल्यांकित ब्लॉक" },
  overExploited: { en: "over-exploited", hi: "अति-दोहित" },
  extractionRate: { en: "extraction vs recharge", hi: "दोहन बनाम पुनर्भरण" },
  peopleAtRisk: { en: "people in fluoride-risk blocks", hi: "फ्लोराइड-जोखिम क्षेत्र में लोग" },

  // story
  storyKicker: { en: "The real problem", hi: "वास्तविक समस्या" },
  storyTitle: { en: "A budgeted question, not a vague crisis", hi: "अस्पष्ट संकट नहीं — एक बजट-बद्ध प्रश्न" },
  story1T: { en: "Diagnose", hi: "निदान" },
  story1B: {
    en: "Six CGWB assessment rounds (2017–2025), parsed from official PDFs and cross-verified against the INGRES API. 302 blocks, category and stage of extraction for each.",
    hi: "छह CGWB मूल्यांकन चक्र (2017–2025), आधिकारिक PDF से निकाले और INGRES API से सत्यापित। 302 ब्लॉक, हर एक की श्रेणी व दोहन-स्तर।",
  },
  story2T: { en: "Forecast", hi: "पूर्वानुमान" },
  story2B: {
    en: "Where is each block heading by the next assessment? Honest time-series backtesting — and where a simple baseline wins, we say so and ship it with calibrated uncertainty.",
    hi: "अगले मूल्यांकन तक हर ब्लॉक किस दिशा में? ईमानदार बैकटेस्टिंग — जहाँ सरल आधार-रेखा जीतती है, हम वही कहते हैं और अनिश्चितता के साथ दिखाते हैं।",
  },
  story3T: { en: "Exposure", hi: "जोखिम" },
  story3B: {
    en: "68 blocks carry official fluoride quality tags. Weighted by Census population: ≈1.17 crore people in affected blocks — concentrated in the western belt.",
    hi: "68 ब्लॉकों पर आधिकारिक फ्लोराइड गुणवत्ता चिह्न। जनगणना आधारित आकलन: प्रभावित ब्लॉकों में ≈1.17 करोड़ लोग — पश्चिमी पट्टी में केंद्रित।",
  },
  story4T: { en: "Prescribe", hi: "समाधान" },
  story4B: {
    en: "A MILP optimiser allocates the MGNREGA water-works budget across 6 structure types under feasibility, equity and per-block caps — buying 69% more risk-weighted recharge than uniform spending.",
    hi: "MILP ऑप्टिमाइज़र मनरेगा जल-कार्य बजट को 6 संरचना प्रकारों में व्यवहार्यता, समानता व ब्लॉक-सीमा के तहत बाँटता है — समान वितरण से 69% अधिक जोखिम-भारित पुनर्भरण।",
  },

  // dashboard
  dashKicker: { en: "Live picture · GWRA 2025", hi: "वर्तमान स्थिति · GWRA 2025" },
  dashTitle: { en: "302 blocks, five lenses", hi: "302 ब्लॉक, पाँच दृष्टिकोण" },
  layerCategory: { en: "Category", hi: "श्रेणी" },
  layerStage: { en: "Stage %", hi: "दोहन %" },
  layerTrend: { en: "Trend", hi: "रुझान" },
  layerWorsens: { en: "P(worsens)", hi: "बिगड़ने की संभावना" },
  layerFluoride: { en: "Fluoride risk", hi: "फ्लोराइड जोखिम" },
  view3d: { en: "3D", hi: "3D" },
  view2d: { en: "2D", hi: "2D" },
  catSafe: { en: "Safe", hi: "सुरक्षित" },
  catSemi: { en: "Semi-critical", hi: "अर्ध-संवेदनशील" },
  catCritical: { en: "Critical", hi: "संवेदनशील" },
  catOver: { en: "Over-exploited", hi: "अति-दोहित" },
  catSaline: { en: "Saline", hi: "लवणीय" },
  clickHint: { en: "Click any block for its full profile", hi: "पूरे विवरण के लिए किसी ब्लॉक पर क्लिक करें" },
  kpiWatchlist: { en: "top watchlist block", hi: "शीर्ष निगरानी ब्लॉक" },
  kpiWatchlistSub: { en: "highest P(worsens) next assessment", hi: "अगले मूल्यांकन में बिगड़ने की सर्वाधिक संभावना" },
  kpiFluoride: { en: "fluoride-tagged blocks", hi: "फ्लोराइड-चिह्नित ब्लॉक" },
  kpiFluorideSub: { en: "official CGWB quality tagging", hi: "आधिकारिक CGWB गुणवत्ता चिह्न" },
  whatMeans: { en: "What does this mean?", hi: "इसका अर्थ क्या है?" },
  stageExplain: {
    en: "Stage of extraction = annual groundwater draw ÷ extractable recharge. Above 100% a block mines its aquifer — water tables fall year on year.",
    hi: "दोहन-स्तर = वार्षिक भूजल निकासी ÷ निकालने-योग्य पुनर्भरण। 100% से ऊपर ब्लॉक अपने जलभृत का खनन करता है — जलस्तर हर वर्ष गिरता है।",
  },

  // drawer
  stageOfExtraction: { en: "Stage of extraction", hi: "दोहन-स्तर" },
  forecast2026: { en: "2026 forecast (80% band)", hi: "2026 पूर्वानुमान (80% दायरा)" },
  categoryProbs: { en: "Next-assessment category odds", hi: "अगली श्रेणी की संभावनाएँ" },
  history: { en: "Assessment history", hi: "मूल्यांकन इतिहास" },
  recharge: { en: "Recharge", hi: "पुनर्भरण" },
  extraction: { en: "Extraction", hi: "दोहन" },
  rainfall: { en: "Rainfall", hi: "वर्षा" },
  population: { en: "Population (est.)", hi: "जनसंख्या (अनुमानित)" },
  fluorideTagged: { en: "Fluoride-affected (CGWB tag)", hi: "फ्लोराइड-प्रभावित (CGWB चिह्न)" },
  close: { en: "Close", hi: "बंद करें" },
  pWorsensLabel: { en: "chance the category worsens by next assessment", hi: "अगले मूल्यांकन तक श्रेणी बिगड़ने की संभावना" },

  // priority table
  prioKicker: { en: "The prescription", hi: "समाधान-योजना" },
  prioTitle: { en: "Where the next rupee buys the most water", hi: "अगला रुपया सबसे अधिक पानी कहाँ खरीदता है" },
  prioSub: {
    en: "MILP-optimised allocation of a ₹600 crore MGNREGA water-works budget. Ranked by cost per hectare-metre of expected annual recharge. Structure yields are stated CGWB-derived design assumptions — the ranking is the output.",
    hi: "₹600 करोड़ मनरेगा जल-कार्य बजट का MILP-अनुकूलित आवंटन। प्रति हेक्टेयर-मीटर वार्षिक पुनर्भरण लागत के क्रम में। संरचना-उपज CGWB-आधारित डिज़ाइन मान्यताएँ हैं — रैंकिंग ही परिणाम है।",
  },
  colBlock: { en: "Block", hi: "ब्लॉक" },
  colDistrict: { en: "District", hi: "ज़िला" },
  colCost: { en: "Cost", hi: "लागत" },
  colRecharge: { en: "Recharge / yr", hi: "पुनर्भरण / वर्ष" },
  colEfficiency: { en: "₹ per ham", hi: "₹ प्रति हे-मी" },
  colMix: { en: "Structure mix", hi: "संरचना मिश्रण" },
  liftLine: {
    en: "This plan buys +69% more risk-weighted recharge than spreading the same budget uniformly — while guaranteeing ≥25% flows to fluoride-affected blocks.",
    hi: "यह योजना समान वितरण की तुलना में +69% अधिक जोखिम-भारित पुनर्भरण खरीदती है — साथ ही ≥25% बजट फ्लोराइड-प्रभावित ब्लॉकों को सुनिश्चित करती है।",
  },

  // scenario studio
  scenKicker: { en: "Scenario studio", hi: "परिदृश्य स्टूडियो" },
  scenTitle: { en: "Move the levers a policymaker owns", hi: "नीति-निर्माता के अधिकार वाले लीवर घुमाइए" },
  scenSub: {
    en: "Budget, equity floor and rainfall are choices or risks — not model internals. Every combination below re-runs the optimiser.",
    hi: "बजट, समानता-सीमा और वर्षा — ये विकल्प या जोखिम हैं, मॉडल के भीतर की बातें नहीं। हर संयोजन ऑप्टिमाइज़र को पुनः चलाता है।",
  },
  budget: { en: "Budget", hi: "बजट" },
  equityFloor: { en: "Equity floor (fluoride blocks)", hi: "समानता-सीमा (फ्लोराइड ब्लॉक)" },
  rainfallScenario: { en: "Rainfall scenario", hi: "वर्षा परिदृश्य" },
  drier: { en: "Drier −20%", hi: "शुष्क −20%" },
  normal: { en: "Normal", hi: "सामान्य" },
  wetter: { en: "Wetter +20%", hi: "आर्द्र +20%" },
  annualRecharge: { en: "expected annual recharge", hi: "अपेक्षित वार्षिक पुनर्भरण" },
  structuresBuilt: { en: "structures", hi: "संरचनाएँ" },
  blocksFunded: { en: "blocks funded", hi: "वित्त-पोषित ब्लॉक" },
  topAllocations: { en: "Largest allocations", hi: "सबसे बड़े आवंटन" },
  equityNote: {
    en: "Watch the tension: raising the equity floor trades a little total recharge for guaranteed spending where fluoride exposure is worst. That trade-off is a political choice — the model makes it visible, not invisible.",
    hi: "तनाव देखिए: समानता-सीमा बढ़ाने से कुल पुनर्भरण थोड़ा घटता है, पर फ्लोराइड-प्रभावित क्षेत्रों में व्यय सुनिश्चित होता है। यह चुनाव राजनीतिक है — मॉडल इसे छिपाता नहीं, दिखाता है।",
  },

  // transparency
  transKicker: { en: "Show your work", hi: "प्रक्रिया दिखाइए" },
  transTitle: { en: "Every number defends itself", hi: "हर संख्या स्वयं की रक्षा करती है" },
  trans1T: { en: "Ground truth locked", hi: "आधार-सत्य सुनिश्चित" },
  trans1B: {
    en: "The 2022 parse must reconcile to the published split — 302 blocks: 219 / 22 / 20 / 38 / 3. It does, exactly, and the build fails if it ever doesn't.",
    hi: "2022 का विश्लेषण प्रकाशित विभाजन से मेल खाना चाहिए — 302 ब्लॉक: 219/22/20/38/3। यह पूर्णतः मेल खाता है, और न मिलने पर बिल्ड विफल हो जाता है।",
  },
  trans2T: { en: "The baseline won — we shipped it", hi: "आधार-रेखा जीती — हमने वही अपनाया" },
  trans2B: {
    en: "Our LightGBM challenger lost to persistence on every backtest split, so persistence is the shipped forecast, wrapped in calibrated uncertainty bands. Refusing to over-claim is the feature.",
    hi: "हमारा LightGBM चैलेंजर हर बैकटेस्ट में persistence से हार गया, इसलिए persistence ही अंतिम पूर्वानुमान है — अंशांकित अनिश्चितता के साथ। बढ़ा-चढ़ाकर दावा न करना ही विशेषता है।",
  },
  trans3T: { en: "5–7× sharper watchlist", hi: "5–7× तीक्ष्ण निगरानी सूची" },
  trans3B: {
    en: "The transition model's top-50 'likely to worsen' list hits 5–7× more true deteriorations than chance. That is the number a monitoring cell actually uses.",
    hi: "ट्रांज़िशन मॉडल की शीर्ष-50 सूची संयोग से 5–7 गुना अधिक वास्तविक गिरावटें पकड़ती है। निगरानी प्रकोष्ठ के लिए यही उपयोगी संख्या है।",
  },
  maeChart: { en: "Forecast error (MAE, stage points)", hi: "पूर्वानुमान त्रुटि (MAE)" },
  persistence: { en: "Persistence (shipped)", hi: "Persistence (अपनाया गया)" },
  challenger: { en: "LightGBM challenger", hi: "LightGBM चैलेंजर" },
  recallChart: { en: "Transition model recall by year", hi: "वर्षवार ट्रांज़िशन रिकॉल" },
  sourcesTitle: { en: "Sources", hi: "स्रोत" },
  sourcesLine: {
    en: "CGWB Dynamic Ground Water Resource Assessments (PDF, 6 rounds) · INGRES verified assessment API (CGWB / IIT-H) · Official CGWB block geometry (WFS) · Census of India 2011. Raw files, checksums and every override are committed in the open repository.",
    hi: "CGWB गतिशील भूजल संसाधन मूल्यांकन (PDF, 6 चक्र) · INGRES सत्यापित API (CGWB/IIT-H) · आधिकारिक CGWB ब्लॉक ज्यामिति (WFS) · भारत की जनगणना 2011। कच्ची फ़ाइलें, चेकसम और हर ओवरराइड खुले भंडार में दर्ज हैं।",
  },

  footerLine: {
    en: "Built on public data for the people of Rajasthan · deterministic models decide, AI explains",
    hi: "राजस्थान की जनता के लिए सार्वजनिक आँकड़ों पर निर्मित · निर्णय नियतात्मक मॉडल करते हैं, AI समझाता है",
  },
} as const;

export type DictKey = keyof typeof dict;

const LangCtx = createContext<{ lang: Lang; t: (k: DictKey) => string; toggle: () => void }>({
  lang: "en",
  t: (k) => dict[k].en,
  toggle: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("jal-lang") as Lang | null;
    if (saved === "hi" || saved === "en") setLang(saved);
  }, []);
  const toggle = useCallback(() => {
    setLang((l) => {
      const next = l === "en" ? "hi" : "en";
      window.localStorage.setItem("jal-lang", next);
      document.documentElement.lang = next;
      return next;
    });
  }, []);
  const t = useCallback((k: DictKey) => dict[k][lang], [lang]);
  return <LangCtx.Provider value={{ lang, t, toggle }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
