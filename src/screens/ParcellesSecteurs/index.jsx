import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Text, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';

export default function ParcellesSecteurs({ navigation }) {
  const { secteurs, parcelles, refreshSecteurs, refreshParcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogType, setDialogType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', surface: '', secteur_id: '' });
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [confirmType, setConfirmType] = useState(null);

  const openCreate = (type) => { setEditing(null); setForm({ nom: '', surface: '', secteur_id: '' }); setDialogType(type); };
  const openEdit = (type, item) => { setEditing(item); setForm({ nom: item.nom, surface: String(item.surface ?? ''), secteur_id: String(item.secteur_id ?? '') }); setDialogType(type); };

  const save = async () => {
    setLoading(true);
    try {
      if (dialogType === 'secteur') {
        const payload = { nom: form.nom };
        if (editing) await client.put(`/secteurs/${editing.id}`, payload);
        else await client.post('/secteurs/', payload);
        await refreshSecteurs();
      } else {
        const payload = { nom: form.nom, surface: parseFloat(form.surface), secteur_id: parseInt(form.secteur_id) };
        if (editing) await client.put(`/parcelles/${editing.id}`, payload);
        else await client.post('/parcelles/', payload);
        await refreshParcelles();
      }
      setDialogType(null);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    try {
      if (confirmType === 'secteur') { await client.delete(`/secteurs/${confirmId}`); await refreshSecteurs(); }
      else { await client.delete(`/parcelles/${confirmId}`); await refreshParcelles(); }
    } catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  const parcellesOf = (secteurId) => parcelles.filter(p => p.secteur_id === secteurId);

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Parcelles & Secteurs" navigation={navigation} />
      <ScrollView style={styles.container}>
        {secteurs.length === 0 ? <EmptyState message="Aucun secteur enregistré" /> : null}
        {secteurs.map(s => (
          <List.Accordion key={s.id} title={s.nom} left={props => <List.Icon {...props} icon="map" />}>
            {isAdmin && <List.Item title="Modifier secteur" left={props => <List.Icon {...props} icon="pencil" />} onPress={() => openEdit('secteur', s)} />}
            {isAdmin && (
              <List.Item
                title="Supprimer secteur"
                left={props => <List.Icon {...props} icon="delete" />}
                onPress={() => { setConfirmType('secteur'); setConfirmId(s.id); }}
                titleStyle={{ color: '#d32f2f' }}
              />
            )}
            {parcellesOf(s.id).map(p => (
              <List.Item key={p.id} title={p.nom} description={`Surface : ${p.surface} ha`} left={props => <List.Icon {...props} icon="land-fields" />}
                right={() => isAdmin ? (
                  <View style={{ flexDirection: 'row' }}>
                    <Button icon="pencil" compact onPress={() => openEdit('parcelle', p)} />
                    <Button icon="delete" compact onPress={() => { setConfirmType('parcelle'); setConfirmId(p.id); }} />
                  </View>
                ) : null} />
            ))}
            {isAdmin && <List.Item title="Ajouter une parcelle" left={props => <List.Icon {...props} icon="plus" />}
              onPress={() => { setForm({ nom: '', surface: '', secteur_id: String(s.id) }); setEditing(null); setDialogType('parcelle'); }} />}
          </List.Accordion>
        ))}
      </ScrollView>
      {isAdmin && <FAB icon="plus" label="Secteur" style={styles.fab} onPress={() => openCreate('secteur')} />}
      <Portal>
        <Dialog visible={!!dialogType} onDismiss={() => setDialogType(null)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} {dialogType}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
            {dialogType === 'parcelle' && <TextInput label="Surface (ha)" value={form.surface} onChangeText={v => setForm(f => ({ ...f, surface: v }))} keyboardType="numeric" />}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogType(null)}>Annuler</Button>
            <Button onPress={save} loading={loading}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog
        visible={!!confirmId}
        title="Confirmer la suppression"
        message={
          confirmType === 'parcelle'
            ? "Supprimer cette parcelle supprimera aussi tous ses secteurs, travaux, récoltes et fertilisations associés."
            : "Supprimer ce secteur supprimera aussi tous ses travaux, récoltes et fertilisations associés."
        }
        onConfirm={confirmDelete}
        onDismiss={() => setConfirmId(null)}
        confirmLabel="Supprimer"
      />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
