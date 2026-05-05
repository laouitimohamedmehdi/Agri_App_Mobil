import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from '../screens/Dashboard';
import TravailAgricoleScreen from '../screens/TravailAgricole';
import RecoltesScreen from '../screens/Recoltes';
import PresencesScreen from '../screens/Presences';
import DemandesScreen from '../screens/Demandes';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

const icons = {
  Dashboard: 'view-dashboard',
  Travaux: 'shovel',
  'Récoltes': 'basket',
  'Présences': 'account-clock',
  'Demandes': 'file-document-outline',
};

export default function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: '#2d7a4a',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Travaux" component={TravailAgricoleScreen} />
      <Tab.Screen name="Récoltes" component={RecoltesScreen} />
      <Tab.Screen name="Présences" component={PresencesScreen} />
      {isAdmin && <Tab.Screen name="Demandes" component={DemandesScreen} />}
    </Tab.Navigator>
  );
}
