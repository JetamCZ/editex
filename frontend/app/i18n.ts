import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import cs from './locales/cs.json';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        cs: { translation: cs },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export function initLanguage() {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('language');
        const lang = saved && ['en', 'cs'].includes(saved)
            ? saved
            : navigator.language.split('-')[0];
        if (['en', 'cs'].includes(lang)) {
            i18n.changeLanguage(lang);
        }
    }
}

export function changeLanguage(lang: string) {
    i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang);
    }
}

export default i18n;
