/**
 * One chart system for the whole platform.
 *
 * The editorial rule: colour carries meaning or it stays quiet. The four
 * groundwater categories are the only saturated hues on the page, because they
 * are the only ones a reader must decode (safe → over-exploited). Everything
 * else is drawn in a graduated teal/slate ramp, with a single accent reserved
 * for the series each chart is actually about. A chart that colours every
 * series differently forces the eye to work out what matters; a chart with one
 * accent has already answered that.
 */

/** Neutral series — use for anything without inherent meaning. Ordered light→dark
 *  so adjacent series stay distinguishable on both themes. */
export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

/** The one colour allowed to shout: the series the chart is making a point about. */
export const ACCENT = "var(--accent)";
/** Everything the accent is being compared against. */
export const MUTED = "var(--chart-muted)";

/** Recharts tooltip. The default inherits the series colour for item text, which
 *  on a dark surface renders a red scatter's label almost black — every tooltip
 *  therefore sets its own foreground explicitly. */
export const TT = {
  contentStyle: {
    background: "var(--bg-elev)",
    border: "1px solid var(--surface-border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text)",
    boxShadow: "0 8px 28px rgb(0 0 0 / 0.35)",
    padding: "8px 10px",
  },
  itemStyle: { color: "var(--text)", padding: 0 },
  labelStyle: { color: "var(--text-3)", marginBottom: 4, fontSize: 11 },
  cursor: { fill: "var(--grid-line)" },
} as const;

/** Axis ticks and gridlines, so no chart re-invents them. */
export const AXIS = {
  tick: { fontSize: 11, fill: "var(--text-3)" },
  stroke: "var(--axis-line)",
} as const;

export const GRID = { stroke: "var(--grid-line)", strokeDasharray: "3 3" } as const;

/** Pick a series colour by index, wrapping. */
export const seriesColor = (i: number) => SERIES[i % SERIES.length];
