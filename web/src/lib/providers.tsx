"use client";

import { ThemeProvider } from "next-themes";
import { ReactLenis, useLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { LangProvider } from "./i18n";
import { registerLenis } from "./scroll";

/* Publishes the Lenis instance for scrollPageTo(). This has to run *inside*
   ReactLenis: the imperative ref is not populated yet when the parent's effect
   fires, whereas the context hook is. With nothing published, scrollPageTo
   falls back to native scrolling — correct when Lenis is not mounted at all. */
function LenisBridge() {
  const lenis = useLenis();
  useEffect(() => {
    registerLenis(lenis ?? null);
    return () => registerLenis(null);
  }, [lenis]);
  return null;
}

function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.12, wheelMultiplier: 0.9, anchors: true }}>
      <LenisBridge />
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {/* reducedMotion="user" drops transform and layout animations for anyone
          who has asked their OS for less motion — parallax, the 3D hero drift
          and the spring transitions all go static, while opacity fades stay */}
      <MotionConfig reducedMotion="user">
        <LangProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </LangProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
