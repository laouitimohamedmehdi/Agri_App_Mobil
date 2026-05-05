import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';

export default function Varietes({ navigation }) {
  const { varietes, refreshVarietes } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', origine: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  const openCreate = () => { setEditing(null); setForm({ nom: '', origine: '' }); setDialogVisible(true); };
  const openEdit = (v) => { setEditing(v); setForm({ nom: v.nom, origine: v.origine ?? '' }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, origine: form.origine };
      if (editing) await client.put(`/varietes/${editing.id}`, payload);
      else await client.post('/varietes/', payload);
      await refreshVarietes(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/varietes/${confirmId}`); await refreshVarietes(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Variétés" navigation={navigation} />
      {varietes.length === 0 ? <EmptyState message="Aucune variété enregistrée" /> : (
        <ScrollView>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Nom</DataTable.Title>
              <DataTable.Title>Origine</DataTable.Title>
              {isAdmin && <DataTable.Title>Actions</DataTable.Title>}
            </DataTable.Header>
            {varietes.map(v => (
              <DataTable.Row key={v.id}>
                <DataTable.Cell style={{ flex: 2 }}>{v.nom}</DataTable.Cell>
                <DataTable.Cell>{v.origine ?? '-'}</DataTable.Cell>
                {isAdmin && <DataTable.Cell><Button icon="pencil" compact onPress={() => openEdit(v)} /><Button icon="delete" compact onPress={() => setConfirmId(v.id)} /></DataTable.Cell>}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} une variété</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Origine" value={form.origine} onChangeText={v => setForm(f => ({ ...f, origine: v }))} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Confirmer" message="Supprimer cette variété ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
