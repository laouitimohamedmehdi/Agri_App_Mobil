import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import RootNavigator from './src/navigation/RootNavigator';
import { agriproTheme } from './src/theme';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  return (
    <SettingsProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={agriproTheme}>
          <NavigationContainer ref={navigationRef}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
        </PaperProvider>
      </GestureHandlerRootView>
    </SettingsProvider>
  );
}
