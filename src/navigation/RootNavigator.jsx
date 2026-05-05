import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/Login';
import AppNavigator from './AppNavigator';
import LoadingOverlay from '../components/LoadingOverlay';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) return <LoadingOverlay />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
