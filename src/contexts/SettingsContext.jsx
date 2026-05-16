import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

const CURRENCY_SYMBOLS = {
  euro: '€',
  dollar: '$',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { i18n } = useTranslation();
  const [currency, setCurrency] = useState('dinar');

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('olivipro_token');
      if (!token) return;
      client.get('/settings/')
        .then(res => { if (res.data.currency) setCurrency(res.data.currency); })
        .catch(() => {});
    })();
  }, []);

  const updateCurrency = async (value) => {
    await client.put('/settings/currency', { value });
    setCurrency(value);
  };

  const currencySymbol = currency === 'dinar'
    ? (i18n.language === 'ar' ? 'دت' : 'DT')
    : (CURRENCY_SYMBOLS[currency] ?? 'DT');

  return (
    <SettingsContext.Provider value={{ currency, currencySymbol, updateCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
