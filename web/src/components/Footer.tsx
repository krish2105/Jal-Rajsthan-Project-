"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-[color:var(--surface-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center">
        <span className="font-[family-name:var(--font-display)] text-lg font-bold">
          <span className="text-gradient">JAL</span> · जल
        </span>
        <p className="max-w-xl text-xs leading-relaxed text-[color:var(--text-3)]">{t("footerLine")}</p>
        <p className="flex gap-4 text-xs">
          <Link href="/explorer" className="text-[color:var(--accent)] hover:underline">Aquifer Explorer</Link>
          <Link href="/public" className="text-[color:var(--accent)] hover:underline">जन-पोर्टल</Link>
          <Link href="/admin" className="text-[color:var(--accent)] hover:underline">Admin</Link>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--text-3)]">
          CGWB · INGRES (IIT-H) · Census 2011 · MGNREGA
        </p>
      </div>
    </footer>
  );
}
