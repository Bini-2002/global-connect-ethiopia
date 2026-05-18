// components/LoginHeader.tsx
"use client";

import Image from "next/image";
import { useTranslation, Locale } from "@/app/lib/i18nContext";

export default function LoginHeader() {
  const { locale, setLocale, t } = useTranslation();

  const languages: Locale[] = ["en", "am"];

  return (
    <header className="w-full fixed top-0 left-0 bg-white flex justify-between items-center px-20 h-[72px] text-[#062E22] shadow-md z-50">
      {/* Logo / Title */}
      <div className="flex items-center gap-4 font-bold text-xl">
        <Image alt="Global Connect Logo" src="/logo.png" width={40} height={40} />
        <span>{locale === "en" ? "Global Connect Ethiopia" : "ግሎባል ኮኔክት ኢትዮጵያ"}</span>
      </div>

      {/* Language Toggle */}
      <div className="flex bg-[#F1F5F9] h-9 w-24 p-1 rounded-lg overflow-hidden">
        {languages.map((lang) => {
          const isActive = locale === lang;
          return (
            <button
              key={lang}
              onClick={() => setLocale(lang)}
              className={`flex-1 flex justify-center items-center text-xs font-bold transition-colors rounded-lg duration-200 ${
                isActive ? "bg-white text-[#062E22]" : "text-[#64748B]"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          );
        })}
      </div>
    </header>
  );
}