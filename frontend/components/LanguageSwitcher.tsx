"use client";

import React from "react";
import { useTranslation, Locale } from "@/app/lib/i18nContext";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-transparent border border-slate-300 text-sm rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-[#062E22] text-slate-700 font-medium"
      >
        <option value="en">{t("common.english")}</option>
        <option value="am">{t("common.amharic")}</option>
      </select>
    </div>
  );
}
