import React, { useState, createContext, useContext } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import DashboardScreen from '../screens/Dashboard';
import TravailAgricoleScreen from '../screens/TravailAgricole';
import RecoltesScreen from '../screens/Recoltes';
import PresencesScreen from '../screens/Presences';
import DemandesScreen from '../screens/Demandes';
import ParcellesSecteurs from '../screens/ParcellesSecteurs';
import Fertilisation from '../screens/Fertilisation';
import Varietes from '../screens/Varietes';
import RH from '../screens/RH';
import Utilisateurs from '../screens/Utilisateurs';
import Notifications from '../screens/Notifications';

const Tab = createBottomTabNavigator();
const ExtraStack = createStackNavigator();

export const DrawerContext = createContext({ openDrawer: () => {} });
export const useDrawer = () => useContext(DrawerContext);

const TAB_ICONS = {
  Dashboard: 'view-dashboard',
  Travaux: 'shovel',
  'Récoltes': 'basket',
  'Présences': 'account-clock',
  Demandes: 'file-document-outline',
};

function ExtraScreens() {
  return (
    <ExtraStack.Navigator screenOptions={{ headerShown: false }}>
      <ExtraStack.Screen name="ParcellesSecteurs" component={ParcellesSecteurs} />
      <ExtraStack.Screen name="Fertilisation" component={Fertilisation} />
      <ExtraStack.Screen name="Varietes" component={Varietes} />
      <ExtraStack.Screen name="RH" component={RH} />
      <ExtraStack.Screen name="Utilisateurs" component={Utilisateurs} />
      <ExtraStack.Screen name="Notifications" component={Notifications} />
    </ExtraStack.Navigator>
  );
}

function TabsWithDrawer() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [drawerVisible, setDrawerVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const openDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const navigateTo = (item) => {
    closeDrawer();
    if (item.tab) {
      navigation.navigate(item.tab);
    } else {
      navigation.navigate('Extra', { screen: item.screen });
    }
  };

  const menuItems = [
    { label: 'Dashboard', icon: 'view-dashboard', tab: 'Dashboard' },
    { label: 'Travaux Agricoles', icon: 'shovel', tab: 'Travaux' },
    { label: 'Récoltes', icon: 'basket', tab: 'Récoltes' },
    { label: 'Présences', icon: 'account-clock', tab: 'Présences' },
    { label: 'Parcelles & Secteurs', icon: 'map-marker-multiple', screen: 'ParcellesSecteurs' },
    { label: 'Fertilisation', icon: 'sprout', screen: 'Fertilisation' },
    { label: 'Variétés', icon: 'leaf', screen: 'Varietes' },
    ...(isAdmin ? [
      { label: 'Demandes', icon: 'file-document-outline', tab: 'Demandes' },
      { label: 'RH', icon: 'account-group', screen: 'RH' },
      { label: 'Utilisateurs', icon: 'account-cog', screen: 'Utilisateurs' },
    ] : []),
  ];

  return (
    <DrawerContext.Provider value={{ openDrawer }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
          ),
          tabBarActiveTintColor: '#2d7a4a',
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Travaux" component={TravailAgricoleScreen} />
        <Tab.Screen name="Récoltes" component={RecoltesScreen} />
        <Tab.Screen name="Présences" component={PresencesScreen} />
        {isAdmin && <Tab.Screen name="Demandes" component={DemandesScreen} />}
        <Tab.Screen
          name="Extra"
          component={ExtraScreens}
          options={{ tabBarButton: () => null }}
        />
      </Tab.Navigator>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer} statusBarTranslucent>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.overlay} onPress={closeDrawer} activeOpacity={1} />
          <View style={[styles.drawerPanel, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.drawerHeader}>
              <MaterialCommunityIcons name="account-circle" size={48} color="#2d7a4a" />
              <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: 'bold' }}>{user?.nom}</Text>
              <Text variant="bodySmall" style={{ color: '#666' }}>{user?.email}</Text>
            </View>
            <Divider />
            <ScrollView>
              {menuItems.map((item, i) => (
                <TouchableOpacity key={i} style={styles.menuItem} onPress={() => navigateTo(item)}>
                  <MaterialCommunityIcons name={item.icon} size={22} color="#2d7a4a" style={{ marginRight: 14 }} />
                  <Text variant="bodyLarge">{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Divider />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeDrawer(); logout(); }}>
              <MaterialCommunityIcons name="logout" size={22} color="#c0392b" style={{ marginRight: 14 }} />
              <Text variant="bodyLarge" style={{ color: '#c0392b' }}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, flexDirection: 'row' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerPanel: { width: 280, backgroundColor: '#fff', elevation: 16, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 },
  drawerHeader: { padding: 20, alignItems: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
});

export default function AppNavigator() {
  return (
    <DataProvider>
      <TabsWithDrawer />
    </DataProvider>
  );
}
