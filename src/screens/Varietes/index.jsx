import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';

export default function Varietes({ navigation }) {
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

  const openCreate = () => { setEditing(null); setForm({ nom: '' }); setDialogVisible(true); };
  const openEdit = (v) => { setEditing(v); setForm({ nom: v.nom }); setDialogVisible(true); };

  const save = async () => {
    if (!form.nom.trim()) { setSnack('Le nom est requis'); return; }
    setSaving(true);
    try {
      if (editing) await client.put(`/varietes/${editing.id_variete}`, { nom: form.nom });
      else await client.post('/varietes/', { nom: form.nom });
      await refreshVarietes();
      setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/varietes/${confirmId}`); await refreshVarietes(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'variete', entity_id: demandeId, motif });
      setSnack('Demande envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeId(null); setMotif('');
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Variétés" navigation={navigation} />
      {varietes.length === 0 ? <EmptyState message="Aucune variété enregistrée" /> : (
        <ScrollView>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Nom</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>
            {varietes.map(v => (
              <DataTable.Row key={v.id_variete}>
                <DataTable.Cell style={{ flex: 2 }}>{v.nom}</DataTable.Cell>
                <DataTable.Cell>
                  {isAdmin ? (
                    <View style={{ flexDirection: 'row' }}>
                      <Button icon="pencil" compact onPress={() => openEdit(v)} />
                      <Button icon="delete" compact onPress={() => setConfirmId(v.id_variete)} />
                    </View>
                  ) : (
                    <Button compact icon="file-send" onPress={() => { setDemandeId(v.id_variete); setMotif(''); }}>
                      Demander suppr.
                    </Button>
                  )}
                </DataTable.Cell>
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
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeId} onDismiss={() => setDemandeId(null)}>
          <Dialog.Title>Demander la suppression</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Motif" value={motif} onChangeText={setMotif} multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeId(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeSuppr}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cette variété ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
