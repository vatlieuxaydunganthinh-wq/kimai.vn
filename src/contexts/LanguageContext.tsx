import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "vi" | "en";

const USD_RATE = 27000;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (vi: string, en: string) => string;
  price: (vnd: number) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "vi",
  setLang: () => {},
  t: (vi) => vi,
  price: (vnd) => vnd.toLocaleString("vi-VN") + "đ",
});

function getLang(): Lang {
  try { return (localStorage.getItem("lang") as Lang) || "vi"; } catch { return "vi"; }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };

  const t = (vi: string, en: string) => lang === "en" ? en : vi;

  const price = (vnd: number) => {
    if (lang === "en") {
      const usd = vnd / USD_RATE;
      return `$${usd.toFixed(2)}`;
    }
    return vnd.toLocaleString("vi-VN") + "đ";
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, price }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
