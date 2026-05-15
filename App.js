import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import RootNavigator from './src/navigation/RootNavigator';
import OfflineBanner from './src/components/OfflineBanner';
import { agriproTheme } from './src/theme';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  return (
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
  );
}
