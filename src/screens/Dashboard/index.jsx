import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Dimensions } from 'react-native';
import { Card, Text, Divider, Chip, Snackbar, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import AppHeader from '../../components/AppHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const STATUT_COLORS = { planifie: '#f57c00', actif: '#1976d2', termine: '#388e3c' };
const STATUT_ICONS = { planifie: 'clock-outline', actif: 'play-circle-outline', termine: 'check-circle-outline' };

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { secteurs, employes } = useData();
  const { currencySymbol } = useSettings();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    const sig = { signal: controller.signal };
    const now = new Date();
    const yr = now.getFullYear();
    const months = Array.from({ length: now.getMonth() + 1 }, (_, i) =>
      `${yr}-${String(i + 1).padStart(2, '0')}`
    );
    Promise.all([
      client.get('/travaux/', sig),
      client.get('/recoltes/', sig),
      client.get('/recolte-analyse/', sig).catch(() => ({ data: [] })),
      client.get('/recolte-charges/', sig).catch(() => ({ data: [] })),
      client.get('/depenses/', sig).catch(() => ({ data: [] })),
      ...months.map(m => client.get(`/feuilles/?mois=${m}`, sig).catch(() => ({ data: null }))),
    ])
      .then(([travaux, recoltes, analyses, charges, depenses, ...feuillesRes]) => {
        const allFeuilles = months.map((mois, i) => ({ mois, lignes: feuillesRes[i]?.data?.lignes || [] }));
        setData({ travaux: travaux.data, recoltes: recoltes.data, analyses: analyses.data, charges: charges.data, depenses: depenses.data, allFeuilles });
      })
      .catch(e => { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError' && e?.name !== 'CanceledError') setSnack(t('mobile.error_load')); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const fetchAll = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthIdx = now.getMonth();
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
    } catch (e) { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError') setSnack(t('mobile.error_load')); }
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
  const MOIS_LABELS = {
    fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  };
  const MOIS = MOIS_LABELS[i18n.language] || MOIS_LABELS.fr;
  const currentMonthIdx = new Date().getMonth();
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const moisKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    if (i > currentMonthIdx) return { mois: MOIS[i], revenu: 0, charges: 0 };
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
    return { mois: MOIS[i], revenu: Math.round(revenu), charges: Math.round(frais + coutTravaux + coutDepenses + salaires) };
  });

  // Couleurs DESIGN_SYSTEM — prop `color` (PieChart), pas frontColor (BarChart)
  const PIE_ITEMS = [
    { key: 'frais', value: totalFraisRecolte, color: '#fa8c16', label: t('dashboard.frais_recolte') },
    { key: 'travaux', value: totalCoutTravaux, color: '#ff4d4f', label: t('dashboard.cout_travaux') },
    { key: 'sal', value: totalSalaires, color: '#722ed1', label: t('dashboard.salaires') },
    { key: 'dep', value: totalDepenses, color: '#eb2f96', label: t('dashboard.other_expenses') },
  ].filter(d => d.value > 0);
  const pieData = PIE_ITEMS.map(d => ({ value: d.value, color: d.color, strokeWidth: 2, strokeColor: '#f0f4f0' }));

  const getEmployeNom = (l) => {
    if (l.nom_temp) return l.nom_temp;
    const emp = employes.find(e => e.id_employe === l.employe_id);
    return emp ? `${emp.nom} ${emp.prenom ?? ''}`.trim() : `Employé ${l.employe_id}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title={t('dashboard.title')} navigation={navigation} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>

        {/* KPIs */}
        <SectionHeader icon="chart-box" title={t('mobile.overview')} isRTL={isRTL} />
        <View style={[styles.kpiRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <KpiCard label={t('dashboard.total_area')} value={`${surfaceTotale} ${t('common.ha_short')}`} color="#3a5a2c" borderColor="#3a5a2c" bg="#f6faf3" isRTL={isRTL} />
          <KpiCard label={t('dashboard.total_trees')} value={nbArbres.toLocaleString()} color="#389e0d" borderColor="#52c41a" bg="#f6fff0" isRTL={isRTL} />
          <KpiCard label={`${t('dashboard.production')} ${derniereCampagne}`} value={`${productionTotale.toLocaleString()} ${t('common.kg_short')}`} color="#d46b08" borderColor="#fa8c16" bg="#fff7e6" isRTL={isRTL} />
          {isAdmin && <KpiCard label={`${t('dashboard.oil_production')} ${derniereCampagne}`} value={`${huileTotale.toLocaleString()} ${t('common.litre_short')}`} color="#08979c" borderColor="#13c2c2" bg="#e6fffb" isRTL={isRTL} />}
        </View>

        {/* Résumé financier */}
        {isAdmin && (
          <>
            <SectionHeader icon="cash-multiple" title={t('mobile.financial_summary')} isRTL={isRTL} />
            <GroupLabel label={t('dashboard.revenus_charges')} />
            <FinanceRow icon="trending-up" label={t('dashboard.revenu_brut')} formule={t('dashboard.revenu_brut_formule', { currency: currencySymbol })} value={`${revenuBrut.toFixed(0)} ${currencySymbol}`} accent="#3a5a2c" isRTL={isRTL} />
            <FinanceRow icon="trending-down" label={t('dashboard.total_charges')} formule={t('dashboard.cout_travaux') + ' + ' + t('dashboard.frais_recolte') + ' + ' + t('dashboard.salaires') + ' + ' + t('dashboard.autres_depenses')} value={`${totalCharges.toFixed(0)} ${currencySymbol}`} accent="#ff4d4f" isRTL={isRTL} />
            <GroupLabel label={t('dashboard.resultat')} />
            <FinanceRow icon="finance" label={t('dashboard.marge_nette')} formule={t('dashboard.revenu_brut') + ' − ' + t('dashboard.total_charges')} value={`${margeNette.toFixed(0)} ${currencySymbol}`} accent={margeNette >= 0 ? '#52c41a' : '#ff4d4f'} isRTL={isRTL} />
            <GroupLabel label={t('dashboard.performance')} />
            <FinanceRow icon="chart-line" label={t('dashboard.rendement_moyen_ha')} formule={t('dashboard.production_totale') + ' ÷ ' + t('dashboard.surface_totale_ha')} value={`${rendementHa} ${t('common.kg_ha')}`} accent="#1677ff" isRTL={isRTL} />
            <FinanceRow icon="calculator" label={t('dashboard.cout_moyen_kg')} formule={t('dashboard.cout_total') + ' ÷ ' + t('dashboard.production_totale_kg')} value={`${coutKg} ${currencySymbol}/${t('common.kg_short')}`} accent="#fa8c16" isRTL={isRTL} />
          </>
        )}

        {/* Activité financière */}
        {isAdmin && (
          <>
            <SectionHeader icon="chart-line" title={`${t('mobile.financial_activity')} ${currentYear}`} isRTL={isRTL} />
            <Card style={styles.chartCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 3, backgroundColor: '#2d7a4a', borderRadius: 2 }} />
                  <Text style={{ fontSize: 10, color: '#555' }}>{t('dashboard.revenue')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 3, backgroundColor: '#ff4d4f', borderRadius: 2 }} />
                  <Text style={{ fontSize: 10, color: '#555' }}>{t('dashboard.charges')}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: isRTL ? 'row-reverse' : 'row', minWidth: '100%', paddingBottom: 15 }}>
                <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                  <LineChart
                    areaChart
                    data={(monthlyData).map(d => ({ value: d.revenu }))}
                    data2={(monthlyData).map(d => ({ value: d.charges }))}
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
                    xAxisLabelTexts={MOIS}
                    xAxisLabelTextStyle={{ color: '#555', fontSize: 8, transform: isRTL ? [{ scaleX: -1 }, { rotate: '45deg' }] : [{ rotate: '-45deg' }], ...(isRTL ? {} : { width: 40 }), textAlign: 'center' }}
                    yAxisTextStyle={{ color: '#888', fontSize: 9, transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                    noOfSections={4}
                    width={Math.max(300, 12 * 35)}
                    spacing={35}
                    height={140}
                    initialSpacing={10}
                    hideRules={false}
                    rulesColor="#f0f0f0"
                  />
                </View>
              </ScrollView>
            </Card>
          </>
        )}

        {isAdmin && pieData.length > 0 && (
          <>
            <SectionHeader icon="chart-pie" title={t('dashboard.repartition')} isRTL={isRTL} />
            <Card style={styles.chartCard}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <PieChart
                  data={pieData}
                  donut
                  radius={75}
                  innerRadius={41}
                  showGradient={false}
                />
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}>
                  {PIE_ITEMS.map(d => {
                    const total = PIE_ITEMS.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <View key={d.key} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#333', textAlign: isRTL ? 'right' : 'left' }}>{d.label}</Text>
                          <Text style={{ fontSize: 10, color: '#595959', textAlign: isRTL ? 'right' : 'left' }}>
                            {d.value.toFixed(0)} {currencySymbol}
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
        <SectionHeader icon="shovel" title={t('mobile.last_works')} isRTL={isRTL} />
        <Card style={styles.listCard}>
          {derniersTravaux.length === 0
            ? <Text style={[styles.empty, isRTL && { textAlign: 'right' }]}>{t('mobile.no_work')}</Text>
            : derniersTravaux.map(travail => (
              <View key={travail.id_travail} style={[styles.travauxRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.statutDot, { backgroundColor: STATUT_COLORS[travail.statut] || '#888' }, isRTL && { marginRight: 0, marginLeft: 10 }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{travail.nom}</Text>
                  <Text variant="bodySmall" style={{ color: '#888', textAlign: isRTL ? 'right' : 'left' }}>{t(`travaux.types.${travail.type}`, { defaultValue: travail.type })} • {travail.date || ''}</Text>
                </View>
                <Chip textStyle={{ fontSize: 10 }} style={{ backgroundColor: (STATUT_COLORS[travail.statut] || '#888') + '22' }}>
                  {t(`travaux.statuts.${travail.statut}`)}
                </Chip>
              </View>
            ))
          }
        </Card>

        {/* Présences du mois */}
        {data?.feuille?.lignes?.length > 0 && (
          <>
            <SectionHeader icon="account-clock" title={t('mobile.month_presences')} isRTL={isRTL} />
            <Card style={styles.listCard}>
              {data.feuille.lignes.map((l, i) => (
                <View key={i} style={[styles.presenceRow, i > 0 && styles.presenceBorder, isRTL && { flexDirection: 'row-reverse' }]}>
                  <MaterialCommunityIcons name="account-circle" size={32} color="#2d7a4a" style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{getEmployeNom(l)}</Text>
                  </View>
                  <View style={styles.joursBadge}>
                    <Text variant="titleSmall" style={{ color: '#fff', fontWeight: 'bold' }}>{l.nb_jours_present ?? 0}</Text>
                    <Text style={{ color: '#fff', fontSize: 9 }}>{t('common.per_day_short')}</Text>
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

function GroupLabel({ label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: '#e0e0e0' }} />
      <Text style={{
        fontSize: 10,
        fontWeight: '700',
        color: '#b0bba8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginHorizontal: 10,
      }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: '#e0e0e0' }} />
    </View>
  );
}

function SectionHeader({ icon, title, isRTL }) {
  return (
    <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
      <MaterialCommunityIcons name={icon} size={18} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
      <Text variant="titleSmall" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{title}</Text>
    </View>
  );
}

function KpiCard({ label, value, color, borderColor, icon, bg, isRTL }) {
  return (
    <Card style={[styles.kpiCard, { borderTopColor: borderColor, backgroundColor: bg || '#fff' }]}>
      <Card.Content style={{ padding: 10 }}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text numberOfLines={2} style={{ color: '#888', fontSize: 10, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
          <MaterialCommunityIcons name={icon} size={18} color={color} style={{ marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }} />
        </View>
        <Text numberOfLines={1} style={{ color, fontWeight: 'bold', fontSize: 16, textAlign: isRTL ? 'right' : 'left' }}>{value}</Text>
      </Card.Content>
    </Card>
  );
}

function FinanceRow({ icon, label, formule, value, accent, isRTL }) {
  return (
    <View style={[
      styles.financeRow,
      isRTL
        ? { borderLeftWidth: 0, borderRightWidth: 4, borderRightColor: accent, flexDirection: 'row-reverse' }
        : { borderLeftColor: accent },
    ]}>
      <MaterialCommunityIcons name={icon} size={20} color={accent} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ fontWeight: '600', color: '#333', textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: '#aaa', fontSize: 10, fontStyle: 'italic', textAlign: isRTL ? 'right' : 'left' }}>{formule}</Text>
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
