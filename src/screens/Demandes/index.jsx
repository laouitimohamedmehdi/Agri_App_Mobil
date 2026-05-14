import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Chip, Snackbar, SegmentedButtons, Card, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

const STATUT_CONFIG = {
  en_attente: { color: '#fa8c16', bg: '#fff7e6', icon: 'clock-outline',    label: 'En attente' },
  approuvee:  { color: '#52c41a', bg: '#f6fff0', icon: 'check-circle',     label: 'Approuvée'  },
  rejetee:    { color: '#ff4d4f', bg: '#fff1f0', icon: 'close-circle',     label: 'Rejetée'    },
};
const TYPE_CONFIG = {
  modification: { color: '#1677ff', icon: 'pencil-circle' },
  suppression:  { color: '#ff4d4f', icon: 'delete-circle' },
  notification: { color: '#722ed1', icon: 'bell-circle'   },
};

export default function Demandes({ navigation }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [expanded, setExpanded] = useState(null);
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDemandes();
    setRefreshing(false);
  };

  useEffect(() => { fetchDemandes(); }, []);

  const fetchDemandes = async () => {
    try { const res = await client.get('/demandes/'); setDemandes(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const decide = async (id, statut) => {
    try { await client.put(`/demandes/${id}/decision`, { statut, note_admin: '' }); await fetchDemandes(); }
    catch { setSnack('Erreur lors de la décision'); }
  };

  const filtered = demandes.filter(d => {
    if (filterStatut !== 'tous' && d.statut !== filterStatut) return false;
    if (filterType !== 'tous' && d.type_action !== filterType) return false;
    return true;
  });

  if (loading) return <LoadingOverlay />;

  const pending = filtered.filter(d => d.statut === 'en_attente' && d.type_action !== 'notification');
  const others  = filtered.filter(d => d.statut !== 'en_attente' || d.type_action === 'notification');

  return (
    <View style={styles.screen}>
      <AppHeader title="Demandes" navigation={navigation} />
      <View style={styles.filtersBox}>
        <SegmentedButtons value={filterStatut} onValueChange={setFilterStatut} style={{ marginBottom: 8 }}
          buttons={[{ value: 'tous', label: 'Tous' }, { value: 'en_attente', label: 'En attente' }, { value: 'approuvee', label: 'Approuvées' }, { value: 'rejetee', label: 'Rejetées' }]} />
        <SegmentedButtons value={filterType} onValueChange={setFilterType}
          buttons={[{ value: 'tous', label: 'Tous' }, { value: 'modification', label: 'Modif.' }, { value: 'suppression', label: 'Suppr.' }, { value: 'notification', label: 'Notif.' }]} />
      </View>

      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
        {filtered.length === 0 && <EmptyState message="Aucune demande" />}

        {pending.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-alert" size={18} color="#fa8c16" style={{ marginRight: 6 }} />
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: '#fa8c16' }]}>En attente ({pending.length})</Text>
            </View>
            {pending.map(d => <DemandeCard key={d.id} d={d} expanded={expanded} setExpanded={setExpanded} onDecide={decide} />)}
          </>
        )}

        {others.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
              <Text variant="titleSmall" style={styles.sectionTitle}>Traitées ({others.length})</Text>
            </View>
            {others.map(d => <DemandeCard key={d.id} d={d} expanded={expanded} setExpanded={setExpanded} onDecide={decide} />)}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function DemandeCard({ d, expanded, setExpanded, onDecide }) {
  const sc = STATUT_CONFIG[d.statut] || { color: '#888', bg: '#f5f5f5', icon: 'help-circle', label: d.statut };
  const tc = TYPE_CONFIG[d.type_action] || { color: '#888', icon: 'circle' };
  const isOpen = expanded === d.id;

  return (
    <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: sc.color }]}>
      <TouchableOpacity onPress={() => setExpanded(isOpen ? null : d.id)} style={styles.cardHeader}>
        <MaterialCommunityIcons name={tc.icon} size={22} color={tc.color} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
            {d.type_action ? d.type_action.charAt(0).toUpperCase() + d.type_action.slice(1) : ''} — {d.entity_type || 'travail'} #{d.entity_id || d.travail_id || ''}
          </Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>Par: {d.user_id} • {d.date_demande || ''}</Text>
        </View>
        <Chip compact style={{ backgroundColor: sc.bg }} textStyle={{ color: sc.color, fontSize: 10 }}>
          {sc.label}
        </Chip>
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.cardBody, { backgroundColor: sc.bg }]}>
          {!!d.motif && <Text variant="bodySmall"><Text style={{ fontWeight: 'bold' }}>Motif : </Text>{d.motif}</Text>}
          {!!d.nouvelles_donnees && d.nouvelles_donnees !== '' && (
            <Text variant="bodySmall" style={{ color: '#555', marginTop: 4 }}>Données : {d.nouvelles_donnees}</Text>
          )}
          {!!d.note_admin && (
            <Text variant="bodySmall" style={{ color: '#2d7a4a', marginTop: 4 }}>Note admin : {d.note_admin}</Text>
          )}
          {d.statut === 'en_attente' && d.type_action !== 'notification' && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button mode="contained" buttonColor="#52c41a" compact onPress={() => onDecide(d.id, 'approuvee')}>Approuver</Button>
              <Button mode="outlined" textColor="#ff4d4f" compact onPress={() => onDecide(d.id, 'rejetee')}>Rejeter</Button>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, padding: 12 },
  filtersBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 8 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  card: { marginBottom: 10, elevation: 2, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  cardBody: { padding: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
});
