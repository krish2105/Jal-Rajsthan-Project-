# Hindi copy review — JAL

Review each Hindi string for register/correctness for a government audience.
Edit the `hi:` values in `web/src/lib/i18n.tsx` (keys shown). Component-level
ternaries (Schemes, WSP, Copilot, portal pages) carry ~30 more strings — search
`lang === "hi"` across web/src/components/ and web/src/app/.

| Key | English | Hindi (review) |
|---|---|---|
| `appName` | JAL | जल |
| `tagline` | Rajasthan Groundwater Intelligence | राजस्थान भूजल इंटेलिजेंस |
| `dashboard` | Dashboard | डैशबोर्ड |
| `priorities` | Priorities | प्राथमिकताएँ |
| `scenarios` | Scenarios | परिदृश्य |
| `transparency` | Model transparency | मॉडल पारदर्शिता |
| `language` | हिन्दी | English |
| `theme` | Theme | थीम |
| `heroKicker` | Government of Rajasthan · groundwater decision platform | राजस्थान सरकार · भूजल निर्णय प्लेटफ़ॉर्म |
| `heroTitleA` | The water under | राजस्थान की धरती के |
| `heroTitleB` | Rajasthan is running out. | नीचे का पानी घट रहा है। |
| `heroTitleC` | Every rupee must count. | हर रुपया सही जगह लगे। |
| `heroSub` | 219 of 302 assessed blocks are over-exploited. JAL turns six years of official C | 302 में से 219 मूल्यांकित ब्लॉक अति-दोहित हैं। JAL छह वर्षों के आधिकारिक CGWB आँकड़ों को प |
| `exploreMap` | Explore the map | मानचित्र देखें |
| `viewPlan` | See the ₹600 Cr plan | ₹600 करोड़ की योजना देखें |
| `blocksAssessed` | blocks assessed | मूल्यांकित ब्लॉक |
| `overExploited` | over-exploited | अति-दोहित |
| `extractionRate` | extraction vs recharge | दोहन बनाम पुनर्भरण |
| `peopleAtRisk` | people in fluoride-risk blocks | फ्लोराइड-जोखिम क्षेत्र में लोग |
| `storyKicker` | The real problem | वास्तविक समस्या |
| `storyTitle` | A budgeted question, not a vague crisis | अस्पष्ट संकट नहीं — एक बजट-बद्ध प्रश्न |
| `story1T` | Diagnose | निदान |
| `story1B` | Six CGWB assessment rounds (2017–2025), parsed from official PDFs and cross-veri | छह CGWB मूल्यांकन चक्र (2017–2025), आधिकारिक PDF से निकाले और INGRES API से सत्यापित। 302  |
| `story2T` | Forecast | पूर्वानुमान |
| `story2B` | Where is each block heading by the next assessment? Honest time-series backtesti | अगले मूल्यांकन तक हर ब्लॉक किस दिशा में? ईमानदार बैकटेस्टिंग — जहाँ सरल आधार-रेखा जीतती है |
| `story3T` | Exposure | जोखिम |
| `story3B` | 68 blocks carry official fluoride quality tags. Weighted by Census population: ≈ | 68 ब्लॉकों पर आधिकारिक फ्लोराइड गुणवत्ता चिह्न। जनगणना आधारित आकलन: प्रभावित ब्लॉकों में ≈ |
| `story4T` | Prescribe | समाधान |
| `story4B` | A MILP optimiser allocates the MGNREGA water-works budget across 6 structure typ | MILP ऑप्टिमाइज़र मनरेगा जल-कार्य बजट को 6 संरचना प्रकारों में व्यवहार्यता, समानता व ब्लॉक- |
| `dashKicker` | Live picture · GWRA 2025 | वर्तमान स्थिति · GWRA 2025 |
| `dashTitle` | 302 blocks, five lenses | 302 ब्लॉक, पाँच दृष्टिकोण |
| `layerCategory` | Category | श्रेणी |
| `layerStage` | Stage % | दोहन % |
| `layerTrend` | Trend | रुझान |
| `layerWorsens` | P(worsens) | बिगड़ने की संभावना |
| `layerFluoride` | Fluoride risk | फ्लोराइड जोखिम |
| `view3d` | 3D | 3D |
| `view2d` | 2D | 2D |
| `catSafe` | Safe | सुरक्षित |
| `catSemi` | Semi-critical | अर्ध-संवेदनशील |
| `catCritical` | Critical | संवेदनशील |
| `catOver` | Over-exploited | अति-दोहित |
| `catSaline` | Saline | लवणीय |
| `clickHint` | Click any block for its full profile | पूरे विवरण के लिए किसी ब्लॉक पर क्लिक करें |
| `kpiWatchlist` | top watchlist block | शीर्ष निगरानी ब्लॉक |
| `kpiWatchlistSub` | highest P(worsens) next assessment | अगले मूल्यांकन में बिगड़ने की सर्वाधिक संभावना |
| `kpiFluoride` | fluoride-tagged blocks | फ्लोराइड-चिह्नित ब्लॉक |
| `kpiFluorideSub` | official CGWB quality tagging | आधिकारिक CGWB गुणवत्ता चिह्न |
| `whatMeans` | What does this mean? | इसका अर्थ क्या है? |
| `stageExplain` | Stage of extraction = annual groundwater draw ÷ extractable recharge. Above 100% | दोहन-स्तर = वार्षिक भूजल निकासी ÷ निकालने-योग्य पुनर्भरण। 100% से ऊपर ब्लॉक अपने जलभृत का  |
| `stageOfExtraction` | Stage of extraction | दोहन-स्तर |
| `forecast2026` | 2026 forecast (80% band) | 2026 पूर्वानुमान (80% दायरा) |
| `categoryProbs` | Next-assessment category odds | अगली श्रेणी की संभावनाएँ |
| `history` | Assessment history | मूल्यांकन इतिहास |
| `recharge` | Recharge | पुनर्भरण |
| `extraction` | Extraction | दोहन |
| `rainfall` | Rainfall | वर्षा |
| `population` | Population (est.) | जनसंख्या (अनुमानित) |
| `fluorideTagged` | Fluoride-affected (CGWB tag) | फ्लोराइड-प्रभावित (CGWB चिह्न) |
| `close` | Close | बंद करें |
| `pWorsensLabel` | chance the category worsens by next assessment | अगले मूल्यांकन तक श्रेणी बिगड़ने की संभावना |
| `prioKicker` | The prescription | समाधान-योजना |
| `prioTitle` | Where the next rupee buys the most water | अगला रुपया सबसे अधिक पानी कहाँ खरीदता है |
| `prioSub` | MILP-optimised allocation of a ₹600 crore MGNREGA water-works budget. Ranked by  | ₹600 करोड़ मनरेगा जल-कार्य बजट का MILP-अनुकूलित आवंटन। प्रति हेक्टेयर-मीटर वार्षिक पुनर्भर |
| `colBlock` | Block | ब्लॉक |
| `colDistrict` | District | ज़िला |
| `colCost` | Cost | लागत |
| `colRecharge` | Recharge / yr | पुनर्भरण / वर्ष |
| `colEfficiency` | ₹ per ham | ₹ प्रति हे-मी |
| `colMix` | Structure mix | संरचना मिश्रण |
| `liftLine` | This plan buys +69% more risk-weighted recharge than spreading the same budget u | यह योजना समान वितरण की तुलना में +69% अधिक जोखिम-भारित पुनर्भरण खरीदती है — साथ ही ≥25% बज |
| `scenKicker` | Scenario studio | परिदृश्य स्टूडियो |
| `scenTitle` | Move the levers a policymaker owns | नीति-निर्माता के अधिकार वाले लीवर घुमाइए |
| `scenSub` | Budget, equity floor and rainfall are choices or risks — not model internals. Ev | बजट, समानता-सीमा और वर्षा — ये विकल्प या जोखिम हैं, मॉडल के भीतर की बातें नहीं। हर संयोजन  |
| `budget` | Budget | बजट |
| `equityFloor` | Equity floor (fluoride blocks) | समानता-सीमा (फ्लोराइड ब्लॉक) |
| `rainfallScenario` | Rainfall scenario | वर्षा परिदृश्य |
| `drier` | Drier −20% | शुष्क −20% |
| `normal` | Normal | सामान्य |
| `wetter` | Wetter +20% | आर्द्र +20% |
| `annualRecharge` | expected annual recharge | अपेक्षित वार्षिक पुनर्भरण |
| `structuresBuilt` | structures | संरचनाएँ |
| `blocksFunded` | blocks funded | वित्त-पोषित ब्लॉक |
| `topAllocations` | Largest allocations | सबसे बड़े आवंटन |
| `equityNote` | Watch the tension: raising the equity floor trades a little total recharge for g | तनाव देखिए: समानता-सीमा बढ़ाने से कुल पुनर्भरण थोड़ा घटता है, पर फ्लोराइड-प्रभावित क्षेत्र |
| `transKicker` | Show your work | प्रक्रिया दिखाइए |
| `transTitle` | Every number defends itself | हर संख्या स्वयं की रक्षा करती है |
| `trans1T` | Ground truth locked | आधार-सत्य सुनिश्चित |
| `trans1B` | The 2022 parse must reconcile to the published split — 302 blocks: 219 / 22 / 20 | 2022 का विश्लेषण प्रकाशित विभाजन से मेल खाना चाहिए — 302 ब्लॉक: 219/22/20/38/3। यह पूर्णतः |
| `trans2T` | The baseline won — we shipped it | आधार-रेखा जीती — हमने वही अपनाया |
| `trans2B` | Our LightGBM challenger lost to persistence on every backtest split, so persiste | हमारा LightGBM चैलेंजर हर बैकटेस्ट में persistence से हार गया, इसलिए persistence ही अंतिम  |
| `trans3T` | 5–7× sharper watchlist | 5–7× तीक्ष्ण निगरानी सूची |
| `trans3B` | The transition model's top-50 'likely to worsen' list hits 5–7× more true deteri | ट्रांज़िशन मॉडल की शीर्ष-50 सूची संयोग से 5–7 गुना अधिक वास्तविक गिरावटें पकड़ती है। निगरा |
| `maeChart` | Forecast error (MAE, stage points) | पूर्वानुमान त्रुटि (MAE) |
| `persistence` | Persistence (shipped) | Persistence (अपनाया गया) |
| `challenger` | LightGBM challenger | LightGBM चैलेंजर |
| `recallChart` | Transition model recall by year | वर्षवार ट्रांज़िशन रिकॉल |
| `sourcesTitle` | Sources | स्रोत |
| `sourcesLine` | CGWB Dynamic Ground Water Resource Assessments (PDF, 6 rounds) · INGRES verified | CGWB गतिशील भूजल संसाधन मूल्यांकन (PDF, 6 चक्र) · INGRES सत्यापित API (CGWB/IIT-H) · आधिका |
| `footerLine` | Built on public data for the people of Rajasthan · deterministic models decide,  | राजस्थान की जनता के लिए सार्वजनिक आँकड़ों पर निर्मित · निर्णय नियतात्मक मॉडल करते हैं, AI  |
