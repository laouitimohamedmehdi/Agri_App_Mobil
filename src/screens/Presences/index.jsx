import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Button, Chip, Snackbar, ActivityIndicator, TextInput, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';

const DAYS_IN_MONTH = (mois) => {
  const [y, m] = mois.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const POSTE_KEYS = {
  'Ouvrier': 'ouvrier',
  "Chef d'équipe": 'chef_equipe',
  'Technicien': 'technicien',
  'Chauffeur': 'chauffeur',
  'Autre': 'autre',
};

export default function Presences({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { employes } = useData();
  const { currencySymbol } = useSettings();
  const tPoste = (p) => p ? t(`presences.poste_${POSTE_KEYS[p] || 'autre'}`, { defaultValue: p }) : '';
  const isRTL = i18n.language === 'ar';
  const isAdmin = user?.role === 'admin';
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [feuille, setFeuille] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFilterNom('');
    client.get(`/feuilles/?mois=${mois}`, { signal: controller.signal })
      .then(res => {
        setFeuille(res.data);
        setLignes(initLignes(res.data.lignes || []));
      })
      .catch(e => {
        if (e?.code === 'ERR_CANCELED' || e?.name === 'AbortError' || e?.name === 'CanceledError') return;
        setSnack(t('mobile.error_load'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [mois]);

  const fetchFeuille = async () => {
    setLoading(true);
    setFilterNom('');
    try {
      const res = await client.get(`/feuilles/?mois=${mois}`);
      setFeuille(res.data);
      setLignes(initLignes(res.data.lignes || []));
    } catch (e) {
      if (e?.code === 'ERR_CANCELED' || e?.name === 'AbortError') return;
      setSnack(t('mobile.error_load'));
    } finally { setLoading(false); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeuille();
    setRefreshing(false);
  };

  const initLignes = (rawLignes) => rawLignes.map(l => ({
    ...l,
    jours: parseJours(l.jours_json),
    confirmed: l.employe_id ? undefined : true,
  }));

  const parseJours = (jsonStr) => {
    try { return JSON.parse(jsonStr || '{}'); } catch { return {}; }
  };

  const setRemarque = (idx, val) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, remarque: val } : l));
  };

  const addTemp = () => {
    setLignes(prev => [...prev, { employe_id: null, nom_temp: '', tarif_temp: 0, jours: {}, remarque: '', confirmed: false }]);
  };

  const updateTemp = (idx, field, val) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === 'tarif_temp') return { ...l, tarif_temp: parseFloat(val) || 0 };
      return { ...l, [field]: val };
    }));
  };

  const removeTemp = (idx) => setLignes(prev => prev.filter((_, i) => i !== idx));

  const toggleConfirmTemp = (idx, value) => {
    if (value) {
      const ligne = lignes[idx];
      if (!ligne.nom_temp?.trim() || !(ligne.tarif_temp > 0)) {
        setSnack(t('mobile.warning_temp'));
        return;
      }
    }
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, confirmed: value } : l));
  };

  const validerTemporaires = () => {
    const invalides = lignes.filter(l => !l.employe_id && (!l.nom_temp?.trim() || !(l.tarif_temp > 0)));
    if (invalides.length > 0) {
      setSnack(t('mobile.warning_temp'));
      return false;
    }
    return true;
  };

  const toggleJour = (ligneIdx, jour) => {
    if (feuille?.statut === 'validee') return;
    setLignes(prev => prev.map((l, i) => {
      if (i !== ligneIdx) return l;
      return { ...l, jours: { ...l.jours, [jour]: l.jours[jour] === 1 ? 0 : 1 } };
    }));
  };

  const saveChanges = async () => {
    if (!feuille) return;
    if (!validerTemporaires()) return;
    setSaving(true);
    try {
      await client.put(`/feuilles/${feuille.id}`, {
        lignes: lignes.map(l => ({
          employe_id: l.employe_id || null,
          nom_temp: l.nom_temp || null,
          tarif_temp: l.tarif_temp || null,
          jours_json: JSON.stringify(l.jours),
          remarque: l.remarque || '',
        })),
      });
      await fetchFeuille();
      setSnack(t('mobile.saved'));
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSaving(false); }
  };

  const valider = async () => {
    if (!validerTemporaires()) return;
    try { await client.put(`/feuilles/${feuille.id}/valider`); await fetchFeuille(); setSnack(t('presences.success_validated')); }
    catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
  };

  const deverrouiller = async () => {
    try { await client.put(`/feuilles/${feuille.id}/deverrouiller`); await fetchFeuille(); setSnack(t('presences.success_unlocked')); }
    catch { setSnack(t('mobile.error_save')); }
  };

  const changeMonth = (delta) => {
    const d = new Date(mois + '-01');
    d.setMonth(d.getMonth() + delta);
    setMois(d.toISOString().slice(0, 7));
  };

  const exportPDF = async () => {
    const nbJours = DAYS_IN_MONTH(mois);
    const joursHeader = Array.from({ length: nbJours }, (_, i) => `<th>${i + 1}</th>`).join('');
    const rows = lignes.map(l => {
      const emp = employes.find(e => e.id_employe === l.employe_id);
      const nom = l.nom_temp || (emp ? `${emp.nom} ${emp.prenom ?? ''}` : `Emp ${l.employe_id}`);
      const cells = Array.from({ length: nbJours }, (_, i) => `<td style="text-align:center">${l.jours[String(i + 1)] === 1 ? '✓' : ''}</td>`).join('');
      const total = Object.values(l.jours).filter(v => v === 1).length;
      return `<tr><td>${nom}</td>${cells}<td style="text-align:center;font-weight:bold">${total}</td></tr>`;
    }).join('');
    const html = `<html><head><style>
      body{font-family:Arial,sans-serif}
      table{border-collapse:collapse;width:100%;font-size:9px}
      td,th{border:1px solid #ccc;padding:3px 4px}
      th{background:#2d7a4a;color:#fff;text-align:center}
      tr:nth-child(even){background:#f9fbe7}
    </style></head><body>
      <h3 style="color:#2d7a4a;margin-bottom:8px">Feuille de présences — ${moisLabel}</h3>
      <table><tr><th>Employé</th>${joursHeader}<th>Total</th></tr>${rows}</table>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  };

  const getEmployeNom = (l) => {
    if (l.nom_temp) return l.nom_temp;
    const emp = employes.find(e => e.id_employe === l.employe_id);
    return emp ? `${emp.nom} ${emp.prenom ?? ''}`.trim() : `Employé ${l.employe_id}`;
  };

  const getEmployePoste = (l) => {
    const emp = employes.find(e => e.id_employe === l.employe_id);
    return emp?.poste || '';
  };

  const [year, month] = mois.split('-').map(Number);
  const numLocale = { fr: 'fr-FR', en: 'en-US', ar: 'ar-TN' }[i18n.language] || 'fr-FR';
  const _moisRaw = new Intl.DateTimeFormat(numLocale, { month: 'long' }).format(new Date(year, month - 1, 1)) + ' ' + year;
  const moisLabel = _moisRaw.charAt(0).toUpperCase() + _moisRaw.slice(1);
  const nbJours = DAYS_IN_MONTH(mois);
  const days = Array.from({ length: nbJours }, (_, i) => i + 1);
  const canEdit = feuille?.statut !== 'validee';

  const lignesFiltrees = lignes
    .map((l, originalIdx) => ({ ...l, _originalIdx: originalIdx }))
    .filter(l => !filterNom || getEmployeNom(l).toLowerCase().includes(filterNom.toLowerCase()));

  const totalPresents = lignesFiltrees.reduce((s, l) => s + Object.values(l.jours).filter(v => v === 1).length, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title={t('presences.title')} navigation={navigation} />

      {/* Navigation mois */}
      <View style={[styles.monthNav, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={28} color="#2d7a4a" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="titleMedium" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>{moisLabel}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>{nbJours} {t('common.per_day_short')}</Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={28} color="#2d7a4a" />
        </TouchableOpacity>
        <TouchableOpacity onPress={exportPDF} style={[styles.navBtn, { backgroundColor: '#fff7e6', borderRadius: 8, paddingHorizontal: 8 }]}>
          <MaterialCommunityIcons name="file-pdf-box" size={22} color="#fa8c16" />
          <Text style={{ fontSize: 11, color: '#fa8c16', marginLeft: 2 }}>PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Barre statut + actions */}
      {feuille && (
        <View style={styles.statusBar}>
          {/* Ligne 1 : statut */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons
              name={feuille.statut === 'validee' ? 'check-circle' : 'pencil-circle'}
              size={16}
              color={feuille.statut === 'validee' ? '#52c41a' : '#fa8c16'}
            />
            <Text style={{ fontSize: 12, fontWeight: '600', color: feuille.statut === 'validee' ? '#52c41a' : '#fa8c16' }}>
              {feuille.statut === 'validee' ? t('presences.validated_on', { date: feuille.date_validation || '' }) : t('presences.draft')}
            </Text>
            <Text style={{ fontSize: 11, color: '#aaa' }}>· {totalPresents} {t('common.per_day_short')}</Text>
          </View>
          {/* Ligne 2 : boutons */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
            {feuille.statut !== 'validee' && (
              <>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#fa8c16' }]} onPress={addTemp}>
                  <Text style={[styles.actionBtnTxt, { color: '#fa8c16' }]}>{t('presences.btn_temporary')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={saveChanges}>
                  <Text style={[styles.actionBtnTxt, { color: '#2d7a4a' }]}>
                    {saving ? '...' : t('presences.btn_save')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2d7a4a', borderColor: '#2d7a4a', paddingHorizontal: 14 }]} onPress={valider}>
                  <Text style={[styles.actionBtnTxt, { color: '#fff', textAlign: 'center' }]} numberOfLines={1}>{t('presences.btn_validate')}</Text>
                </TouchableOpacity>
              </>
            )}
            {isAdmin && feuille.statut === 'validee' && (
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#1677ff' }]} onPress={deverrouiller}>
                <MaterialCommunityIcons name="lock-open-outline" size={16} color="#1677ff" />
                <Text style={[styles.actionBtnTxt, { color: '#1677ff' }]}>{t('presences.btn_unlock')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Recherche */}
      <TextInput
        placeholder={t('presences.filter_name')}
        value={filterNom}
        onChangeText={setFilterNom}
        left={<TextInput.Icon icon="magnify" />}
        right={filterNom ? <TextInput.Icon icon="close" onPress={() => setFilterNom('')} /> : null}
        mode="outlined"
        dense
        style={{ marginHorizontal: 12, marginTop: 8, backgroundColor: '#fff' }}
      />

      {/* Contenu */}
      {loading ? (
        <ActivityIndicator size="large" color="#2d7a4a" style={{ marginTop: 48 }} />
      ) : lignes.length === 0 ? (
        <EmptyState message={t('mobile.no_presence')} />
      ) : (
        <ScrollView style={{ flex: 1, marginTop: 8 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
          {lignesFiltrees.map((l, idx) => {
            const isTemp = !l.employe_id;
            const total = Object.values(l.jours).filter(v => v === 1).length;
            const poste = getEmployePoste(l);
            return (
              <Card key={idx} style={[styles.empCard, isTemp && (isRTL ? { borderRightWidth: 3, borderRightColor: '#fa8c16' } : { borderLeftWidth: 3, borderLeftColor: '#fa8c16' })]}>
                {/* En-tête carte employé */}
                <View style={[styles.empHeader, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.empAvatar, isTemp && { backgroundColor: '#fff7e6' }]}>
                    <MaterialCommunityIcons name={isTemp ? 'account-clock' : 'account'} size={22} color={isTemp ? '#fa8c16' : '#2d7a4a'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {isTemp && canEdit && !l.confirmed ? (
                      <>
                        <TextInput
                          label={t('presences.temp_name_placeholder')}
                          value={l.nom_temp || ''}
                          onChangeText={v => updateTemp(l._originalIdx, 'nom_temp', v)}
                          dense
                          style={{ marginBottom: 4 }}
                        />
                        <TextInput
                          label={`${t('presences.col_total')} (${currencySymbol}/${t('common.per_day_short')}) *`}
                          value={l.tarif_temp ? String(l.tarif_temp) : ''}
                          onChangeText={v => updateTemp(l._originalIdx, 'tarif_temp', v)}
                          keyboardType="numeric"
                          dense
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[styles.empName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{getEmployeNom(l)}</Text>
                        {isTemp ? (
                          <Text style={[styles.empPoste, { color: '#fa8c16', textAlign: isRTL ? 'right' : 'left' }]}>
                            {l.tarif_temp > 0 ? `${l.tarif_temp} ${currencySymbol}/${t('common.per_day_short')} · ` : ''}{t('mobile.temp_badge')}
                          </Text>
                        ) : poste ? <Text style={[styles.empPoste, { textAlign: isRTL ? 'right' : 'left' }]}>{tPoste(poste)}</Text> : null}
                      </>
                    )}
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalNum}>{total}</Text>
                      <Text style={styles.totalLabel}>{t('common.per_day_short')}</Text>
                    </View>
                    {isTemp && canEdit && (
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                        {!l.confirmed ? (
                          <TouchableOpacity onPress={() => toggleConfirmTemp(l._originalIdx, true)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#e8f5e9' }}>
                            <MaterialCommunityIcons name="check" size={16} color="#2d7a4a" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => toggleConfirmTemp(l._originalIdx, false)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#e8f0ff' }}>
                            <MaterialCommunityIcons name="pencil" size={16} color="#1677ff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => removeTemp(l._originalIdx)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#fff1f0' }}>
                          <MaterialCommunityIcons name="delete" size={16} color="#ff4d4f" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Grille jours */}
                <DaysGrid
                  days={days}
                  isRTL={isRTL}
                  jours={l.jours}
                  canEdit={canEdit}
                  onToggle={(d) => toggleJour(l._originalIdx, d)}
                />

                {/* Remarque */}
                {canEdit ? (
                  <TextInput
                    label={t('presences.col_remark')}
                    value={l.remarque || ''}
                    onChangeText={v => setRemarque(l._originalIdx, v)}
                    dense
                    style={{ marginHorizontal: 12, marginBottom: 8 }}
                  />
                ) : l.remarque ? (
                  <Text style={[styles.remarque, isRTL && { textAlign: 'right' }]}>
                    <Text style={{ fontWeight: '600' }}>{t('presences.col_remark')} : </Text>{l.remarque}
                  </Text>
                ) : null}
              </Card>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function DaysGrid({ days, isRTL, jours, canEdit, onToggle }) {
  const ref = useRef(null);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.daysScroll}
      onContentSizeChange={() => {
        if (isRTL) ref.current?.scrollToEnd({ animated: false });
      }}
    >
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4, paddingHorizontal: 12, paddingBottom: 12 }}>
        {days.map(d => {
          const val = jours[String(d)] === 1;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, val ? styles.dayPresent : styles.dayAbsent]}
              onPress={() => canEdit && onToggle(String(d))}
              activeOpacity={canEdit ? 0.65 : 1}
            >
              <Text style={[styles.dayNum, { color: val ? '#fff' : '#aaa' }]}>{d}</Text>
              <MaterialCommunityIcons
                name={val ? 'check' : 'minus'}
                size={14}
                color={val ? '#fff' : '#ddd'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#e0ece0',
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2d7a4a' },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  statusBar: {
    flexDirection: 'column',
    backgroundColor: '#f6faf3', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#e0ece0',
  },
  empCard: { marginHorizontal: 12, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  empHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 10,
  },
  empAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
  },
  empName: { fontSize: 14, fontWeight: '700', color: '#333' },
  empPoste: { fontSize: 11, color: '#888', marginTop: 1 },
  totalBadge: {
    backgroundColor: '#2d7a4a', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 48,
  },
  totalNum: { color: '#fff', fontWeight: 'bold', fontSize: 16, lineHeight: 20 },
  totalLabel: { color: '#b8e6c1', fontSize: 9 },
  daysScroll: { borderTopWidth: 1, borderColor: '#f0f0f0' },
  dayBtn: {
    width: 36, height: 48, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  dayPresent: { backgroundColor: '#2d7a4a' },
  dayAbsent: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  dayNum: { fontSize: 12, fontWeight: '600' },
  remarque: {
    fontSize: 12, color: '#666', fontStyle: 'italic',
    paddingHorizontal: 12, paddingBottom: 10,
  },
});
