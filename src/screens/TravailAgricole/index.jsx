import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Chip, Text, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUTS = ['planifie', 'en_cours', 'termine'];
const STATUT_COLORS = { planifie: '#1976d2', en_cours: '#f57c00', termine: '#388e3c' };

export default function TravailAgricole({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [travaux, setTravaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ description: '', statut: 'planifie', cout: '', nb_jours: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchTravaux(); }, []);

  const fetchTravaux = async () => {
    try { const res = await client.get('/travaux/'); setTravaux(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ description: '', statut: 'planifie', cout: '', nb_jours: '' }); setDialogVisible(true); };
  const openEdit = (t) => { setEditing(t); setForm({ description: t.description, statut: t.statut, cout: String(t.cout ?? ''), nb_jours: String(t.nb_jours ?? '') }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { description: form.description, statut: form.statut, cout: parseFloat(form.cout) || 0, nb_jours: parseInt(form.nb_jours) || 0 };
      if (editing) await client.put(`/travaux/${editing.id}`, payload);
      else await client.post('/travaux/', payload);
      await fetchTravaux();
      setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/travaux/${confirmId}`); await fetchTravaux(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Travaux Agricoles" navigation={navigation} />
      {travaux.length === 0 ? <EmptyState message="Aucun travail enregistré" /> : (
        <ScrollView horizontal>
          <DataTable style={{ minWidth: 600 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 3 }}>Description</DataTable.Title>
              <DataTable.Title>Statut</DataTable.Title>
              <DataTable.Title numeric>Coût</DataTable.Title>
              {isAdmin && <DataTable.Title>Actions</DataTable.Title>}
            </DataTable.Header>
            {travaux.map(t => (
              <DataTable.Row key={t.id}>
                <DataTable.Cell style={{ flex: 3 }}>{t.description}</DataTable.Cell>
                <DataTable.Cell><Chip compact textStyle={{ fontSize: 10 }} style={{ backgroundColor: STATUT_COLORS[t.statut] + '22' }}>{t.statut}</Chip></DataTable.Cell>
                <DataTable.Cell numeric>{t.cout ?? 0} DH</DataTable.Cell>
                {isAdmin && <DataTable.Cell><Button icon="pencil" compact onPress={() => openEdit(t)} /><Button icon="delete" compact onPress={() => setConfirmId(t.id)} /></DataTable.Cell>}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un travail</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Coût (DH)" value={form.cout} onChangeText={v => setForm(f => ({ ...f, cout: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Nombre de jours" value={form.nb_jours} onChangeText={v => setForm(f => ({ ...f, nb_jours: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Statut</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {STATUTS.map(s => <Chip key={s} selected={form.statut === s} onPress={() => setForm(f => ({ ...f, statut: s }))}>{s}</Chip>)}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Confirmer" message="Supprimer ce travail supprimera aussi les demandes associées." onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
