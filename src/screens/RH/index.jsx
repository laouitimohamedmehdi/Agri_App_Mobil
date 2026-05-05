import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import client from '../../api/client';

export default function RH({ navigation }) {
  const { employes, refreshEmployes } = useData();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', poste: '', type_salaire: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  const openCreate = () => { setEditing(null); setForm({ nom: '', prenom: '', poste: '', type_salaire: '' }); setDialogVisible(true); };
  const openEdit = (e) => { setEditing(e); setForm({ nom: e.nom, prenom: e.prenom ?? '', poste: e.poste ?? '', type_salaire: e.type_salaire ?? '' }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, prenom: form.prenom, poste: form.poste, type_salaire: form.type_salaire };
      if (editing) await client.put(`/rh/employes/${editing.id}`, payload);
      else await client.post('/rh/employes/', payload);
      await refreshEmployes(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/rh/employes/${confirmId}`); await refreshEmployes(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Gestion RH" navigation={navigation} />
      {employes.length === 0 ? <EmptyState message="Aucun employé enregistré" /> : (
        <ScrollView style={{ backgroundColor: '#f5f5f5' }}>
          {employes.map(e => (
            <List.Item key={e.id}
              title={`${e.nom} ${e.prenom ?? ''}`}
              description={`${e.poste ?? '-'} — ${e.type_salaire ?? '-'}`}
              left={props => <List.Icon {...props} icon="account" />}
              right={() => (
                <View style={{ flexDirection: 'row' }}>
                  <Button icon="pencil" compact onPress={() => openEdit(e)} />
                  <Button icon="delete" compact onPress={() => setConfirmId(e.id)} />
                </View>
              )} />
          ))}
        </ScrollView>
      )}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un employé</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Prénom" value={form.prenom} onChangeText={v => setForm(f => ({ ...f, prenom: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Poste" value={form.poste} onChangeText={v => setForm(f => ({ ...f, poste: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Type de salaire" value={form.type_salaire} onChangeText={v => setForm(f => ({ ...f, type_salaire: v }))} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Confirmer" message="Supprimer cet employé effacera son lien dans les feuilles de présence (l'historique est conservé)." onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
