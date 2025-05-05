// ./lib/translation.ts
import translationsJson from "./translation.json";

type TranslationEntry = {
  original: string;
  translations: Record<string, string>;
};

const translations = translationsJson as TranslationEntry[];

export const __ = (key: string): string => {
  const lang = process.env.NEXT_PUBLIC_APP_HTTP_LANG || "en";
  const supportedLanguages = process.env.NEXT_PUBLIC_APP_SUPPORTED_LANG?.split(",") || [];

  const translationEntry = translations.find(item => item.original === key);

  if (!translationEntry) {
    return key;
  }

  const translatedText = translationEntry.translations[lang];
  return supportedLanguages.includes(lang) ? translatedText || key : key;
};
