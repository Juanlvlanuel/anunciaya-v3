import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traducciones directamente (se empaquetan en la app)
import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esLanding from '../locales/es/landing.json';

import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enLanding from '../locales/en/landing.json';

const resources = {
  es: {
    common: esCommon,
    auth: esAuth,
    landing: esLanding,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    landing: enLanding,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    defaultNS: 'common',

    // AnunciaYA es una app en español mexicano por defecto — SIEMPRE.
    // Sin 'navigator' en el orden: el idioma del navegador/SO (ej. Chrome
    // en incógnito reportando inglés) ya no puede pisar el default. Solo
    // cambia si el usuario lo elige a mano con `SelectorIdioma` (que sí
    // persiste en localStorage vía `i18n.changeLanguage()`).
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    lng: 'es',

    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },
  });

export default i18n;