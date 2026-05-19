"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALES, t as translate } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? window.localStorage.getItem("faster.locale")
      : null) as Locale | null;
    if (saved && LOCALES.includes(saved)) setLocaleState(saved);
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale: (l) => {
        setLocaleState(l);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("faster.locale", l);
        }
      },
      t: (key: string) => translate(locale, key),
    }),
    [locale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("LocaleProvider missing");
  return v;
}
