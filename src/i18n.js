import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

const LANG_KEY = 'app_language';

export const changeLanguage = async (lang) => {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
};

export const initI18n = async () => {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    const lang = stored || Localization.getLocales()[0]?.languageCode || 'fr';
    await i18n.use(initReactI18next).init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        ar: { translation: ar },
      },
      lng: lang,
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
    });
    return lang;
  } catch {
    return 'fr';
  }
};

export default i18n;
