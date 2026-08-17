import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fmtInt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

export const fmtLakhCr = (lakh: number) =>
  lakh >= 100 ? `₹${(lakh / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr` : `₹${fmtInt(lakh)} L`;

export const fmtPct = (n: number, d = 0) => `${n.toFixed(d)}%`;

export const CATEGORY_COLORS: Record<string, string> = {
  safe: "#34d399",
  semi_critical: "#38bdf8",
  critical: "#fbbf24",
  over_exploited: "#f87171",
  saline: "#a3a3a3",
};

export const CATEGORY_COLORS_LIGHT: Record<string, string> = {
  safe: "#059669",
  semi_critical: "#0284c7",
  critical: "#d97706",
  over_exploited: "#dc2626",
  saline: "#737373",
};
