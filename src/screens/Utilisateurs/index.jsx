import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Switch, Text, Chip, Snackbar, SegmentedButtons } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

export default function Utilisateurs({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('tous');
  const [filterActif, setFilterActif] = useState('tous');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', nom: '', password: '', role: 'user', is_active: true });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await client.get('/users/'); setUsers(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const filtered = users.filter(u => {
    if (filterRole !== 'tous' && u.role !== filterRole) return false;
    if (filterActif === 'actif' && !u.is_active) return false;
    if (filterActif === 'inactif' && u.is_active) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm({ email: '', nom: '', password: '', role: 'user', is_active: true }); setDialogVisible(true); };
  const openEdit = (u) => { setEditing(u); setForm({ email: u.email, nom: u.nom, password: '', role: u.role, is_active: u.is_active }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { email: form.email, nom: form.nom, role: form.role, is_active: form.is_active };
      if (form.password) payload.password = form.password;
      if (editing) await client.put(`/users/${editing.id}`, payload);
      else await client.post('/users/', { ...payload, password: form.password });
      await fetchUsers(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const toggleActif = async (u) => {
    try { await client.put(`/users/${u.id}`, { is_active: !u.is_active }); await fetchUsers(); }
    catch { setSnack('Erreur'); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/users/${confirmId}`); await fetchUsers(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Utilisateurs" navigation={navigation} />
      <View style={styles.filters}>
        <SegmentedButtons
          value={filterRole}
          onValueChange={setFilterRole}
          buttons={[{ value: 'tous', label: 'Tous' }, { value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]}
          style={{ marginBottom: 8 }}
        />
        <SegmentedButtons
          value={filterActif}
          onValueChange={setFilterActif}
          buttons={[{ value: 'tous', label: 'Tous' }, { value: 'actif', label: 'Actifs' }, { value: 'inactif', label: 'Inactifs' }]}
        />
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucun utilisateur" /> : (
        <ScrollView horizontal>
          <DataTable style={{ minWidth: 500 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Email</DataTable.Title>
              <DataTable.Title>Nom</DataTable.Title>
              <DataTable.Title>Rôle</DataTable.Title>
              <DataTable.Title>Actif</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>
            {filtered.map(u => (
              <DataTable.Row key={u.id}>
                <DataTable.Cell style={{ flex: 2 }}>{u.email}</DataTable.Cell>
                <DataTable.Cell>{u.nom}</DataTable.Cell>
                <DataTable.Cell><Chip compact>{u.role}</Chip></DataTable.Cell>
                <DataTable.Cell><Switch value={u.is_active} onValueChange={() => toggleActif(u)} /></DataTable.Cell>
                <DataTable.Cell>
                  <Button icon="pencil" compact onPress={() => openEdit(u)} />
                  <Button icon="delete" compact onPress={() => setConfirmId(u.id)} />
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un utilisateur</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" style={{ marginBottom: 8 }} />
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
            <TextInput label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} secureTextEntry style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Rôle admin</Text>
              <Switch value={form.role === 'admin'} onValueChange={v => setForm(f => ({ ...f, role: v ? 'admin' : 'user' }))} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text>Compte actif</Text>
              <Switch value={form.is_active} onValueChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cet utilisateur ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  filters: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
