import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

const CURRENCY_SYMBOLS = {
  euro: '€',
  dollar: '$',
  dinar: 'دت',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
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

  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? 'DT';

  return (
    <SettingsContext.Provider value={{ currency, currencySymbol, updateCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
