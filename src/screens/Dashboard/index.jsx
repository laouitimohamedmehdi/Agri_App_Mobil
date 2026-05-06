import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, Divider, Chip, Snackbar, List } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import AppHeader from '../../components/AppHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const STATUT_COLORS = { planifie: '#f57c00', actif: '#1976d2', termine: '#388e3c' };

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { secteurs, employes } = useData();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const mois = new Date().toISOString().slice(0, 7);
      const [travaux, recoltes, analyses, fertilisations, feuille] = await Promise.all([
        client.get('/travaux/'),
        client.get('/recoltes/'),
        client.get('/recolte-analyse/').catch(() => ({ data: [] })),
        client.get('/fertilisation/'),
        client.get(`/feuilles/?mois=${mois}`).catch(() => ({ data: null })),
      ]);
      setData({
        travaux: travaux.data,
        recoltes: recoltes.data,
        analyses: analyses.data,
        fertilisations: fertilisations.data,
        feuille: feuille.data,
      });
    } catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingOverlay />;

  const surfaceTotale = secteurs.reduce((s, x) => s + (x.surface || 0), 0).toFixed(1);
  const nbArbres = secteurs.reduce((s, x) => s + (x.nb_arbre || 0), 0);
  const productionTotale = (data?.recoltes || []).reduce((s, r) => s + (r.production || 0), 0);
  const huileTotale = (data?.analyses || []).reduce((s, a) => s + (a.huile || 0), 0);

  const revenuBrut = (data?.analyses || []).reduce((s, a) => s + ((a.huile || 0) * (a.prix || 0)), 0);
  const fraisTraitement = (data?.analyses || []).reduce((s, a) => s + (a.frais || 0), 0);
  const chargesFertilisation = (data?.fertilisations || []).reduce((s, f) => s + ((f.quantite || 0) * (f.cout_unitaire || 0)), 0);
  const totalCharges = fraisTraitement + chargesFertilisation;
  const margeNette = revenuBrut - totalCharges;
  const rendementHa = parseFloat(surfaceTotale) > 0 ? (productionTotale / parseFloat(surfaceTotale)).toFixed(0) : 0;
  const coutKg = productionTotale > 0 ? (totalCharges / productionTotale).toFixed(2) : 0;

  const derniersTravaux = (data?.travaux || []).slice(-5).reverse();

  const byCampagne = (data?.recoltes || []).reduce((acc, r) => {
    const key = r.campagne || 'Sans campagne';
    acc[key] = (acc[key] || 0) + (r.production || 0);
    return acc;
  }, {});
  const barData = Object.entries(byCampagne).map(([label, value]) => ({ label, value, frontColor: '#2d7a4a' }));

  const pieData = [
    { value: fraisTraitement, color: '#2d7a4a', text: 'Traitement' },
    { value: chargesFertilisation, color: '#81c784', text: 'Fertilisation' },
  ].filter(d => d.value > 0);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Dashboard" navigation={navigation} />
      <ScrollView style={styles.container}>

        <Text variant="titleMedium" style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.kpiRow}>
          <KpiCard label="Surface totale" value={`${surfaceTotale} ha`} />
          <KpiCard label="Arbres" value={nbArbres.toLocaleString()} />
          <KpiCard label="Production" value={`${productionTotale.toLocaleString()} kg`} />
          {isAdmin && <KpiCard label="Huile" value={`${huileTotale.toLocaleString()} L`} />}
        </View>

        {isAdmin && (
          <>
            <Divider style={{ marginVertical: 16 }} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Résumé financier</Text>
            <View style={styles.kpiRow}>
              <KpiCard label="Revenu brut" value={`${revenuBrut.toFixed(0)} DH`} />
              <KpiCard label="Total charges" value={`${totalCharges.toFixed(0)} DH`} color="#c0392b" />
              <KpiCard label="Marge nette" value={`${margeNette.toFixed(0)} DH`} color={margeNette >= 0 ? '#2d7a4a' : '#c0392b'} />
            </View>
            <View style={[styles.kpiRow, { marginTop: 8 }]}>
              <KpiCard label="Rendement/ha" value={`${rendementHa} kg`} />
              <KpiCard label="Coût/kg" value={`${coutKg} DH`} />
            </View>
          </>
        )}

        {isAdmin && barData.length > 0 && (
          <>
            <Divider style={{ marginVertical: 16 }} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Récoltes par campagne</Text>
            <ScrollView horizontal>
              <BarChart
                data={barData}
                width={Math.max(300, barData.length * 70)}
                height={180}
                barWidth={40}
                noOfSections={4}
                yAxisTextStyle={{ color: '#888', fontSize: 11 }}
                xAxisLabelTextStyle={{ color: '#555', fontSize: 10 }}
              />
            </ScrollView>
          </>
        )}

        {isAdmin && pieData.length > 0 && (
          <>
            <Divider style={{ marginVertical: 16 }} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Répartition des charges</Text>
            <View style={{ alignItems: 'center' }}>
              <PieChart data={pieData} radius={80} />
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                {pieData.map(d => (
                  <View key={d.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.color }} />
                    <Text variant="bodySmall">{d.text} : {d.value.toFixed(0)} DH</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <Divider style={{ marginVertical: 16 }} />
        <Text variant="titleMedium" style={styles.sectionTitle}>Derniers travaux</Text>
        {derniersTravaux.length === 0
          ? <Text style={{ color: '#888', paddingHorizontal: 4 }}>Aucun travail</Text>
          : derniersTravaux.map(t => (
            <List.Item
              key={t.id_travail}
              title={t.nom}
              description={`${t.type} • ${t.date || ''}`}
              left={props => <List.Icon {...props} icon="shovel" />}
              right={() => <Chip compact style={{ backgroundColor: (STATUT_COLORS[t.statut] || '#888') + '22' }}>{t.statut}</Chip>}
            />
          ))
        }

        {data?.feuille?.lignes?.length > 0 && (
          <>
            <Divider style={{ marginVertical: 16 }} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Présences du mois</Text>
            {data.feuille.lignes.map((l, i) => (
              <List.Item
                key={i}
                title={(() => {
                  if (l.nom_temp) return l.nom_temp;
                  const emp = employes.find(e => e.id_employe === l.employe_id);
                  return emp ? `${emp.nom} ${emp.prenom ?? ''}`.trim() : `Employé ${l.employe_id}`;
                })()}
                description={`${l.nb_jours_present ?? 0} jours`}
                left={props => <List.Icon {...props} icon="account-clock" />}
              />
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function KpiCard({ label, value, color = '#2d7a4a' }) {
  return (
    <Card style={{ flex: 1, minWidth: 90 }}>
      <Card.Content>
        <Text variant="titleLarge" style={{ color, fontWeight: 'bold' }}>{value}</Text>
        <Text variant="bodySmall" style={{ color: '#666' }}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f5f5f5' },
  sectionTitle: { marginBottom: 8, color: '#2d7a4a', fontWeight: 'bold' },
  kpiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
