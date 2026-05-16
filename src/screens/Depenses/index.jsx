import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Text, Snackbar, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import DatePickerInput from '../../components/DatePickerInput';
import SelectFilter from '../../components/SelectFilter';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { soumettreDemande } from '../../utils/demandeHelper';

const SCREEN_H = Dimensions.get('window').height;

export default function Depenses({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const { currencySymbol } = useSettings();
  const isAdmin = user?.role === 'admin';
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAnnee, setFilterAnnee] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titre: '', date: '', quantite: '', cout_unitaire: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [demandeItem, setDemandeItem] = useState(null);
  const [demandeAction, setDemandeAction] = useState(null);
  const [demandeMotif, setDemandeMotif] = useState('');
  const [demandeForm, setDemandeForm] = useState({ titre: '', date: '', quantite: '', cout_unitaire: '' });
  const [savingDemande, setSavingDemande] = useState(false);
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDepenses();
    setRefreshing(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    client.get('/depenses/', { signal: controller.signal })
      .then(res => setDepenses(res.data.sort((a, b) => (b.date || '').localeCompare(a.date || ''))))
      .catch(e => { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError' && e?.name !== 'CanceledError') setSnack(t('mobile.error_load')); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const fetchDepenses = async () => {
    try {
      const res = await client.get('/depenses/');
      setDepenses(res.data.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    } catch (e) { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError') setSnack(t('mobile.error_load')); }
    finally { setLoading(false); }
  };

  const annees = [...new Set(depenses.map(d => d.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const filtered = depenses.filter(d => !filterAnnee || d.date?.slice(0, 4) === filterAnnee);
  const totalFiltre = filtered.reduce((s, d) => s + (d.quantite || 0) * (d.cout_unitaire || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ titre: '', date: '', quantite: '', cout_unitaire: '' });
    setDialogVisible(true);
  };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ titre: d.titre, date: d.date || '', quantite: String(d.quantite ?? ''), cout_unitaire: String(d.cout_unitaire ?? '') });
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        titre: form.titre,
        date: form.date || null,
        quantite: parseFloat(form.quantite) || 0,
        cout_unitaire: parseFloat(form.cout_unitaire) || 0,
      };
      if (editing) await client.put(`/depenses/${editing.id_depense}`, payload);
      else await client.post('/depenses/', payload);
      await fetchDepenses();
      setDialogVisible(false);
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
    try { await client.delete(`/depenses/${confirmId}`); await fetchDepenses(); }
    catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack(t('mobile.error_delete'));
      }
    }
    setConfirmId(null);
  };

  const openDemande = (action, d) => {
    setDemandeAction(action);
    setDemandeItem(d);
    setDemandeMotif('');
    setDemandeForm({ titre: d.titre, date: d.date || '', quantite: String(d.quantite ?? ''), cout_unitaire: String(d.cout_unitaire ?? '') });
  };

  const envoyerDemande = async () => {
    setSavingDemande(true);
    try {
      const payload = {
        type_action: demandeAction,
        entity_type: 'depense',
        entity_id: demandeItem.id_depense,
        motif: demandeMotif,
      };
      if (demandeAction === 'modification') {
        payload.nouvelles_donnees = JSON.stringify({
          titre: demandeForm.titre,
          date: demandeForm.date || null,
          quantite: parseFloat(demandeForm.quantite) || 0,
          cout_unitaire: parseFloat(demandeForm.cout_unitaire) || 0,
        });
      }
      await soumettreDemande(payload);
      setSnack(t('mobile.request_sent'));
      setDemandeItem(null);
    } catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSavingDemande(false); }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title={t('depenses.title')} navigation={navigation} />

      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', padding: 8, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
        <SelectFilter
          label={t('mobile.year')}
          value={filterAnnee}
          onChange={setFilterAnnee}
          options={annees.map(a => ({ value: a, label: a }))}
        />
        {filtered.length > 0 && (
          <Text variant="bodySmall" style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            {t('depenses.total_label')} {totalFiltre.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="receipt" size={16} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{filtered.length} {t('depenses.btn_add')}{isRTL ? '' : '(s)'}</Text>
      </View>

      {filtered.length === 0 ? <EmptyState message={t('mobile.no_expense')} /> : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
          {filtered.map((d) => {
            const total = (d.quantite || 0) * (d.cout_unitaire || 0);
            return (
              <View key={d.id_depense} style={[
                { margin: 8, padding: 12, backgroundColor: '#fff', borderRadius: 8, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#2d7a4a' },
                isRTL && { borderLeftWidth: 0, borderRightWidth: 3, borderRightColor: '#2d7a4a' }
              ]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{d.titre}</Text>
                    <Text variant="bodySmall" style={{ color: '#888', textAlign: isRTL ? 'right' : 'left' }}>{d.date || '—'}</Text>
                    <Text variant="bodySmall" style={{ color: '#555', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                      {d.quantite} × {d.cout_unitaire?.toLocaleString('fr-FR')} {currencySymbol}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', color: '#ff4d4f', fontSize: 15 }}>
                    {total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                  </Text>
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4, marginTop: 6 }}>
                  {isAdmin ? (
                    <>
                      <Button icon="pencil" compact mode="text" onPress={() => openEdit(d)} textColor="#1677ff">{t('mobile.edit')}</Button>
                      <Button icon="delete" compact mode="text" onPress={() => setConfirmId(d.id_depense)} textColor="#ff4d4f">{t('mobile.delete')}</Button>
                    </>
                  ) : (
                    <>
                      <Button icon="pencil" compact mode="text" onPress={() => openDemande('modification', d)} textColor="#1677ff">{t('mobile.edit')}</Button>
                      <Button icon="delete" compact mode="text" onPress={() => openDemande('suppression', d)} textColor="#ff4d4f">{t('mobile.delete')}</Button>
                    </>
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <FAB icon="plus" style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' }} onPress={openCreate} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? t('depenses.modal_edit') : t('depenses.modal_create')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              <TextInput label={t('depenses.form_title')} value={form.titre} onChangeText={v => setForm(f => ({ ...f, titre: v }))} maxLength={120} style={{ marginBottom: 12 }} />
              <DatePickerInput label={t('travaux.col_date')} value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />
              <TextInput label={t('depenses.form_quantity')} value={form.quantite} onChangeText={v => setForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
              <TextInput label={t('depenses.form_unit_cost', { currency: currencySymbol })} value={form.cout_unitaire} onChangeText={v => setForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('mobile.cancel')}</Button>
            <Button onPress={save} loading={saving}>{t('mobile.save')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!demandeItem} onDismiss={() => setDemandeItem(null)}>
          <Dialog.Title>{demandeAction === 'suppression' ? t('demandes.action_delete') : t('demandes.action_modify')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              <TextInput label={t('mobile.demand_reason_required')} value={demandeMotif} onChangeText={setDemandeMotif} multiline maxLength={200} style={{ marginBottom: 12 }} />
              {demandeAction === 'modification' && (
                <>
                  <TextInput label={t('depenses.form_title')} value={demandeForm.titre} onChangeText={v => setDemandeForm(f => ({ ...f, titre: v }))} maxLength={120} style={{ marginBottom: 12 }} />
                  <DatePickerInput label={t('travaux.col_date')} value={demandeForm.date} onChange={v => setDemandeForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />
                  <TextInput label={t('depenses.form_quantity')} value={demandeForm.quantite} onChangeText={v => setDemandeForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                  <TextInput label={t('depenses.form_unit_cost', { currency: currencySymbol })} value={demandeForm.cout_unitaire} onChangeText={v => setDemandeForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" />
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeItem(null)}>{t('mobile.cancel')}</Button>
            <Button onPress={envoyerDemande} loading={savingDemande}>{t('mobile.send')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog visible={!!confirmId} title={t('mobile.delete')} message={t('mobile.confirm_delete')} onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel={t('mobile.delete')} />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={4000}>{snack}</Snackbar>
    </View>
  );
}
