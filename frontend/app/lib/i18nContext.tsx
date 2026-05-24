"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "@/app/locales/en";
import { am } from "@/app/locales/am";

export type Locale = "en" | "am";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries: Record<Locale, Record<string, any>> = {
  en,
  am,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale;
    if (savedLocale && (savedLocale === "en" || savedLocale === "am")) {
      setLocaleState(savedLocale);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key: string, replacements?: Record<string, string>) => {
    const keys = key.split(".");
    let value: any = dictionaries[locale];

    for (const k of keys) {
      if (value === undefined) break;
      value = value[k];
    }

    if (value === undefined || typeof value !== "string") {
      let fallbackValue: any = dictionaries["en"];
      for (const k of keys) {
        if (fallbackValue === undefined) break;
        fallbackValue = fallbackValue[k];
      }
      if (fallbackValue !== undefined && typeof fallbackValue === "string") {
        value = fallbackValue;
      } else {
        return key;
      }
    }

    if (replacements) {
      Object.keys(replacements).forEach((replKey) => {
        value = value.replace(new RegExp(`{${replKey}}`, "g"), replacements[replKey]);
      });
    }

    return value;
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback for components rendered before the provider mounts
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      t: (key: string) => key,
    };
  }
  return context;
};
