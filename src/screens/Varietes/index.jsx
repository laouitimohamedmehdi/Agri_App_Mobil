import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Snackbar, Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';

export default function Varietes({ navigation }) {
  const { t } = useTranslation();
  const { varietes, refreshVarietes } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [demandeId, setDemandeId] = useState(null);
  const [motif, setMotif] = useState('');
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshVarietes();
    setRefreshing(false);
  };

  const openCreate = () => { setEditing(null); setForm({ nom: '' }); setDialogVisible(true); };
  const openEdit = (v) => { setEditing(v); setForm({ nom: v.nom }); setDialogVisible(true); };

  const save = async () => {
    if (!form.nom.trim()) { setSnack(t('mobile.error_save')); return; }
    setSaving(true);
    try {
      if (editing) await client.put(`/varietes/${editing.id_variete}`, { nom: form.nom });
      else await client.post('/varietes/', { nom: form.nom });
      await refreshVarietes(); setDialogVisible(false);
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
    try { await client.delete(`/varietes/${confirmId}`); await refreshVarietes(); }
    catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack(t('mobile.error_delete'));
      }
    }
    setConfirmId(null);
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'variete', entity_id: demandeId, motif });
      setSnack(t('mobile.request_sent'));
    } catch { setSnack(t('mobile.error_save')); }
    setDemandeId(null); setMotif('');
  };

  return (
    <View style={styles.screen}>
      <AppHeader title={t('varietes.title')} navigation={navigation} />
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="leaf" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
          <Text variant="titleSmall" style={styles.sectionTitle}>{t('varietes.title')} ({varietes.length})</Text>
        </View>
        {varietes.length === 0 ? <EmptyState message={t('mobile.no_variety')} /> : (
          <Card style={{ elevation: 2, overflow: 'hidden' }}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>{t('varietes.col_name', 'Nom de la variété')}</Text>
              <Text style={[styles.th, { width: 120 }]}>{t('common.actions')}</Text>
            </View>
            {/* Rows */}
            {varietes.map((v, i) => (
              <View key={v.id_variete} style={[styles.tableRow, i % 2 !== 0 && styles.tableRowAlt]}>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.dot} />
                  <Text style={styles.td}>{v.nom}</Text>
                </View>
                <View style={{ width: 120, flexDirection: 'row' }}>
                  <Button icon="pencil" compact onPress={() => openEdit(v)} textColor="#1677ff" />
                  {isAdmin ? (
                    <Button icon="delete" compact onPress={() => setConfirmId(v.id_variete)} textColor="#ff4d4f" />
                  ) : (
                    <Button icon="delete" compact onPress={() => { setDemandeId(v.id_variete); setMotif(''); }} textColor="#ff4d4f" />
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? t('varietes.modal_edit') : t('varietes.modal_create')}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t('mobile.name')} value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} maxLength={20} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('mobile.cancel')}</Button>
            <Button onPress={save} loading={saving}>{t('mobile.save')}</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeId} onDismiss={() => setDemandeId(null)}>
          <Dialog.Title>{t('demandes.action_delete')}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t('mobile.demand_reason_required')} value={motif} onChangeText={setMotif} multiline maxLength={200} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeId(null)}>{t('mobile.cancel')}</Button>
            <Button onPress={envoyerDemandeSuppr}>{t('mobile.send')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title={t('mobile.delete')} message={t('mobile.confirm_delete')} onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel={t('mobile.delete')} />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, padding: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8f5e9', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: '#2d7a4a' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e0ece0' },
  tableRowAlt: { backgroundColor: '#f0f7f0' },
  th: { fontSize: 12, fontWeight: 'bold', color: '#2d7a4a' },
  td: { fontSize: 12, color: '#333' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2d7a4a' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
