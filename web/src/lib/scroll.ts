/**
 * Lenis owns the scroll position: it runs its own rAF loop and continuously
 * re-asserts its internal target, so window.scrollTo, element.scrollIntoView and
 * hash navigation are all silently reverted. Anything that needs to move the
 * page therefore has to go through the Lenis instance, which providers.tsx
 * publishes here (React context is unreliable across chunk boundaries).
 */
type LenisLike = { scrollTo: (target: number | string | HTMLElement, opts?: Record<string, unknown>) => void };

/* Held on `window`, not in a module variable: providers.tsx ships in the layout
   chunk while callers live in page chunks, and a duplicated module would give
   each side its own copy of the handle — the writer would set one and the
   reader would forever see null. */
const KEY = "__jalLenis";

function instanceOf(): LenisLike | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as Record<string, LenisLike | null>)[KEY] ?? null);
}

export function registerLenis(l: LenisLike | null) {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, LenisLike | null>)[KEY] = l;
}

export function scrollPageTo(target: number | HTMLElement | string, opts: { instant?: boolean; offset?: number } = {}) {
  const { instant = false, offset = 0 } = opts;
  const lenis = instanceOf();
  if (lenis) {
    lenis.scrollTo(target, { duration: instant ? 0 : 0.7, offset });
    return;
  }
  // no smooth-scroll layer (reduced motion, or before hydration) — native works
  if (typeof target === "number") {
    window.scrollTo({ top: Math.max(0, target + offset), behavior: instant ? "auto" : "smooth" });
    return;
  }
  const el = typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
}

/** Centre an element in the viewport — used by the guided tour's spotlight. */
export function centreOnElement(el: HTMLElement, instant = false) {
  const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + el.offsetHeight / 2;
  scrollPageTo(Math.max(0, top), { instant });
}
