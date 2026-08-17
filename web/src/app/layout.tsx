import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jal-rajasthan.vercel.app"),
  title: "JAL · जल — Rajasthan Groundwater Intelligence",
  description:
    "Block-level groundwater risk, forecasting, fluoride exposure and MGNREGA-budget-optimised recharge planning for all 302 assessed blocks of Rajasthan. Official CGWB data, honest models, bilingual AI copilot.",
  keywords: [
    "Rajasthan", "groundwater", "CGWB", "INGRES", "MGNREGA", "water resources",
    "fluoride", "recharge", "जल", "भूजल",
  ],
  openGraph: {
    title: "JAL · जल — Rajasthan Groundwater Intelligence",
    description:
      "219 of 302 blocks over-exploited. Where should the next rupee of recharge money go? Forecasts, watchlists and a budget-optimised plan — every number traceable to an official source.",
    url: "https://jal-rajasthan.vercel.app",
    siteName: "JAL · जल",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JAL · जल — Rajasthan Groundwater Intelligence",
    description:
      "Diagnosis → forecast → exposure → prescription for Rajasthan's 302 groundwater blocks, on official data.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${grotesk.variable} ${mono.variable} ${devanagari.variable}`}
    >
      <body>
        <Providers>
          <div className="aurora" aria-hidden />
          {children}
        </Providers>
      </body>
    </html>
  );
}
