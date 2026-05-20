"use client";

import { LOCALES, LOCALE_LABEL } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { useLocale } from "./LocaleContext";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={
            "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
            (locale === l
              ? "bg-brand-500 text-ink-900"
              : "text-ink-200 hover:text-white")
          }
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
