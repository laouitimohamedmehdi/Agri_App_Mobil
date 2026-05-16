import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Switch, Text, Snackbar, SegmentedButtons, Chip, Card, List } from 'react-native-paper';
import RTLTextInput from '../../components/RTLTextInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import SelectFilter from '../../components/SelectFilter';
import { useData } from '../../contexts/DataContext';
import client from '../../api/client';
import DatePickerInput from '../../components/DatePickerInput';

const SCREEN_H = Dimensions.get('window').height;

const SALAIRE_CONFIG = {
  journalier: { color: '#fa8c16', bg: '#fff7e6', icon: 'calendar-today' },
  fixe: { color: '#1677ff', bg: '#e6f4ff', icon: 'currency-usd' },
};

export default function RH({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { employes, refreshEmployes } = useData();
  const [tab, setTab] = useState('employes');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', poste: '', telephone: '', type_contrat: 'saisonnier', date_embauche: '', date_fin_contrat: '', statut: 'actif', type_salaire: 'journalier', tarif_journalier: '', salaire_fixe: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPoste, setFilterPoste] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshEmployes();
    setRefreshing(false);
  };

  const postes = [...new Set(employes.map(e => e.poste).filter(Boolean))];
  const employesFiltres = employes.filter(e => {
    if (filterNom && !`${e.nom} ${e.prenom ?? ''}`.toLowerCase().includes(filterNom.toLowerCase())) return false;
    if (filterStatut === 'actif' && e.statut !== 'actif') return false;
    if (filterStatut === 'non_actif' && e.statut === 'actif') return false;
    if (filterPoste && e.poste !== filterPoste) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm({ nom: '', prenom: '', poste: '', telephone: '', type_contrat: 'saisonnier', date_embauche: '', date_fin_contrat: '', statut: 'actif', type_salaire: 'journalier', tarif_journalier: '', salaire_fixe: '' }); setDialogVisible(true); };
  const openEdit = (e) => { setEditing(e); setForm({ nom: e.nom, prenom: e.prenom ?? '', poste: e.poste ?? '', telephone: e.telephone ?? '', type_contrat: e.type_contrat ?? 'saisonnier', date_embauche: e.date_embauche ?? '', date_fin_contrat: e.date_fin_contrat ?? '', statut: e.statut ?? 'actif', type_salaire: e.type_salaire ?? 'journalier', tarif_journalier: String(e.tarif_journalier ?? ''), salaire_fixe: String(e.salaire_fixe ?? '') }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, prenom: form.prenom, poste: form.poste, telephone: form.telephone, type_contrat: form.type_contrat, date_embauche: form.date_embauche || null, date_fin_contrat: form.date_fin_contrat || null, statut: form.statut, type_salaire: form.type_salaire, tarif_journalier: parseFloat(form.tarif_journalier) || null, salaire_fixe: parseFloat(form.salaire_fixe) || null };
      if (editing) await client.put(`/rh/employes/${editing.id_employe}`, payload);
      else await client.post('/rh/employes/', payload);
      await refreshEmployes(); setDialogVisible(false);
    } catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
        setDialogVisible(false);
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/rh/employes/${confirmId}`); await refreshEmployes(); }
    catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack(t('mobile.error_delete'));
      }
    }
    setConfirmId(null);
  };

  return (
    <View style={styles.screen}>
      <AppHeader title={t('menu.rh')} navigation={navigation} />
      <SegmentedButtons value={tab} onValueChange={setTab} style={{ margin: 12 }}
        buttons={[
          { value: 'employes', label: t('mobile.employees'), icon: 'account-group' },
          { value: 'presences', label: t('mobile.presences'), icon: 'calendar-check' },
        ]} />

      {tab === 'employes' && (
        <View style={{ backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderColor: '#e0ece0' }}>
          <TextInput
            placeholder={t('presences.filter_name')}
            value={filterNom}
            onChangeText={setFilterNom}
            left={<TextInput.Icon icon="magnify" />}
            right={filterNom ? <TextInput.Icon icon="close" onPress={() => setFilterNom('')} /> : null}
            mode="outlined"
            dense
            style={{ marginBottom: 8, backgroundColor: '#fff' }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={filterStatut}
              onValueChange={setFilterStatut}
              buttons={[
                { value: '', label: t('mobile.all') },
                { value: 'actif', label: t('mobile.active') },
                { value: 'non_actif', label: t('mobile.inactive') },
              ]}
              style={{ marginRight: 8 }}
            />
            <SelectFilter
              label={t('presences.col_post')}
              value={filterPoste}
              onChange={setFilterPoste}
              options={postes.map(p => ({ value: p, label: p }))}
            />
          </ScrollView>
        </View>
      )}

      {tab === 'employes' ? (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialCommunityIcons name="account-group" size={18} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
            <Text variant="titleSmall" style={{ color: '#2d7a4a', fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{employesFiltres.length} employé(s)</Text>
          </View>
          {employesFiltres.length === 0 && employes.length > 0 ? <EmptyState message={t('mobile.no_employee')} /> : employesFiltres.length === 0 ? <EmptyState message={t('mobile.no_employee')} /> : (
            employesFiltres.map((e, i) => {
              const sc = SALAIRE_CONFIG[e.type_salaire] || SALAIRE_CONFIG.journalier;
              const salaire = e.type_salaire === 'journalier' ? `${e.tarif_journalier ?? 0} DT/j` : `${e.salaire_fixe ?? 0} DT/mois`;
              return (
                <Card key={e.id_employe} style={[styles.empCard, i > 0 && { marginTop: 8 }]}>
                  <View style={styles.empRow}>
                    <View style={[styles.avatar, { backgroundColor: e.statut === 'actif' ? '#e8f5e9' : '#f5f5f5' }]}>
                      <MaterialCommunityIcons name={e.statut === 'actif' ? 'account' : 'account-off'} size={26} color={e.statut === 'actif' ? '#2d7a4a' : '#aaa'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }}>{e.nom} {e.prenom ?? ''}</Text>
                      <Text variant="bodySmall" style={{ color: '#666', textAlign: isRTL ? 'right' : 'left' }}>{e.poste ?? '—'}</Text>
                      {e.telephone ? <Text variant="bodySmall" style={{ color: '#888', fontSize: 11, textAlign: isRTL ? 'right' : 'left' }}>{e.telephone}</Text> : null}
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6, marginTop: 4 }}>
                        <Chip icon={sc.icon} style={{ backgroundColor: sc.bg }} textStyle={{ color: sc.color, fontSize: 10 }}>{salaire}</Chip>
                        <Chip style={{ backgroundColor: e.statut === 'actif' ? '#e8f5e9' : '#f5f5f5' }} textStyle={{ color: e.statut === 'actif' ? '#2d7a4a' : '#aaa', fontSize: 10 }}>
                          {e.statut === 'actif' ? t('mobile.active') : t('mobile.inactive')}
                        </Chip>
                      </View>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Button icon="pencil" compact onPress={() => openEdit(e)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => setConfirmId(e.id_employe)} textColor="#ff4d4f" />
                    </View>
                  </View>
                </Card>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <PresencesResume employes={employes} />
      )}

      {tab === 'employes' && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? t('parametres.modal_edit') : t('parametres.modal_create')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              <RTLTextInput label={`${t('mobile.name')} *`} value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} maxLength={20} style={{ marginBottom: 12 }} />
              <RTLTextInput label={`${t('mobile.first_name')} *`} value={form.prenom} onChangeText={v => setForm(f => ({ ...f, prenom: v }))} maxLength={20} style={{ marginBottom: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t('presences.col_post')} *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll
                  label={t('presences.col_post')}
                  value={form.poste}
                  onChange={v => setForm(f => ({ ...f, poste: v }))}
                  options={[
                    { value: 'Ouvrier', label: 'Ouvrier' },
                    { value: "Chef d'équipe", label: "Chef d'équipe" },
                    { value: 'Technicien', label: 'Technicien' },
                    { value: 'Chauffeur', label: 'Chauffeur' },
                    { value: 'Autre', label: 'Autre' },
                  ]}
                />
              </View>

              <RTLTextInput label={t('mobile.phone')} value={form.telephone} onChangeText={v => setForm(f => ({ ...f, telephone: v }))} keyboardType="phone-pad" style={{ marginBottom: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t('mobile.contract')}</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll
                  label="Choisir un type"
                  value={form.type_contrat}
                  onChange={v => setForm(f => ({ ...f, type_contrat: v }))}
                  options={[
                    { value: 'permanent', label: t('mobile.permanent') },
                    { value: 'saisonnier', label: t('mobile.seasonal') },
                  ]}
                />
              </View>

              <DatePickerInput label={t('mobile.hire_date')} value={form.date_embauche} onChange={v => setForm(f => ({ ...f, date_embauche: v }))} style={{ marginBottom: 12 }} />
              <DatePickerInput label={t('mobile.end_date')} value={form.date_fin_contrat} onChange={v => setForm(f => ({ ...f, date_fin_contrat: v }))} style={{ marginBottom: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t('mobile.status')}</Text>
              <SegmentedButtons
                value={form.statut}
                onValueChange={v => setForm(f => ({ ...f, statut: v }))}
                buttons={[
                  { value: 'actif', label: t('mobile.active') },
                  { value: 'non_actif', label: t('mobile.inactive') },
                ]}
                style={{ marginBottom: 12 }}
              />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t('mobile.salary_type')}</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll
                  label="Choisir un type"
                  value={form.type_salaire}
                  onChange={v => setForm(f => ({ ...f, type_salaire: v }))}
                  options={[
                    { value: 'journalier', label: t('mobile.daily_rate') },
                    { value: 'fixe', label: t('mobile.fixed_salary') },
                  ]}
                />
              </View>

              {form.type_salaire === 'journalier'
                ? <RTLTextInput label={t('mobile.daily_rate')} value={form.tarif_journalier} onChangeText={v => setForm(f => ({ ...f, tarif_journalier: v }))} keyboardType="numeric" />
                : <RTLTextInput label={t('mobile.fixed_salary')} value={form.salaire_fixe} onChangeText={v => setForm(f => ({ ...f, salaire_fixe: v }))} keyboardType="numeric" />
              }
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('mobile.cancel')}</Button>
            <Button onPress={save} loading={saving}>{t('mobile.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title={t('mobile.delete')} message={t('mobile.confirm_delete')} onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel={t('mobile.delete')} />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function PresencesResume({ employes }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [feuille, setFeuille] = useState(null);
  const [loading, setLoading] = useState(true);
  const mois = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const controller = new AbortController();
    client.get(`/feuilles/?mois=${mois}`, { signal: controller.signal })
      .then(r => setFeuille(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <Text style={{ padding: 16, color: '#888' }}>{t('common.loading')}</Text>;
  if (!feuille || !feuille.lignes?.length) return <EmptyState message={t('mobile.no_presence')} />;

  return (
    <ScrollView style={{ padding: 12 }}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 8 }}>
        <MaterialCommunityIcons name="calendar-month" size={18} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
        <Text variant="titleSmall" style={{ color: '#2d7a4a', fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t('presences.title')} — {mois}</Text>
      </View>
      {feuille.lignes.map((l, i) => {
        const emp = employes.find(e => e.id_employe === l.employe_id);
        const nom = emp ? `${emp.nom} ${emp.prenom ?? ''}` : l.nom_temp || `Employé ${l.employe_id}`;
        const jours = l.nb_jours_present ?? 0;
        return (
          <Card key={i} style={{ marginBottom: 8, elevation: 1 }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 12 }}>
              <MaterialCommunityIcons name="account-circle" size={32} color="#2d7a4a" style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
              <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{nom}</Text>
              <View style={{ backgroundColor: '#2d7a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{jours}</Text>
                <Text style={{ color: '#fff', fontSize: 9 }}>jours</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, paddingHorizontal: 12 },
  empCard: { elevation: 2 },
  empRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
