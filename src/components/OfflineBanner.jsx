import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useNetwork();
  const { token } = useAuth();
  const { t } = useTranslation();

  if (!token) return null;
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
          ? t('mobile.syncing', { count: pendingCount })
          : pendingCount > 0
            ? t('mobile.offline_pending', { count: pendingCount })
            : t('mobile.offline_banner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, zIndex: 999 },
  offline: { backgroundColor: '#cf1322' },
  syncing: { backgroundColor: '#fa8c16' },
  text: { color: '#fff', fontSize: 12, flex: 1 },
});
