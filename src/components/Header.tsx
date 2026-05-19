"use client";

import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "./LocaleContext";

export function Header({ subtitle }: { subtitle?: string }) {
  const { t } = useLocale();
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-ink-900 font-black text-lg shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
          F
        </div>
        <div className="leading-tight">
          <div className="text-white font-semibold tracking-tight">
            {t("app.name")}
          </div>
          <div className="text-xs text-ink-400">
            {subtitle ?? t("app.tagline")}
          </div>
        </div>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
