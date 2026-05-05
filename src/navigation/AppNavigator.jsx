import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import MainTabs from './MainTabs';
import ParcellesSecteurs from '../screens/ParcellesSecteurs';
import TravailAgricole from '../screens/TravailAgricole';
import Recoltes from '../screens/Recoltes';
import Fertilisation from '../screens/Fertilisation';
import Varietes from '../screens/Varietes';
import Presences from '../screens/Presences';
import RH from '../screens/RH';
import Demandes from '../screens/Demandes';
import Utilisateurs from '../screens/Utilisateurs';
import Dashboard from '../screens/Dashboard';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      <View style={styles.drawerHeader}>
        <MaterialCommunityIcons name="account-circle" size={48} color="#2d7a4a" />
        <Text variant="titleMedium" style={styles.drawerName}>{user?.nom}</Text>
        <Text variant="bodySmall" style={styles.drawerEmail}>{user?.email}</Text>
      </View>
      <Divider />
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <Divider />
      <DrawerItem
        label="Déconnexion"
        icon={({ color, size }) => <MaterialCommunityIcons name="logout" size={size} color="#c0392b" />}
        labelStyle={{ color: '#c0392b' }}
        onPress={logout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  drawerHeader: { padding: 20, paddingTop: 48, alignItems: 'center', gap: 4 },
  drawerName: { marginTop: 8, fontWeight: 'bold' },
  drawerEmail: { color: '#666' },
});

function DrawerScreens() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }} drawerContent={(props) => <CustomDrawerContent {...props} />}>
      <Drawer.Screen name="Accueil" component={MainTabs} options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="Dashboard" component={Dashboard} />
      <Drawer.Screen name="Parcelles & Secteurs" component={ParcellesSecteurs} />
      <Drawer.Screen name="Travaux Agricoles" component={TravailAgricole} />
      <Drawer.Screen name="Récoltes" component={Recoltes} />
      <Drawer.Screen name="Fertilisation" component={Fertilisation} />
      <Drawer.Screen name="Variétés" component={Varietes} />
      <Drawer.Screen name="Présences" component={Presences} />
      {isAdmin && <Drawer.Screen name="RH" component={RH} />}
      {isAdmin && <Drawer.Screen name="Demandes" component={Demandes} />}
      {isAdmin && <Drawer.Screen name="Utilisateurs" component={Utilisateurs} />}
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <DataProvider>
      <DrawerScreens />
    </DataProvider>
  );
}
