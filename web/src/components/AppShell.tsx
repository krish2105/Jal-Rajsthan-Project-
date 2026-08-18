"use client";

import dynamic from "next/dynamic";
import { Deferred } from "@/components/Deferred";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Story } from "@/components/Story";
import { Dashboard } from "@/components/Dashboard";
import { Districts } from "@/components/Districts";
import { ExecutiveBand } from "@/components/ExecutiveBand";
import { PriorityTable } from "@/components/PriorityTable";
import { Footer } from "@/components/Footer";
import { CopilotDock } from "@/components/CopilotDock";
import { GuidedTour } from "@/components/GuidedTour";
import { can, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const Analytics = dynamic(() => import("@/components/Analytics").then((m) => m.Analytics));
const WorksLedger = dynamic(() => import("@/components/WorksLedger").then((m) => m.WorksLedger));
const Schemes = dynamic(() => import("@/components/Schemes").then((m) => m.Schemes));
const WSPStudio = dynamic(() => import("@/components/WSPStudio").then((m) => m.WSPStudio));
const ScenarioStudio = dynamic(() => import("@/components/ScenarioStudio").then((m) => m.ScenarioStudio));
const AgentTheater = dynamic(() => import("@/components/AgentTheater").then((m) => m.AgentTheater));
const Transparency = dynamic(() => import("@/components/Transparency").then((m) => m.Transparency));
const DataHealth = dynamic(() => import("@/components/DataHealth").then((m) => m.DataHealth));

export function AppShell() {
  const { session, ready } = useAuth();
  const { lang } = useLang();
  if (!ready) return <div className="min-h-svh" aria-hidden />;
  if (!session) return null; // middleware redirects; this is a race guard

  const role = session.role;

  return (
    <main>
      <Nav />
      <Hero />
      <ExecutiveBand />
      <Story />
      <Dashboard />
      <Districts />
      <Deferred id="analytics" height={560} label="Analytics">
        <Analytics />
      </Deferred>
      <PriorityTable />
      <Deferred id="ledger" height={520} label="Works ledger">
        <WorksLedger />
      </Deferred>
      <Deferred id="schemes" height={460} label="Schemes">
        <Schemes />
      </Deferred>
      <Deferred id="wsp" height={420} label="WSP Studio">
        <WSPStudio />
      </Deferred>
      {can.runScenarios(role) ? (
        <Deferred id="scenarios" height={520} label="Scenario studio">
          <ScenarioStudio />
        </Deferred>
      ) : (
        <section id="scenarios" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-10">
          <p className="glass-lite rounded-2xl p-5 text-sm text-[color:var(--text-3)]">
            {lang === "hi"
              ? "परिदृश्य स्टूडियो सचिव/विश्लेषक भूमिकाओं के लिए है — ज़िला अधिकारी दृश्य में राज्य-बजट लीवर सम्मिलित नहीं हैं।"
              : "The scenario studio is available to Secretary/Analyst roles — state-budget levers aren't part of the district-officer view."}
          </p>
        </section>
      )}
      {can.seePipeline(role) && (
        <Deferred id="agents" height={560} label="Agent pipeline">
          <AgentTheater />
        </Deferred>
      )}
      <Deferred id="transparency" height={560} label="Transparency">
        <Transparency />
      </Deferred>
      <Deferred id="datahealth" height={420} label="Data health">
        <DataHealth />
      </Deferred>
      <Footer />
      <CopilotDock />
      <GuidedTour />
    </main>
  );
}
