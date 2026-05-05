import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, Button, Text, Snackbar, Chip } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AppHeader from '../../components/AppHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function Presences({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [feuilles, setFeuilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchFeuilles(); }, [mois]);

  const fetchFeuilles = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/feuilles/?mois=${mois}`);
      setFeuilles(res.data);
    } catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const changeMonth = (delta) => {
    const d = new Date(mois + '-01');
    d.setMonth(d.getMonth() + delta);
    setMois(d.toISOString().slice(0, 7));
  };

  const valider = async (id) => {
    try { await client.put(`/feuilles/${id}/valider`); await fetchFeuilles(); }
    catch { setSnack('Erreur lors de la validation'); }
  };

  const exportPDF = async () => {
    const html = `<html><body><h1>Présences — ${mois}</h1><p>${feuilles.length} feuilles</p></body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Présences" navigation={navigation} />
      <View style={styles.header}>
        <Button icon="chevron-left" onPress={() => changeMonth(-1)} compact />
        <Text variant="titleMedium" style={{ marginHorizontal: 8 }}>{mois}</Text>
        <Button icon="chevron-right" onPress={() => changeMonth(1)} compact />
        <Button icon="file-pdf-box" onPress={exportPDF} compact style={{ marginLeft: 'auto' }}>PDF</Button>
      </View>
      {feuilles.length === 0 ? <EmptyState message="Aucune feuille de présence ce mois" /> : (
        <ScrollView horizontal>
          <DataTable style={{ minWidth: 400 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Employé</DataTable.Title>
              <DataTable.Title numeric>Jours</DataTable.Title>
              <DataTable.Title>Statut</DataTable.Title>
              {isAdmin && <DataTable.Title>Action</DataTable.Title>}
            </DataTable.Header>
            {feuilles.map(f => (
              <DataTable.Row key={f.id}>
                <DataTable.Cell style={{ flex: 2 }}>{f.employe_nom ?? `Employé ${f.employe_id}`}</DataTable.Cell>
                <DataTable.Cell numeric>{f.total_jours ?? 0}</DataTable.Cell>
                <DataTable.Cell><Chip compact>{f.valide ? 'Validé' : 'En cours'}</Chip></DataTable.Cell>
                {isAdmin && <DataTable.Cell>{!f.valide && <Button compact onPress={() => valider(f.id)}>Valider</Button>}</DataTable.Cell>}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
});
