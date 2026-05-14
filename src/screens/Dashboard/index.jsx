import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, Divider, Chip, Snackbar, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import AppHeader from '../../components/AppHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const STATUT_COLORS = { planifie: '#f57c00', actif: '#1976d2', termine: '#388e3c' };
const STATUT_ICONS = { planifie: 'clock-outline', actif: 'play-circle-outline', termine: 'check-circle-outline' };

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
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthIdx = now.getMonth(); // 0-based
      const months = Array.from({ length: currentMonthIdx + 1 }, (_, i) =>
        `${currentYear}-${String(i + 1).padStart(2, '0')}`
      );
      const [travaux, recoltes, analyses, charges, depenses, ...feuillesRes] = await Promise.all([
        client.get('/travaux/'),
        client.get('/recoltes/'),
        client.get('/recolte-analyse/').catch(() => ({ data: [] })),
        client.get('/recolte-charges/').catch(() => ({ data: [] })),
        client.get('/depenses/').catch(() => ({ data: [] })),
        ...months.map(m => client.get(`/feuilles/?mois=${m}`).catch(() => ({ data: null }))),
      ]);
      const allFeuilles = months.map((mois, i) => ({ mois, lignes: feuillesRes[i]?.data?.lignes || [] }));
      setData({ travaux: travaux.data, recoltes: recoltes.data, analyses: analyses.data, charges: charges.data, depenses: depenses.data, allFeuilles });
    } catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingOverlay />;

  const surfaceTotale = secteurs.reduce((s, x) => s + (x.surface || 0), 0).toFixed(1);
  const nbArbres = secteurs.reduce((s, x) => s + (x.nb_arbre || 0), 0);

  // Production = dernière campagne uniquement
  const recoltes = data?.recoltes || [];
  const derniereCampagne = [...recoltes].sort((a, b) => (b.campagne || '').localeCompare(a.campagne || ''))[0]?.campagne;
  const recoltesRef = derniereCampagne ? recoltes.filter(r => r.campagne === derniereCampagne) : recoltes;
  const productionTotale = recoltesRef.reduce((s, r) => s + (r.production || 0), 0);
  const huileTotale = (data?.analyses || []).reduce((s, a) => s + (a.huile || 0), 0);

  // Revenu brut = Σ (Production (Kg) × Prix de vente (DT/Kg))
  const revenuBrut = recoltesRef.reduce((s, r) => {
    const a = (data?.analyses || []).find(an => an.recolte_id === r.id_recolte);
    return s + (a?.huile || 0) * (a?.prix || 0);
  }, 0);

  // Frais récolte = /recolte-charges/ liés aux récoltes de la période
  const recolteIds = recoltesRef.map(r => r.id_recolte);
  const totalFraisRecolte = (data?.charges || []).reduce((s, c) =>
    recolteIds.includes(c.recolte_id) ? s + (c.montant || 0) : s, 0);

  // Travaux : année courante si des récoltes existent cette année, sinon tout
  const currentYear = new Date().getFullYear().toString();
  const hasCurrentYearRecoltes = recoltes.some(r => r.date?.startsWith(currentYear));
  const travauxRef = hasCurrentYearRecoltes
    ? (data?.travaux || []).filter(t => t.date?.startsWith(currentYear))
    : (data?.travaux || []);
  const totalCoutTravaux = travauxRef.filter(t => t.statut === 'termine').reduce((s, t) => s + (t.cout || 0), 0);

  // Salaires : somme sur tous les mois Jan→mois courant
  const totalSalaires = (data?.allFeuilles || []).flatMap(f => f.lignes).reduce((s, l) => s + (l.cout_total || 0), 0);
  const totalDepenses = (data?.depenses || []).reduce((s, d) => s + ((d.quantite || 0) * (d.cout_unitaire || 0)), 0);
  const totalCharges = totalFraisRecolte + totalCoutTravaux + totalSalaires + totalDepenses;
  const margeNette = revenuBrut - totalCharges;
  const rendementHa = parseFloat(surfaceTotale) > 0 ? (productionTotale / parseFloat(surfaceTotale)).toFixed(0) : 0;
  const coutKg = productionTotale > 0 ? (totalCharges / productionTotale).toFixed(2) : 0;

  const derniersTravaux = (data?.travaux || []).slice(-5).reverse();

  // Activité financière — Jan → Déc année courante
  const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentMonthIdx = new Date().getMonth();
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const moisKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    if (i > currentMonthIdx) return { mois: MOIS_FR[i], revenu: 0, charges: 0 };
    const recoltesInMonth = recoltes.filter(r => r.date?.slice(0, 7) === moisKey);
    const revenu = recoltesInMonth.reduce((s, r) => {
      const a = (data?.analyses || []).find(an => an.recolte_id === r.id_recolte);
      return s + (a?.huile || 0) * (a?.prix || 0);
    }, 0);
    const idsMonth = new Set(recoltesInMonth.map(r => r.id_recolte));
    const frais = (data?.charges || []).reduce((s, c) => idsMonth.has(c.recolte_id) ? s + (c.montant || 0) : s, 0);
    const coutTravaux = (data?.travaux || []).reduce((s, t) =>
      t.date?.startsWith(moisKey) && t.statut === 'termine' ? s + (t.cout || 0) : s, 0);
    const coutDepenses = (data?.depenses || []).reduce((s, d) =>
      d.date?.startsWith(moisKey) ? s + (d.quantite || 0) * (d.cout_unitaire || 0) : s, 0);
    const feuilleMois = (data?.allFeuilles || []).find(f => f.mois === moisKey);
    const salaires = (feuilleMois?.lignes || []).reduce((s, l) => s + (l.cout_total || 0), 0);
    return { mois: MOIS_FR[i], revenu: Math.round(revenu), charges: Math.round(frais + coutTravaux + coutDepenses + salaires) };
  });

  // Couleurs DESIGN_SYSTEM — prop `color` (PieChart), pas frontColor (BarChart)
  const PIE_ITEMS = [
    { key: 'frais', value: totalFraisRecolte, color: '#fa8c16', label: 'Frais récolte' },
    { key: 'travaux', value: totalCoutTravaux, color: '#ff4d4f', label: 'Coût des travaux' },
    { key: 'sal', value: totalSalaires, color: '#722ed1', label: 'Salaires' },
    { key: 'dep', value: totalDepenses, color: '#eb2f96', label: 'Autres dépenses' },
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
          <KpiCard label="Surface totale" value={`${surfaceTotale} ha`} color="#3a5a2c" borderColor="#3a5a2c" icon="map-marker-radius" bg="#f6faf3" />
          <KpiCard label="Total arbres" value={nbArbres.toLocaleString()} color="#389e0d" borderColor="#52c41a" icon="tree" bg="#f6fff0" />
          <KpiCard label={`Production ${derniereCampagne}`} value={`${productionTotale.toLocaleString()} kg`} color="#d46b08" borderColor="#fa8c16" icon="basket" bg="#fff7e6" />
          {isAdmin && <KpiCard label={`Huile ${derniereCampagne}`} value={`${huileTotale.toLocaleString()} L`} color="#08979c" borderColor="#13c2c2" icon="water" bg="#e6fffb" />}
        </View>

        {/* Résumé financier */}
        {isAdmin && (
          <>
            <SectionHeader icon="cash-multiple" title="Résumé financier" />
            <FinanceRow icon="trending-up" label="Revenu brut" formule="Σ (Production (Kg) × Prix de vente (DT/Kg))" value={`${revenuBrut.toFixed(0)} DT`} accent="#2d7a4a" />
            <FinanceRow icon="trending-down" label="Total charges" formule="Coût des travaux + Frais de récolte + Salaires + Autres dépenses" value={`${totalCharges.toFixed(0)} DT`} accent="#ff4d4f" />
            <FinanceRow icon="finance" label="Marge nette" formule="Revenu brut − Total charges" value={`${margeNette.toFixed(0)} DT`} accent={margeNette >= 0 ? '#2d7a4a' : '#ff4d4f'} />
            <FinanceRow icon="sprout" label="Rendement moyen /ha" formule="Production totale ÷ Surface totale (ha)" value={`${rendementHa} kg`} accent="#fa8c16" />
            <FinanceRow icon="calculator" label="Coût moyen /kg" formule="Coût total ÷ Production totale (kg)" value={`${coutKg} DT`} accent="#ff4d4f" />
          </>
        )}

        {/* Activité financière */}
        {isAdmin && (
          <>
            <SectionHeader icon="chart-line" title={`Activité financière ${currentYear}`} />
            <Card style={styles.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 3, backgroundColor: '#2d7a4a', borderRadius: 2 }} />
                  <Text style={{ fontSize: 10, color: '#555' }}>Revenus</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 3, backgroundColor: '#ff4d4f', borderRadius: 2 }} />
                  <Text style={{ fontSize: 10, color: '#555' }}>Charges</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  areaChart
                  data={monthlyData.map(d => ({ value: d.revenu }))}
                  data2={monthlyData.map(d => ({ value: d.charges }))}
                  color1="#2d7a4a"
                  color2="#ff4d4f"
                  startFillColor1="#2d7a4a"
                  startFillColor2="#ff4d4f"
                  startOpacity={0.25}
                  endOpacity={0.02}
                  thickness={2}
                  dataPointsColor1="#2d7a4a"
                  dataPointsColor2="#ff4d4f"
                  dataPointsRadius={3}
                  xAxisLabelTexts={MOIS_FR}
                  xAxisLabelTextStyle={{ color: '#555', fontSize: 8 }}
                  yAxisTextStyle={{ color: '#888', fontSize: 9 }}
                  noOfSections={4}
                  width={Math.max(300, 12 * 28)}
                  height={140}
                  hideRules={false}
                  rulesColor="#f0f0f0"
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
