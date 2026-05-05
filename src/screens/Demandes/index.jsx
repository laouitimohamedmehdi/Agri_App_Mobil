import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Button, Text, Chip, Snackbar, SegmentedButtons, List, Divider } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

const STATUT_COLOR = { en_attente: '#f57c00', approuvee: '#388e3c', rejetee: '#d32f2f' };
const TYPE_LABELS = { modification: 'Modification', suppression: 'Suppression', notification: 'Notification' };

export default function Demandes({ navigation }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [expanded, setExpanded] = useState(null);
  const [snack, setSnack] = useState('');

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

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Demandes" navigation={navigation} />
      <View style={styles.filters}>
        <SegmentedButtons
          value={filterStatut}
          onValueChange={setFilterStatut}
          buttons={[
            { value: 'tous', label: 'Tous' },
            { value: 'en_attente', label: 'En attente' },
            { value: 'approuvee', label: 'Approuvées' },
            { value: 'rejetee', label: 'Rejetées' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <SegmentedButtons
          value={filterType}
          onValueChange={setFilterType}
          buttons={[
            { value: 'tous', label: 'Tous' },
            { value: 'modification', label: 'Modif.' },
            { value: 'suppression', label: 'Suppr.' },
            { value: 'notification', label: 'Notif.' },
          ]}
        />
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucune demande" /> : (
        <ScrollView style={{ padding: 12, backgroundColor: '#f5f5f5' }}>
          {filtered.map(d => (
            <Card key={d.id} style={{ marginBottom: 10 }}>
              <List.Accordion
                title={`${TYPE_LABELS[d.type_action] || d.type_action} — ${d.entity_type || 'travail'} #${d.entity_id || d.travail_id || ''}`}
                description={`Par: ${d.user_id} • ${d.date_demande || ''}`}
                expanded={expanded === d.id}
                onPress={() => setExpanded(expanded === d.id ? null : d.id)}
                right={() => (
                  <Chip compact style={{ backgroundColor: (STATUT_COLOR[d.statut] || '#888') + '22' }}>
                    {d.statut}
                  </Chip>
                )}
              >
                <View style={{ padding: 12 }}>
                  {!!d.motif && <Text variant="bodyMedium"><Text style={{ fontWeight: 'bold' }}>Motif :</Text> {d.motif}</Text>}
                  {!!d.nouvelles_donnees && d.nouvelles_donnees !== '' && (
                    <Text variant="bodySmall" style={{ color: '#555', marginTop: 4 }}>
                      Données proposées : {d.nouvelles_donnees}
                    </Text>
                  )}
                  {!!d.note_admin && (
                    <Text variant="bodySmall" style={{ color: '#2d7a4a', marginTop: 4 }}>
                      Note admin : {d.note_admin}
                    </Text>
                  )}
                  {d.statut === 'en_attente' && d.type_action !== 'notification' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button mode="contained" buttonColor="#388e3c" onPress={() => decide(d.id, 'approuvee')}>Approuver</Button>
                      <Button mode="outlined" textColor="#d32f2f" onPress={() => decide(d.id, 'rejetee')}>Rejeter</Button>
                    </View>
                  )}
                </View>
              </List.Accordion>
            </Card>
          ))}
        </ScrollView>
      )}
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  filters: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
});
