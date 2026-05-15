import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

const LANG_KEY = 'app_language';

const getSavedLanguage = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (!AsyncStorage) return null;
    return await AsyncStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
};

const getDeviceLanguage = () => {
  try {
    const Localization = require('expo-localization');
    return Localization.getLocales()[0]?.languageCode || null;
  } catch {
    return null;
  }
};

export const changeLanguage = async (lang) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage) await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {}
  await i18n.changeLanguage(lang);
};

export const initI18n = async () => {
  // Toujours initialiser i18n, même si AsyncStorage/Localization échouent
  const stored = await getSavedLanguage();
  const device = getDeviceLanguage();
  const lang = stored || device || 'fr';

  await i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: lang,
    fallbackLng: 'fr',
    compatibilityJSON: 'v3',
    interpolation: { escapeValue: false },
  });
  return lang;
};

export default i18n;
