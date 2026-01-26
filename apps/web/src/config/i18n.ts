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

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },
  });

export default i18n;