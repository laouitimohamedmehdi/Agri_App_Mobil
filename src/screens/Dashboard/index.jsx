import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, Divider, Chip, Snackbar, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import AppHeader from '../../components/AppHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const STATUT_COLORS = { planifie: '#f57c00', actif: '#1976d2', termine: '#388e3c' };
const STATUT_ICONS  = { planifie: 'clock-outline', actif: 'play-circle-outline', termine: 'check-circle-outline' };

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
      setData({ travaux: travaux.data, recoltes: recoltes.data, analyses: analyses.data, fertilisations: fertilisations.data, feuille: feuille.data });
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
  const totalCoutTravaux = (data?.travaux || []).reduce((s, t) => s + (t.cout || 0), 0);
  const totalSalaires = (data?.feuille?.lignes || []).reduce((s, l) => s + (l.cout_total || 0), 0);
  const totalCharges = fraisTraitement + chargesFertilisation + totalCoutTravaux + totalSalaires;
  const margeNette = revenuBrut - totalCharges;
  const rendementHa = parseFloat(surfaceTotale) > 0 ? (productionTotale / parseFloat(surfaceTotale)).toFixed(0) : 0;
  const coutKg = productionTotale > 0 ? (totalCharges / productionTotale).toFixed(2) : 0;

  const derniersTravaux = (data?.travaux || []).slice(-5).reverse();

  const barData = Object.entries(
    (data?.recoltes || []).reduce((acc, r) => { const k = r.campagne || 'Sans'; acc[k] = (acc[k] || 0) + (r.production || 0); return acc; }, {})
  ).map(([label, value]) => ({ label, value, frontColor: '#2d7a4a' }));

  // Couleurs DESIGN_SYSTEM — prop `color` (PieChart), pas frontColor (BarChart)
  const PIE_ITEMS = [
    { key: 'travaux', value: totalCoutTravaux,     color: '#ff4d4f', label: 'Travaux'       },
    { key: 'frais',   value: fraisTraitement,      color: '#fa8c16', label: 'Frais récolte' },
    { key: 'fert',    value: chargesFertilisation, color: '#13c2c2', label: 'Fertilisation' },
    { key: 'sal',     value: totalSalaires,        color: '#722ed1', label: 'Salaires'      },
  ].filter(d => d.value > 0);
  const pieData = PIE_ITEMS.map(d => ({ value: d.value, color: d.color }));

  const getEmployeNom = (l) => {
    if (l.nom_temp) return l.nom_temp;
    const emp = employes.find(e => e.id_employe === l.employe_id);
    return emp ? `${emp.nom} ${emp.prenom ?? ''}`.trim() : `Employé ${l.employe_id}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Tableau de bord" navigation={navigation} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* KPIs */}
        <SectionHeader icon="chart-box" title="Vue d'ensemble" />
        <View style={styles.kpiRow}>
          <KpiCard label="Surface totale" value={`${surfaceTotale} ha`}               color="#3a5a2c" borderColor="#3a5a2c" icon="map-marker-radius" bg="#f6faf3" />
          <KpiCard label="Arbres"         value={nbArbres.toLocaleString()}            color="#389e0d" borderColor="#52c41a" icon="tree"              bg="#f6fff0" />
          <KpiCard label="Production"     value={`${productionTotale.toLocaleString()} kg`} color="#d46b08" borderColor="#fa8c16" icon="basket"      bg="#fff7e6" />
          {isAdmin && <KpiCard label="Huile" value={`${huileTotale.toLocaleString()} L`} color="#08979c" borderColor="#13c2c2" icon="water"          bg="#e6fffb" />}
        </View>

        {/* Résumé financier */}
        {isAdmin && (
          <>
            <SectionHeader icon="cash-multiple" title="Résumé financier" />
            <FinanceRow icon="trending-up"   label="Revenu brut"    formule="Σ (Huile × Prix)"     value={`${revenuBrut.toFixed(0)} DT`}  accent="#2d7a4a" />
            <FinanceRow icon="trending-down"  label="Total charges"  formule="Frais + Fertilisation + Travaux + Salaires" value={`${totalCharges.toFixed(0)} DT`} accent="#ff4d4f" />
            <FinanceRow icon="finance"        label="Marge nette"    formule="Revenu − Charges"      value={`${margeNette.toFixed(0)} DT`}  accent={margeNette >= 0 ? '#2d7a4a' : '#ff4d4f'} />
            <FinanceRow icon="sprout"         label="Rendement/ha"   formule="Production ÷ Surface"  value={`${rendementHa} kg`}            accent="#fa8c16" />
            <FinanceRow icon="calculator"     label="Coût/kg"        formule="Charges ÷ Production"  value={`${coutKg} DT`}                 accent="#ff4d4f" />
          </>
        )}

        {/* Graphiques admin */}
        {isAdmin && barData.length > 0 && (
          <>
            <SectionHeader icon="chart-bar" title="Récoltes par campagne" />
            <Card style={styles.chartCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barData}
                  width={Math.max(300, barData.length * 70)}
                  height={160}
                  barWidth={36}
                  noOfSections={4}
                  barBorderRadius={4}
                  yAxisTextStyle={{ color: '#888', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#555', fontSize: 9 }}
                />
              </ScrollView>
            </Card>
          </>
        )}

        {isAdmin && pieData.length > 0 && (
          <>
            <SectionHeader icon="chart-pie" title="Répartition des charges" />
            <Card style={styles.chartCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PieChart
                  data={pieData}
                  radius={75}
                  innerRadius={35}
                  strokeWidth={0}
                  showGradient={false}
                />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  {PIE_ITEMS.map(d => {
                    const total = PIE_ITEMS.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color, marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{d.label}</Text>
                          <Text style={{ fontSize: 10, color: '#595959' }}>
                            {d.value.toFixed(0)} DT
                            <Text style={{ fontWeight: 'bold', color: d.color }}> · {pct}%</Text>
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Card>
          </>
        )}

        {/* Derniers travaux */}
        <SectionHeader icon="shovel" title="Derniers travaux" />
        <Card style={styles.listCard}>
          {derniersTravaux.length === 0
            ? <Text style={styles.empty}>Aucun travail récent</Text>
            : derniersTravaux.map(t => (
              <View key={t.id_travail} style={styles.travauxRow}>
                <View style={[styles.statutDot, { backgroundColor: STATUT_COLORS[t.statut] || '#888' }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{t.nom}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>{t.type} • {t.date || ''}</Text>
                </View>
                <Chip compact textStyle={{ fontSize: 10 }} style={{ backgroundColor: (STATUT_COLORS[t.statut] || '#888') + '22' }}>
                  {t.statut}
                </Chip>
              </View>
            ))
          }
        </Card>

        {/* Présences du mois */}
        {data?.feuille?.lignes?.length > 0 && (
          <>
            <SectionHeader icon="account-clock" title="Présences du mois" />
            <Card style={styles.listCard}>
              {data.feuille.lignes.map((l, i) => (
                <View key={i} style={[styles.presenceRow, i > 0 && styles.presenceBorder]}>
                  <MaterialCommunityIcons name="account-circle" size={32} color="#2d7a4a" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{getEmployeNom(l)}</Text>
                  </View>
                  <View style={styles.joursBadge}>
                    <Text variant="titleSmall" style={{ color: '#fff', fontWeight: 'bold' }}>{l.nb_jours_present ?? 0}</Text>
                    <Text style={{ color: '#fff', fontSize: 9 }}>jours</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
      <Text variant="titleSmall" style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function KpiCard({ label, value, color, borderColor, icon, bg }) {
  return (
    <Card style={[styles.kpiCard, { borderTopColor: borderColor, backgroundColor: bg || '#fff' }]}>
      <Card.Content style={{ padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color, fontWeight: 'bold', fontSize: 13 }}>{value}</Text>
          <Text numberOfLines={1} style={{ color: '#888', fontSize: 10 }}>{label}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

function FinanceRow({ icon, label, formule, value, accent }) {
  return (
    <View style={[styles.financeRow, { borderLeftColor: accent }]}>
      <MaterialCommunityIcons name={icon} size={20} color={accent} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ fontWeight: '600', color: '#333' }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: '#aaa', fontSize: 10, fontStyle: 'italic' }}>{formule}</Text>
      </View>
      <Text style={{ fontWeight: 'bold', color: accent, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 16 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  kpiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kpiCard: { flex: 1, minWidth: 140, borderTopWidth: 3, elevation: 2 },
  financeRow: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1, backgroundColor: '#fff' },
  chartCard: { padding: 12, marginBottom: 4, elevation: 2 },
  listCard: { elevation: 2, overflow: 'hidden' },
  travauxRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  statutDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  presenceRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  presenceBorder: { borderTopWidth: 1, borderColor: '#f0f0f0' },
  joursBadge: { backgroundColor: '#2d7a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 44 },
  empty: { color: '#aaa', padding: 16, textAlign: 'center' },
});
