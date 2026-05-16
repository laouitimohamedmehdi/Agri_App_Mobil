import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Snackbar, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { isCancelled } from '../../utils/abortHelper';

const TYPE_CONFIG = {
  info:    { color: '#1677ff', bg: '#e6f4ff', icon: 'information-outline'   },
  success: { color: '#52c41a', bg: '#f6fff0', icon: 'check-circle-outline'  },
  error:   { color: '#ff4d4f', bg: '#fff1f0', icon: 'alert-circle-outline'  },
  warning: { color: '#fa8c16', bg: '#fff7e6', icon: 'alert-outline'          },
};

const renderMessage = (message, t) => {
  try {
    const parsed = typeof message === 'string' ? JSON.parse(message) : message;
    if (parsed?.key) return t(parsed.key, parsed.params || {});
  } catch {}
  return String(message || '');
};

export default function Notifications({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await client.get('/notifications/');
      setNotifs(res.data);
      markAllRead();
    } catch (e) {
      if (!isCancelled(e)) setSnack(t('mobile.error_load'));
    } finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try { await client.put('/notifications/read-all'); } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    client.get('/notifications/', { signal: controller.signal })
      .then(res => { setNotifs(res.data); markAllRead(); })
      .catch(e => { if (!isCancelled(e)) setSnack(t('mobile.error_load')); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <LoadingOverlay />;

  const unreadCount = notifs.filter(n => !n.lu).length;

  return (
    <View style={styles.screen}>
      <AppHeader title={t('notif.title')} navigation={navigation} />
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>

        <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
          <MaterialCommunityIcons name="bell-outline" size={18} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
          <Text variant="titleSmall" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
            {t('notif.title')} ({notifs.length})
            {unreadCount > 0 && (
              <Text style={{ color: '#fa8c16' }}>  · {unreadCount} ●</Text>
            )}
          </Text>
        </View>

        {notifs.length === 0 ? (
          <EmptyState message={t('notif.no_notifications')} />
        ) : (
          notifs.map(n => {
            const cfg = TYPE_CONFIG[n.type] || { color: '#888', bg: '#f5f5f5', icon: 'bell-outline' };
            return (
              <Card
                key={n.id}
                style={[
                  styles.card,
                  isRTL ? { borderRightColor: cfg.color, borderRightWidth: 4, borderLeftWidth: 0 } : { borderLeftColor: cfg.color },
                  !n.lu && { backgroundColor: cfg.bg },
                ]}
              >
                <View style={[styles.cardRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
                    <MaterialCommunityIcons name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: '#333', fontWeight: n.lu ? '400' : '600', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                      {renderMessage(n.message, t)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#aaa', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                      {n.date_creation}
                    </Text>
                  </View>
                  {!n.lu && (
                    <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
                  )}
                </View>
              </Card>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000} style={isRTL ? { alignSelf: 'flex-end' } : undefined}>
        <Text style={isRTL ? { textAlign: 'right', color: '#fff', flex: 1 } : { color: '#fff' }}>{snack}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, padding: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  card: { marginBottom: 8, borderLeftWidth: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
