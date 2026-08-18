"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Holds a below-the-fold section back until the reader is within ~700px of it,
 * so its chunk (Recharts, the agent theater, the ledger) never competes with
 * first paint. Reserves the section's height up front so nothing shifts when the
 * real component lands, and keeps the anchor id alive so nav links still work
 * before the section has mounted.
 */
export function Deferred({
  id,
  height = 520,
  label,
  children,
}: {
  id: string;
  height?: number;
  label?: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // no IntersectionObserver (or an anchor jump straight to this section) —
    // render immediately rather than leave a permanent skeleton
    if (typeof IntersectionObserver === "undefined") return setShow(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "700px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (show) return <>{children}</>;

  return (
    <section
      ref={ref}
      id={id}
      className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20"
      aria-busy="true"
      aria-label={label ? `${label} — loading` : "Section loading"}
    >
      <div className="skeleton h-3 w-40 rounded-full" />
      <div className="skeleton mt-4 h-9 w-2/3 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-full max-w-3xl rounded" />
      <div className="skeleton mt-2 h-4 w-4/5 max-w-2xl rounded" />
      <div className="skeleton mt-8 rounded-2xl" style={{ height }} />
    </section>
  );
}
