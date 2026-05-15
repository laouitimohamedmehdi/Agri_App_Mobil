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

  if (!token || isOnline) return null;

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" style={{ marginRight: 6 }} />
      <Text style={styles.text}>
        {pendingCount > 0
          ? t('mobile.offline_pending', { count: pendingCount })
          : t('mobile.offline_banner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#cf1322' },
  text: { color: '#fff', fontSize: 12, flex: 1 },
});
