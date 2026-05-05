import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, Divider, Snackbar } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import AppHeader from '../../components/AppHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [travaux, recoltes] = await Promise.all([
        client.get('/travaux/'),
        client.get('/recoltes/'),
      ]);
      setStats({ travaux: travaux.data, recoltes: recoltes.data });
    } catch {
      setSnack('Erreur de chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;

  const travauxEnCours = stats?.travaux.filter(t => t.statut === 'en_cours').length ?? 0;
  const travauxTermines = stats?.travaux.filter(t => t.statut === 'termine').length ?? 0;
  const totalRecoltes = stats?.recoltes.length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={styles.container}>
        <Text variant="titleMedium" style={styles.section}>Vue d'ensemble</Text>
        <View style={styles.row}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="displaySmall" style={styles.kpi}>{travauxEnCours}</Text>
              <Text variant="bodySmall">Travaux en cours</Text>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="displaySmall" style={styles.kpi}>{travauxTermines}</Text>
              <Text variant="bodySmall">Travaux terminés</Text>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="displaySmall" style={styles.kpi}>{totalRecoltes}</Text>
              <Text variant="bodySmall">Récoltes</Text>
            </Card.Content>
          </Card>
        </View>

        {isAdmin && stats?.recoltes.length > 0 && (
          <>
            <Divider style={{ marginVertical: 16 }} />
            <Text variant="titleMedium" style={styles.section}>Récoltes par campagne</Text>
            <BarChart
              data={stats.recoltes.slice(0, 6).map(r => ({
                value: r.quantite_kg ?? 0,
                label: r.campagne ?? '',
                frontColor: '#2d7a4a',
              }))}
              width={300}
              height={160}
              barWidth={32}
              noOfSections={4}
              yAxisTextStyle={{ color: '#888', fontSize: 11 }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
            />
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  section: { marginBottom: 12, color: '#2d7a4a', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  card: { flex: 1, minWidth: 90 },
  kpi: { color: '#2d7a4a', fontWeight: 'bold' },
});
