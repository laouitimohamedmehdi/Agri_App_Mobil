import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Text, Divider, Snackbar, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import SelectFilter from '../../components/SelectFilter';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';
import DatePickerInput from '../../components/DatePickerInput';

const SCREEN_H = Dimensions.get('window').height;
const TYPES_FRAIS = ['Récolte', 'Transport', "Main d'œuvre", 'Trituration', 'Emballage', 'Autre'];

export default function Recoltes({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { secteurs, parcelles } = useData();
  const { user } = useAuth();
  const { currencySymbol } = useSettings();
  const isAdmin = user?.role === 'admin';

  const [recoltes, setRecoltes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterCampagne, setFilterCampagne] = useState('');
  const [filterLieu, setFilterLieu] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Dialog création/modification
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ campagne: '', date: '', production: '', secteur_id: '', huile: '', prix: '' });
  const [formParcelle, setFormParcelle] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialogs demande
  const [confirmId, setConfirmId] = useState(null);
  const [demandeSupprItem, setDemandeSupprItem] = useState(null);
  const [demandeModifItem, setDemandeModifItem] = useState(null);
  const [motifSuppr, setMotifSuppr] = useState('');
  const [demandeForm, setDemandeForm] = useState({ campagne: '', production: '', secteur_id: '', motif: '' });
  const [savingDemande, setSavingDemande] = useState(false);

  // Ajout ligne inline par groupe
  const [addLineGroup, setAddLineGroup] = useState(null);
  const [addLineForm, setAddLineForm] = useState({ date: '', production: '', huile: '', prix: '' });
  const [savingLine, setSavingLine] = useState(false);

  // Frais
  const [addingChargeFor, setAddingChargeFor] = useState(null);
  const [chargeForm, setChargeForm] = useState({ type_frais: TYPES_FRAIS[0], montant: '' });
  const [savingCharge, setSavingCharge] = useState(false);
  const [confirmChargeId, setConfirmChargeId] = useState(null);

  const [snack, setSnack] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const sig = { signal: controller.signal };
    Promise.all([
      client.get('/recoltes/', sig),
      client.get('/recolte-analyse/', sig).catch(() => ({ data: [] })),
      client.get('/recolte-charges/', sig).catch(() => ({ data: [] })),
    ])
      .then(([r, a, c]) => { setRecoltes(r.data); setAnalyses(a.data); setCharges(c.data); })
      .catch(e => { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError' && e?.name !== 'CanceledError') setSnack(t('mobile.error_load')); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const fetchAll = async () => {
    try {
      const [r, a, c] = await Promise.all([
        client.get('/recoltes/'),
        client.get('/recolte-analyse/').catch(() => ({ data: [] })),
        client.get('/recolte-charges/').catch(() => ({ data: [] })),
      ]);
      setRecoltes(r.data);
      setAnalyses(a.data);
      setCharges(c.data);
    } catch (e) { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError') setSnack(t('mobile.error_load')); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  const getAnalyse = (id) => analyses.find(a => a.recolte_id === id);
  const getCharges = (id) => charges.filter(c => c.recolte_id === id);
  const getSecteurNom = (id) => secteurs.find(s => s.id_secteur === id)?.nom || '—';
  const getParcelleNom = (secteurId) => {
    const sec = secteurs.find(s => s.id_secteur === secteurId);
    return parcelles.find(p => p.id_parcelle === sec?.parcelle_id)?.nom || '—';
  };

  const lieuOptions = secteurs.map(s => ({
    value: String(s.id_secteur),
    label: `${parcelles.find(p => p.id_parcelle === s.parcelle_id)?.nom || '—'} — ${s.nom}`,
  }));
  const campagnes = [...new Set(recoltes.map(r => r.campagne).filter(Boolean))].sort().reverse();

  const filtered = recoltes.filter(r => {
    if (filterCampagne && r.campagne !== filterCampagne) return false;
    if (filterLieu && String(r.secteur_id) !== filterLieu) return false;
    return true;
  });

  // Groupement par campagne × secteur_id
  const groups = Object.values(
    filtered.reduce((acc, r) => {
      const key = `${r.campagne}__${r.secteur_id}`;
      if (!acc[key]) acc[key] = { key, campagne: r.campagne, secteur_id: r.secteur_id, recoltes: [] };
      acc[key].recoltes.push(r);
      return acc;
    }, {})
  ).sort((a, b) => (b.campagne || '').localeCompare(a.campagne || ''));

  // ── CRUD récolte principale ───────────────────────────────────────
  const openCreate = () => {
    setEditing(null); setFormParcelle('');
    setForm({ campagne: '', date: '', production: '', secteur_id: '', huile: '', prix: '' });
    setDialogVisible(true);
  };
  const openEdit = (r) => {
    const a = getAnalyse(r.id_recolte);
    setEditing(r); setFormParcelle('');
    setForm({ campagne: r.campagne || '', date: r.date ?? '', production: String(r.production ?? ''), secteur_id: String(r.secteur_id ?? ''), huile: String(a?.huile ?? ''), prix: String(a?.prix ?? '') });
    setDialogVisible(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      const payload = { campagne: form.campagne, date: form.date || null, production: parseFloat(form.production) || 0, secteur_id: parseInt(form.secteur_id) || null };
      let recolteId;
      if (editing) { await client.put(`/recoltes/${editing.id_recolte}`, payload); recolteId = editing.id_recolte; }
      else { const res = await client.post('/recoltes/', payload); recolteId = res.data.id_recolte; }
      if (isAdmin) {
        const ap = { huile: parseFloat(form.huile) || 0, prix: parseFloat(form.prix) || 0, frais: 0, recolte_id: recolteId };
        const ex = getAnalyse(recolteId);
        if (ex) await client.put(`/recolte-analyse/${ex.id_rec_analy ?? ex.id}`, ap);
        else await client.post('/recolte-analyse/', ap);
      }
      await fetchAll(); setDialogVisible(false);
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
        setDialogVisible(false);
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    try {
      const a = getAnalyse(confirmId);
      if (a) await client.delete(`/recolte-analyse/${a.id_rec_analy ?? a.id}`).catch(() => {});
      await client.delete(`/recoltes/${confirmId}`);
      await fetchAll();
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
      } else {
        setSnack(t('mobile.error_delete'));
      }
    }
    setConfirmId(null);
  };

  // ── Ajout ligne inline ────────────────────────────────────────────
  const addLine = async () => {
    if (!addLineForm.production || parseFloat(addLineForm.production) <= 0) { setSnack(t('recoltes.production_invalid')); return; }
    setSavingLine(true);
    try {
      const res = await client.post('/recoltes/', {
        campagne: addLineGroup.campagne, secteur_id: addLineGroup.secteur_id,
        date: addLineForm.date || null, production: parseFloat(addLineForm.production) || 0,
      });
      if (isAdmin) await client.post('/recolte-analyse/', {
        huile: parseFloat(addLineForm.huile) || 0, prix: parseFloat(addLineForm.prix) || 0,
        frais: 0, recolte_id: res.data.id_recolte,
      });
      setAddLineGroup(null); setAddLineForm({ date: '', production: '', huile: '', prix: '' });
      await fetchAll();
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
        setAddLineGroup(null);
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSavingLine(false); }
  };

  // ── Frais ─────────────────────────────────────────────────────────
  const addCharge = async () => {
    const montant = parseFloat(chargeForm.montant);
    if (!montant || montant <= 0) { setSnack(t('recoltes.montant_invalid')); return; }
    setSavingCharge(true);
    try {
      await client.post('/recolte-charges/', { recolte_id: addingChargeFor, type_frais: chargeForm.type_frais, montant });
      await fetchAll(); setAddingChargeFor(null); setChargeForm({ type_frais: TYPES_FRAIS[0], montant: '' });
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
        setAddingChargeFor(null);
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSavingCharge(false); }
  };
  const deleteCharge = async () => {
    try { await client.delete(`/recolte-charges/${confirmChargeId}`); await fetchAll(); }
    catch { setSnack(t('mobile.error_delete')); }
    setConfirmChargeId(null);
  };

  // ── Demandes ──────────────────────────────────────────────────────
  const envoyerDemandeModif = async () => {
    setSavingDemande(true);
    try {
      const { motif: m, ...data } = demandeForm;
      await soumettreDemande({ type_action: 'modification', entity_type: 'recolte', entity_id: demandeModifItem.id_recolte, motif: m, nouvelles_donnees: { campagne: data.campagne, production: parseFloat(data.production) || 0 } });
      setSnack(t('mobile.request_sent')); setDemandeModifItem(null);
    } catch { setSnack(t('mobile.error_send')); }
    finally { setSavingDemande(false); }
  };
  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'recolte', entity_id: demandeSupprItem.id_recolte, motif: motifSuppr });
      setSnack(t('mobile.request_sent'));
    } catch { setSnack(t('mobile.error_send')); }
    setDemandeSupprItem(null); setMotifSuppr('');
  };

  const secteursForForm = formParcelle ? secteurs.filter(s => String(s.parcelle_id) === formParcelle) : secteurs;

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title={t('menu.harvests')} navigation={navigation} />

      {/* Filtres */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', padding: 8, flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
        <SelectFilter label={t('mobile.campaign')} value={filterCampagne} onChange={setFilterCampagne} options={campagnes.map(c => ({ value: c, label: c }))} />
        <SelectFilter label={t('mobile.location')} value={filterLieu} onChange={setFilterLieu} options={lieuOptions} />
      </View>

      {/* Compteur */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="basket" size={16} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>
          {groups.length} {t('mobile.campaign')}{isRTL ? '' : '(s)'} · {filtered.length} {t('menu.harvests').toLowerCase()}{isRTL ? '' : '(s)'}
        </Text>
      </View>

      {groups.length === 0 ? <EmptyState message={t('mobile.no_harvest')} /> : (
        <ScrollView style={{ backgroundColor: '#f0f4f0' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
          {groups.map(group => {
            const totalProd = group.recoltes.reduce((s, r) => s + (r.production || 0), 0);
            const totalHuile = group.recoltes.reduce((s, r) => s + (getAnalyse(r.id_recolte)?.huile || 0), 0);
            const totalFrais = group.recoltes.reduce((s, r) => s + getCharges(r.id_recolte).reduce((sf, c) => sf + (c.montant || 0), 0), 0);
            const revenuBrut = group.recoltes.reduce((s, r) => { const a = getAnalyse(r.id_recolte); return s + (a?.huile || 0) * (a?.prix || 0); }, 0);
            const margeNette = revenuBrut - totalFrais;
            const isExpanded = expandedGroup === group.key;

            return (
              <List.Accordion
                key={group.key}
                title={`${group.campagne || '—'} · ${getParcelleNom(group.secteur_id)}`}
                description={`${getSecteurNom(group.secteur_id)} · ${totalProd.toLocaleString('fr-FR')} ${t('common.kg_short')} · ${group.recoltes.length} ${t('recoltes.entries_many')}`}
                expanded={isExpanded}
                onPress={() => setExpandedGroup(isExpanded ? null : group.key)}
                left={props => <List.Icon {...props} icon="basket" />}
                style={{ backgroundColor: '#f6faf3', marginBottom: 2 }}
                titleStyle={{ color: '#2d7a4a', fontWeight: 'bold', fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}
                descriptionStyle={{ fontSize: 11, textAlign: isRTL ? 'right' : 'left' }}
              >
                {/* Bilan admin */}
                {isAdmin && (
                  <View style={styles.bilanRow}>
                    <BilanBadge label={t('dashboard.oil_production')} value={`${totalHuile.toLocaleString('fr-FR')} ${t('common.litre_short')}`} color="#08979c" />
                    <BilanBadge label={t('dashboard.frais_recolte')} value={`${totalFrais.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currencySymbol}`} color="#d46b08" />
                    <BilanBadge label={t('dashboard.revenue')} value={`${revenuBrut.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currencySymbol}`} color="#3a5a2c" />
                    <BilanBadge label={t('dashboard.marge_nette')} value={`${margeNette.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currencySymbol}`} color={margeNette >= 0 ? '#52c41a' : '#ff4d4f'} />
                  </View>
                )}

                <Divider />

                {/* Récoltes individuelles */}
                {group.recoltes
                  .slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map(r => {
                    const a = getAnalyse(r.id_recolte);
                    const rCharges = getCharges(r.id_recolte);
                    const totalRFrais = rCharges.reduce((s, c) => s + (c.montant || 0), 0);
                    return (
                      <View key={r.id_recolte} style={[styles.recolteRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            {r.date && <Text variant="bodySmall" style={{ color: '#888', textAlign: isRTL ? 'right' : 'left' }}>{r.date}</Text>}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#2d7a4a', textAlign: isRTL ? 'right' : 'left' }}>{r.production?.toLocaleString('fr-FR')} {t('common.kg_short')}</Text>
                          </View>
                          {isAdmin && a && (
                            <Text variant="bodySmall" style={{ color: '#555' }}>
                              {a.huile} {t('common.litre_short')} · {a.prix} {currencySymbol}/{t('common.litre_short')}
                              {totalRFrais > 0 && <Text style={{ color: '#d46b08' }}> · {t('dashboard.frais_recolte')} : {totalRFrais.toLocaleString('fr-FR')} {currencySymbol}</Text>}
                            </Text>
                          )}
                          {/* Frais pills */}
                          {isAdmin && rCharges.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {rCharges.map(c => (
                                <View key={c.id} style={styles.chargePill}>
                                  <Text style={{ fontSize: 10, color: '#d46b08', fontWeight: '600' }}>{t(`recoltes.frais_types.${c.type_frais}`, { defaultValue: c.type_frais })}</Text>
                                  <Text style={{ fontSize: 10, color: '#555' }}> {c.montant?.toLocaleString('fr-FR')} {currencySymbol}</Text>
                                  <Button icon="close" compact contentStyle={{ margin: -10 }} onPress={() => setConfirmChargeId(c.id)} textColor="#ff4d4f" />
                                </View>
                              ))}
                            </View>
                          )}
                          {/* Ajout frais inline */}
                          {isAdmin && addingChargeFor === r.id_recolte ? (
                            <View style={{ marginTop: 6, gap: 6 }}>
                              <SelectFilter noAll label={t('mobile.type')} value={chargeForm.type_frais}
                                onChange={v => setChargeForm(f => ({ ...f, type_frais: v }))}
                                options={TYPES_FRAIS.map(t => ({ value: t, label: t }))} />
                              <TextInput label={`${t('recoltes.montant_placeholder')} (${currencySymbol})`} value={chargeForm.montant}
                                onChangeText={v => setChargeForm(f => ({ ...f, montant: v }))} keyboardType="numeric" dense />
                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                                <Button compact onPress={() => setAddingChargeFor(null)}>{t('mobile.cancel')}</Button>
                                <Button compact mode="contained" buttonColor="#2d7a4a" onPress={addCharge} loading={savingCharge}>{t('mobile.add')}</Button>
                              </View>
                            </View>
                          ) : isAdmin && (
                            <Button icon="plus" compact onPress={() => { setAddingChargeFor(r.id_recolte); setChargeForm({ type_frais: TYPES_FRAIS[0], montant: '' }); }} textColor="#d46b08" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                              {t('dashboard.frais_recolte')}
                            </Button>
                          )}
                        </View>
                        {isAdmin ? (
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <Button icon="pencil" compact contentStyle={{ margin: -4 }} onPress={() => openEdit(r)} textColor="#1677ff" />
                            <Button icon="delete" compact contentStyle={{ margin: -4 }} onPress={() => setConfirmId(r.id_recolte)} textColor="#ff4d4f" />
                          </View>
                        ) : (
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <Button icon="pencil" compact contentStyle={{ margin: -4 }} onPress={() => { setDemandeModifItem(r); setDemandeForm({ campagne: r.campagne, production: String(r.production ?? ''), secteur_id: String(r.secteur_id ?? ''), motif: '' }); }} textColor="#1677ff" />
                            <Button icon="delete" compact contentStyle={{ margin: -4 }} onPress={() => { setDemandeSupprItem(r); setMotifSuppr(''); }} textColor="#ff4d4f" />
                          </View>
                        )}
                      </View>
                    );
                  })}

                {/* Ajout ligne dans le groupe */}
                {isAdmin && (
                  <>
                    <Divider style={{ marginTop: 4 }} />
                    {addLineGroup?.key === group.key ? (
                      <View style={{ padding: 12, backgroundColor: '#f0f9f0', gap: 8 }}>
                        <Text variant="bodySmall" style={{ color: '#389e0d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{t('mobile.add')}</Text>
                        <DatePickerInput label={t('travaux.col_date')} value={addLineForm.date} onChange={v => setAddLineForm(f => ({ ...f, date: v }))} />
                        <TextInput label={t('recoltes.col_production')} value={addLineForm.production} onChangeText={v => setAddLineForm(f => ({ ...f, production: v }))} keyboardType="numeric" dense style={{ marginTop: 4 }} />
                        <TextInput label={t('recoltes.form_oil')} value={addLineForm.huile} onChangeText={v => setAddLineForm(f => ({ ...f, huile: v }))} keyboardType="numeric" dense />
                        <TextInput label={t('recoltes.col_price', { currency: currencySymbol })} value={addLineForm.prix} onChangeText={v => setAddLineForm(f => ({ ...f, prix: v }))} keyboardType="numeric" dense />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                          <Button compact onPress={() => setAddLineGroup(null)}>{t('mobile.cancel')}</Button>
                          <Button compact mode="contained" buttonColor="#2d7a4a" onPress={addLine} loading={savingLine}>{t('mobile.add')}</Button>
                        </View>
                      </View>
                    ) : (
                      <Button icon="plus" compact onPress={() => { setAddLineGroup(group); setAddLineForm({ date: '', production: '', huile: '', prix: '' }); }} textColor="#2d7a4a" style={{ margin: 8 }}>
                        {t('mobile.add')}
                      </Button>
                    )}
                  </>
                )}
              </List.Accordion>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? t('recoltes.modal_edit') : t('recoltes.modal_create')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.5 }}>
              <TextInput label={t('mobile.campaign')} value={form.campagne} onChangeText={v => setForm(f => ({ ...f, campagne: v }))} maxLength={20} style={{ marginBottom: 12 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} />
              <DatePickerInput label={t('travaux.col_date')} value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />
              <Text variant="labelMedium" style={{ marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t('mobile.plot')}</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label={t('recoltes.choose_parcelle')} value={formParcelle}
                  onChange={v => { setFormParcelle(v); setForm(f => ({ ...f, secteur_id: '' })); }}
                  options={parcelles.map(p => ({ value: String(p.id_parcelle), label: p.nom }))} />
              </View>
              <Text variant="labelMedium" style={{ marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t('mobile.sector')} *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label={t('recoltes.choose_secteur')} value={form.secteur_id}
                  onChange={v => setForm(f => ({ ...f, secteur_id: v }))}
                  options={secteursForForm.map(s => ({ value: String(s.id_secteur), label: s.nom }))} />
              </View>
              <TextInput label={t('recoltes.col_production')} value={form.production} onChangeText={v => setForm(f => ({ ...f, production: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} />
              {isAdmin && (
                <>
                  <Divider style={{ marginBottom: 12 }} />
                  <TextInput label={t('recoltes.form_oil')} value={form.huile} onChangeText={v => setForm(f => ({ ...f, huile: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} />
                  <TextInput label={t('recoltes.col_price', { currency: currencySymbol })} value={form.prix} onChangeText={v => setForm(f => ({ ...f, prix: v }))} keyboardType="numeric" contentStyle={isRTL ? { textAlign: 'right' } : undefined} />
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('mobile.cancel')}</Button>
            <Button onPress={save} loading={saving}>{t('mobile.save')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!demandeModifItem} onDismiss={() => setDemandeModifItem(null)}>
          <Dialog.Title>{t('demandes.action_modify')}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t('mobile.demand_reason_required')} value={demandeForm.motif} onChangeText={v => setDemandeForm(f => ({ ...f, motif: v }))} multiline maxLength={200} style={{ marginBottom: 12 }} />
            <TextInput label={t('mobile.campaign')} value={demandeForm.campagne} onChangeText={v => setDemandeForm(f => ({ ...f, campagne: v }))} maxLength={20} style={{ marginBottom: 12 }} />
            <TextInput label={t('recoltes.col_production')} value={demandeForm.production} onChangeText={v => setDemandeForm(f => ({ ...f, production: v }))} keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeModifItem(null)}>{t('mobile.cancel')}</Button>
            <Button onPress={envoyerDemandeModif} loading={savingDemande}>{t('mobile.send')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!demandeSupprItem} onDismiss={() => setDemandeSupprItem(null)}>
          <Dialog.Title>{t('demandes.action_delete')}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t('mobile.demand_reason_required')} value={motifSuppr} onChangeText={setMotifSuppr} multiline maxLength={200} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeSupprItem(null)}>{t('mobile.cancel')}</Button>
            <Button onPress={envoyerDemandeSuppr}>{t('mobile.send')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog visible={!!confirmId} title={t('mobile.delete')} message={t('mobile.confirm_delete')} onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel={t('mobile.delete')} />
      <ConfirmDialog visible={!!confirmChargeId} title={t('mobile.delete')} message={t('mobile.confirm_delete')} onConfirm={deleteCharge} onDismiss={() => setConfirmChargeId(null)} confirmLabel={t('mobile.delete')} />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function BilanBadge({ label, value, color }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  return (
    <View style={{
      alignItems: 'center', flex: 1,
      borderLeftWidth: isRTL ? 0 : 3, borderLeftColor: isRTL ? 'transparent' : color, paddingLeft: isRTL ? 0 : 8,
      borderRightWidth: isRTL ? 3 : 0, borderRightColor: isRTL ? color : 'transparent', paddingRight: isRTL ? 8 : 0,
    }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color, textAlign: 'center' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#888', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bilanRow: { flexDirection: 'row', padding: 10, backgroundColor: '#e8f5e9', gap: 8 },
  recolteRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderBottomWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fff' },
  chargePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7e6', borderWidth: 1, borderColor: '#ffd591', borderRadius: 12, paddingLeft: 8, paddingVertical: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
