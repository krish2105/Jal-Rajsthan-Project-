"use client";

import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Story } from "@/components/Story";
import { Dashboard } from "@/components/Dashboard";
import { Districts } from "@/components/Districts";
import { ExecutiveBand } from "@/components/ExecutiveBand";
import { Schemes } from "@/components/Schemes";
import { WSPStudio } from "@/components/WSPStudio";
import { PriorityTable } from "@/components/PriorityTable";
import { ScenarioStudio } from "@/components/ScenarioStudio";
import { AgentTheater } from "@/components/AgentTheater";
import { Transparency } from "@/components/Transparency";
import { DataHealth } from "@/components/DataHealth";
import { Footer } from "@/components/Footer";
import { CopilotDock } from "@/components/CopilotDock";
import { can, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export function AppShell() {
  const { session } = useAuth();
  const { lang } = useLang();
  if (!session) return null;

  const role = session.role;

  return (
    <main>
      <Nav />
      <Hero />
      <ExecutiveBand />
      <Story />
      <Dashboard />
      <Districts />
      <PriorityTable />
      <Schemes />
      <WSPStudio />
      {can.runScenarios(role) ? (
        <ScenarioStudio />
      ) : (
        <section id="scenarios" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-10">
          <p className="glass-lite rounded-2xl p-5 text-sm text-[color:var(--text-3)]">
            {lang === "hi"
              ? "परिदृश्य स्टूडियो सचिव/विश्लेषक भूमिकाओं के लिए है — ज़िला अधिकारी दृश्य में राज्य-बजट लीवर सम्मिलित नहीं हैं।"
              : "The scenario studio is available to Secretary/Analyst roles — state-budget levers aren't part of the district-officer view."}
          </p>
        </section>
      )}
      {can.seePipeline(role) && <AgentTheater />}
      <Transparency />
      <DataHealth />
      <Footer />
      <CopilotDock />
    </main>
  );
}
