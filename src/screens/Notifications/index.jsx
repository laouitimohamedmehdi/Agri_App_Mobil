import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, Text, Button, Chip, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

const TYPE_COLORS = { info: '#1976d2', success: '#388e3c', error: '#d32f2f', warning: '#f57c00' };
const TYPE_ICONS = { info: 'information', success: 'check-circle', error: 'alert-circle', warning: 'alert' };

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

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Notifications" navigation={navigation} />
      {notifs.length === 0 ? <EmptyState message="Aucune notification" /> : (
        <ScrollView style={{ backgroundColor: '#f5f5f5' }}>
          {notifs.map(n => (
            <List.Item
              key={n.id}
              title={n.message}
              description={n.date_creation}
              left={props => (
                <List.Icon {...props} icon={TYPE_ICONS[n.type] || 'bell'} color={TYPE_COLORS[n.type] || '#888'} />
              )}
              style={[styles.item, !n.lu && styles.unread]}
            />
          ))}
        </ScrollView>
      )}
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  unread: { backgroundColor: '#e8f5e9' },
});
