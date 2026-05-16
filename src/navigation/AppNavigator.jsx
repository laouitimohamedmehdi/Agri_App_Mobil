import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { changeLanguage } from '../i18n';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import { DrawerContext } from '../contexts/DrawerContext';
import { navigationRef } from './navigationRef';
import DashboardScreen from '../screens/Dashboard';
import TravailAgricoleScreen from '../screens/TravailAgricole';
import RecoltesScreen from '../screens/Recoltes';
import PresencesScreen from '../screens/Presences';
import DemandesScreen from '../screens/Demandes';
import ParcellesSecteurs from '../screens/ParcellesSecteurs';
import Varietes from '../screens/Varietes';
import RH from '../screens/RH';
import Parametres from '../screens/Parametres';
import Notifications from '../screens/Notifications';
import Depenses from '../screens/Depenses';

const Tab = createBottomTabNavigator();
const ExtraStack = createStackNavigator();

const TAB_ICONS = {
  Dashboard: 'speedometer',
  Travaux: 'tractor',
  'Récoltes': 'basket',
  'Présences': 'calendar-month',
  Demandes: 'clipboard-list',
};

function ExtraScreens() {
  return (
    <ExtraStack.Navigator screenOptions={{ headerShown: false }}>
      <ExtraStack.Screen name="ParcellesSecteurs" component={ParcellesSecteurs} />
      <ExtraStack.Screen name="Varietes" component={Varietes} />
      <ExtraStack.Screen name="RH" component={RH} />
      <ExtraStack.Screen name="Parametres" component={Parametres} />
      <ExtraStack.Screen name="Notifications" component={Notifications} />
      <ExtraStack.Screen name="Depenses" component={Depenses} />
    </ExtraStack.Navigator>
  );
}

function TabsWithDrawer() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [drawerVisible, setDrawerVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const openDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const navigateTo = (item) => {
    closeDrawer();
    if (!navigationRef.isReady()) return;
    if (item.tab) {
      navigationRef.navigate(item.tab);
    } else {
      navigationRef.navigate('Extra', { screen: item.screen });
    }
  };

  const menuItems = [
    { label: t('menu.dashboard'), icon: 'speedometer', tab: 'Dashboard' },
    { label: t('menu.presences'), icon: 'calendar-month', tab: 'Présences' },
    { divider: true, title: t('menu.groups.exploitation') },
    { label: t('menu.plots_sectors'), icon: 'map', screen: 'ParcellesSecteurs' },
    { divider: true, title: t('menu.groups.production') },
    { label: t('menu.works'), icon: 'tractor', tab: 'Travaux' },
    { label: t('menu.expenses'), icon: 'receipt', screen: 'Depenses' },
    { label: t('menu.harvests'), icon: 'basket', tab: 'Récoltes' },
    { divider: true, title: t('menu.groups.referential') },
    { label: t('menu.varieties'), icon: 'leaf', screen: 'Varietes' },
    ...(isAdmin ? [
      { divider: true, title: t('menu.groups.admin') },
      { label: t('menu.rh'), icon: 'account-tie', screen: 'RH' },
      { label: t('menu.requests'), icon: 'clipboard-list', tab: 'Demandes' },
      { label: t('menu.settings'), icon: 'cog', screen: 'Parametres' },
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
          options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
      </Tab.Navigator>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer} statusBarTranslucent>
        <View style={styles.modalContainer}>
          <View style={[styles.drawerPanel, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.drawerHeader}>
              <MaterialCommunityIcons name="account-circle" size={48} color="#2d7a4a" />
              <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: 'bold' }}>{user?.nom}</Text>
              <Text variant="bodySmall" style={{ color: '#666' }}>{user?.email}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                {[{ code: 'fr', label: 'FR' }, { code: 'en', label: 'EN' }, { code: 'ar', label: 'ع' }].map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      closeDrawer();
                    }}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                      backgroundColor: i18n.language === lang.code ? '#2d7a4a' : '#e8f5e9',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: i18n.language === lang.code ? '#fff' : '#2d7a4a' }}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Divider />
            <ScrollView>
              {menuItems.map((item, i) => {
                if (item.divider) {
                  return (
                    <View key={`div-${i}`} style={styles.menuSection}>
                      <View style={styles.menuSectionLine} />
                      <Text style={styles.menuSectionTitle}>{item.title}</Text>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity key={i} style={styles.menuItem} onPress={() => navigateTo(item)}>
                    <MaterialCommunityIcons name={item.icon} size={20} color="#2d7a4a" style={{ marginRight: 14 }} />
                    <Text variant="bodyMedium">{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Divider />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeDrawer(); logout(); }}>
              <MaterialCommunityIcons name="logout" size={22} color="#c0392b" style={{ marginRight: 14 }} />
              <Text variant="bodyLarge" style={{ color: '#c0392b' }}>{t('mobile.logout')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.overlay} onPress={closeDrawer} activeOpacity={1} />
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, flexDirection: 'row' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerPanel: { width: 280, backgroundColor: '#fff', elevation: 16, shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 },
  drawerHeader: { padding: 20, alignItems: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  menuSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  menuSectionLine: { height: 1, backgroundColor: '#e8f0e4', marginBottom: 8 },
  menuSectionTitle: { fontSize: 11, fontWeight: '800', color: '#7a9a7a', letterSpacing: 1.2, textTransform: 'uppercase' },
});

export default function AppNavigator() {
  return (
    <DataProvider>
      <TabsWithDrawer />
    </DataProvider>
  );
}
