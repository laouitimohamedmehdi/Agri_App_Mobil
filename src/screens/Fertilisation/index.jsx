import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function Fertilisation({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ produit: '', quantite: '', cout: '', date_application: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const res = await client.get('/fertilisation/'); setItems(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ produit: '', quantite: '', cout: '', date_application: '' }); setDialogVisible(true); };
  const openEdit = (item) => { setEditing(item); setForm({ produit: item.produit, quantite: String(item.quantite ?? ''), cout: String(item.cout ?? ''), date_application: item.date_application ?? '' }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { produit: form.produit, quantite: parseFloat(form.quantite) || 0, cout: parseFloat(form.cout) || 0, date_application: form.date_application };
      if (editing) await client.put(`/fertilisation/${editing.id}`, payload);
      else await client.post('/fertilisation/', payload);
      await fetchData(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/fertilisation/${confirmId}`); await fetchData(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Fertilisation" navigation={navigation} />
      {items.length === 0 ? <EmptyState message="Aucune fertilisation enregistrée" /> : (
        <ScrollView horizontal>
          <DataTable style={{ minWidth: 500 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Produit</DataTable.Title>
              <DataTable.Title numeric>Qté</DataTable.Title>
              <DataTable.Title numeric>Coût</DataTable.Title>
              <DataTable.Title>Date</DataTable.Title>
              {isAdmin && <DataTable.Title>Actions</DataTable.Title>}
            </DataTable.Header>
            {items.map(item => (
              <DataTable.Row key={item.id}>
                <DataTable.Cell style={{ flex: 2 }}>{item.produit}</DataTable.Cell>
                <DataTable.Cell numeric>{item.quantite}</DataTable.Cell>
                <DataTable.Cell numeric>{item.cout} DH</DataTable.Cell>
                <DataTable.Cell>{item.date_application}</DataTable.Cell>
                {isAdmin && <DataTable.Cell><Button icon="pencil" compact onPress={() => openEdit(item)} /><Button icon="delete" compact onPress={() => setConfirmId(item.id)} /></DataTable.Cell>}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} fertilisation</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Produit" value={form.produit} onChangeText={v => setForm(f => ({ ...f, produit: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Quantité" value={form.quantite} onChangeText={v => setForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Coût (DH)" value={form.cout} onChangeText={v => setForm(f => ({ ...f, cout: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Date (YYYY-MM-DD)" value={form.date_application} onChangeText={v => setForm(f => ({ ...f, date_application: v }))} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Confirmer" message="Supprimer cet enregistrement ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
