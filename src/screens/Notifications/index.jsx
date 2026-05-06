import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Snackbar, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

const TYPE_CONFIG = {
  info:    { color: '#1677ff', bg: '#e6f4ff', icon: 'information-outline'   },
  success: { color: '#52c41a', bg: '#f6fff0', icon: 'check-circle-outline'  },
  error:   { color: '#ff4d4f', bg: '#fff1f0', icon: 'alert-circle-outline'  },
  warning: { color: '#fa8c16', bg: '#fff7e6', icon: 'alert-outline'          },
};

export default function Notifications({ navigation }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    fetchNotifs();
    markAllRead();
  }, []);

  const fetchNotifs = async () => {
    try { const res = await client.get('/notifications/'); setNotifs(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try { await client.put('/notifications/read-all'); } catch {}
  };

  if (loading) return <LoadingOverlay />;

  const unreadCount = notifs.filter(n => !n.lu).length;

  return (
    <View style={styles.screen}>
      <AppHeader title="Notifications" navigation={navigation} />
      <ScrollView style={styles.container}>

        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="bell-outline" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
          <Text variant="titleSmall" style={styles.sectionTitle}>
            {notifs.length} notification(s)
            {unreadCount > 0 && (
              <Text style={{ color: '#fa8c16' }}>  · {unreadCount} non lue(s)</Text>
            )}
          </Text>
        </View>

        {notifs.length === 0 ? (
          <EmptyState message="Aucune notification" />
        ) : (
          notifs.map(n => {
            const cfg = TYPE_CONFIG[n.type] || { color: '#888', bg: '#f5f5f5', icon: 'bell-outline' };
            return (
              <Card
                key={n.id}
                style={[styles.card, { borderLeftColor: cfg.color }, !n.lu && { backgroundColor: cfg.bg }]}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
                    <MaterialCommunityIcons name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: '#333', fontWeight: n.lu ? '400' : '600', lineHeight: 20 }}>
                      {n.message}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#aaa', marginTop: 2 }}>
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
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
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
