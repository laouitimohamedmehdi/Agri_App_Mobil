import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Button, Text, Chip, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

export default function Demandes({ navigation }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchDemandes(); }, []);

  const fetchDemandes = async () => {
    try { const res = await client.get('/demandes/'); setDemandes(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const decide = async (id, decision) => {
    try { await client.put(`/demandes/${id}/decision`, { decision }); await fetchDemandes(); }
    catch { setSnack('Erreur lors de la décision'); }
  };

  if (loading) return <LoadingOverlay />;

  const pending = demandes.filter(d => d.statut === 'en_attente');
  const treated = demandes.filter(d => d.statut !== 'en_attente');

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Demandes" navigation={navigation} />
      {demandes.length === 0 ? <EmptyState message="Aucune demande en cours" /> : (
        <ScrollView style={styles.container}>
          {pending.length > 0 && <Text variant="titleSmall" style={styles.sectionTitle}>En attente ({pending.length})</Text>}
          {pending.map(d => (
            <Card key={d.id} style={styles.card}>
              <Card.Content>
                <Text variant="bodyMedium">{d.type} — {d.description ?? ''}</Text>
                <Text variant="bodySmall" style={{ color: '#888' }}>Par : {d.utilisateur_nom ?? d.utilisateur_id}</Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => decide(d.id, 'approuve')} textColor="#388e3c">Approuver</Button>
                <Button onPress={() => decide(d.id, 'rejete')} textColor="#d32f2f">Rejeter</Button>
              </Card.Actions>
            </Card>
          ))}
          {treated.length > 0 && <Text variant="titleSmall" style={styles.sectionTitle}>Traitées</Text>}
          {treated.map(d => (
            <Card key={d.id} style={[styles.card, { opacity: 0.6 }]}>
              <Card.Content>
                <Text variant="bodyMedium">{d.type}</Text>
                <Chip compact>{d.statut}</Chip>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  sectionTitle: { marginBottom: 8, color: '#2d7a4a', fontWeight: 'bold' },
  card: { marginBottom: 12 },
});
