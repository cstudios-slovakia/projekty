import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../i18n/en.json';
import skTranslations from '../i18n/sk.json';
import huTranslations from '../i18n/hu.json';

const allTranslations: Record<string, any> = {
  en: enTranslations,
  sk: skTranslations,
  hu: huTranslations
};

type Translations = { [key: string]: any };

interface LanguageContextType {
  locale: string;
  t: (key: string) => string;
  changeLanguage: (lang: string, userId?: number) => Promise<void>;
  isLoading: boolean;
  availableLocales: { code: string; name: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode, initialLocale?: string }> = ({ children, initialLocale = 'en' }) => {
  const [locale, setLocale] = useState(initialLocale);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadTranslations = (lang: string) => {
    setIsLoading(true);
    if (allTranslations[lang]) {
      setTranslations(allTranslations[lang]);
    } else {
      console.warn(`Translations for ${lang} not statically bundled, falling back to en`);
      setTranslations(allTranslations['en']);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTranslations(locale);
  }, [locale]);


  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations;
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return key; // Return the key itself if not found
      }
    }
    return typeof result === 'string' ? result : key;
  };

  const changeLanguage = async (lang: string, userId?: number) => {
    setLocale(lang);
    if (userId) {
      try {
        await fetch(`/api/users.php?id=${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang })
        });
      } catch (e) {
        console.error("Failed to persist language preference", e);
      }
    }
  };

  const availableLocales = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
    { code: 'hu', name: 'Magyar', flag: '🇭🇺' }
  ];

  return (
    <LanguageContext.Provider value={{ locale, t, changeLanguage, isLoading, availableLocales }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
