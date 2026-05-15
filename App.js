import React, { useState, useEffect } from 'react';
import { View, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from './src/i18n';
import { AuthProvider } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import RootNavigator from './src/navigation/RootNavigator';
import OfflineBanner from './src/components/OfflineBanner';
import { agriproTheme } from './src/theme';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then((lang) => {
      if (lang === 'ar') I18nManager.forceRTL(true);
      else I18nManager.forceRTL(false);
      setI18nReady(true);
    });
  }, []);

  if (!i18nReady) return <View style={{ flex: 1 }} />;

  return (
    <I18nextProvider i18n={i18n}>
      <SettingsProvider>
        <NetworkProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PaperProvider theme={agriproTheme}>
              <NavigationContainer ref={navigationRef}>
                <AuthProvider>
                  <OfflineBanner />
                  <RootNavigator />
                </AuthProvider>
              </NavigationContainer>
            </PaperProvider>
          </GestureHandlerRootView>
        </NetworkProvider>
      </SettingsProvider>
    </I18nextProvider>
  );
}
