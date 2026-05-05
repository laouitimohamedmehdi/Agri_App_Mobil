import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function Recoltes({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [recoltes, setRecoltes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ campagne: '', quantite_kg: '', secteur_id: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchRecoltes(); }, []);

  const fetchRecoltes = async () => {
    try { const res = await client.get('/recoltes/'); setRecoltes(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ campagne: '', quantite_kg: '', secteur_id: '' }); setDialogVisible(true); };
  const openEdit = (r) => { setEditing(r); setForm({ campagne: r.campagne, quantite_kg: String(r.quantite_kg ?? ''), secteur_id: String(r.secteur_id ?? '') }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { campagne: form.campagne, quantite_kg: parseFloat(form.quantite_kg) || 0, secteur_id: parseInt(form.secteur_id) || null };
      if (editing) await client.put(`/recoltes/${editing.id}`, payload);
      else await client.post('/recoltes/', payload);
      await fetchRecoltes(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/recoltes/${confirmId}`); await fetchRecoltes(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  if (loading) return <LoadingOverlay />;

  const byCampagne = recoltes.reduce((acc, r) => {
    const key = r.campagne ?? 'Sans campagne';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Récoltes" navigation={navigation} />
      {recoltes.length === 0 ? <EmptyState message="Aucune récolte enregistrée" /> : (
        <ScrollView style={{ backgroundColor: '#f5f5f5' }}>
          {Object.entries(byCampagne).map(([campagne, items]) => (
            <List.Section key={campagne}>
              <List.Subheader>{campagne}</List.Subheader>
              {items.map(r => (
                <List.Item key={r.id} title={`${r.quantite_kg ?? 0} kg`} description={`Secteur ID: ${r.secteur_id ?? '-'}`}
                  left={props => <List.Icon {...props} icon="basket" />}
                  right={() => isAdmin ? <View style={{ flexDirection: 'row' }}><Button icon="pencil" compact onPress={() => openEdit(r)} /><Button icon="delete" compact onPress={() => setConfirmId(r.id)} /></View> : null} />
              ))}
            </List.Section>
          ))}
        </ScrollView>
      )}
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} une récolte</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Campagne" value={form.campagne} onChangeText={v => setForm(f => ({ ...f, campagne: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Quantité (kg)" value={form.quantite_kg} onChangeText={v => setForm(f => ({ ...f, quantite_kg: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="ID Secteur" value={form.secteur_id} onChangeText={v => setForm(f => ({ ...f, secteur_id: v }))} keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Confirmer" message="Supprimer cette récolte supprimera aussi ses charges et analyses associées." onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
