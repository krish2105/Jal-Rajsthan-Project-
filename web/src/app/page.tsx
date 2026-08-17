import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Story } from "@/components/Story";
import { Dashboard } from "@/components/Dashboard";
import { PriorityTable } from "@/components/PriorityTable";
import { ScenarioStudio } from "@/components/ScenarioStudio";
import { Transparency } from "@/components/Transparency";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Story />
      <Dashboard />
      <PriorityTable />
      <ScenarioStudio />
      <Transparency />
      <Footer />
    </main>
  );
}
