import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useNetwork();

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.syncing : styles.offline]}>
      <MaterialCommunityIcons
        name={isOnline ? 'cloud-sync' : 'wifi-off'}
        size={16}
        color="#fff"
        style={{ marginRight: 6 }}
      />
      <Text style={styles.text}>
        {isOnline
          ? `Synchronisation en cours… (${pendingCount} élément(s))`
          : `Hors-ligne${pendingCount > 0 ? ` — ${pendingCount} saisie(s) en attente` : ''}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 999,
  },
  offline: { backgroundColor: '#cf1322' },
  syncing: { backgroundColor: '#fa8c16' },
  text: { color: '#fff', fontSize: 12, flex: 1 },
});
