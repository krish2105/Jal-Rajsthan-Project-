"use client";

import { ThemeProvider } from "next-themes";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { LangProvider } from "./i18n";

function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.12, wheelMultiplier: 0.9, anchors: true }}>
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LangProvider>
        <SmoothScroll>{children}</SmoothScroll>
      </LangProvider>
    </ThemeProvider>
  );
}
