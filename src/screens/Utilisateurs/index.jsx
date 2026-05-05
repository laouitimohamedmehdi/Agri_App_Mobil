import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Switch, Text, Snackbar } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

export default function Utilisateurs({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', role: 'user', actif: true });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await client.get('/users/'); setUsers(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ email: '', password: '', role: 'user', actif: true }); setDialogVisible(true); };
  const openEdit = (u) => { setEditing(u); setForm({ email: u.email, password: '', role: u.role, actif: u.actif }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { email: form.email, role: form.role, actif: form.actif };
      if (form.password) payload.password = form.password;
      if (editing) await client.put(`/users/${editing.id}`, payload);
      else await client.post('/users/', { ...payload, password: form.password });
      await fetchUsers(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
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
      {users.length === 0 ? <EmptyState message="Aucun utilisateur" /> : (
        <ScrollView horizontal>
          <DataTable style={{ minWidth: 480 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Email</DataTable.Title>
              <DataTable.Title>Rôle</DataTable.Title>
              <DataTable.Title>Actif</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>
            {users.map(u => (
              <DataTable.Row key={u.id}>
                <DataTable.Cell style={{ flex: 2 }}>{u.email}</DataTable.Cell>
                <DataTable.Cell>{u.role}</DataTable.Cell>
                <DataTable.Cell>
                  <Switch value={u.actif} onValueChange={async (v) => {
                    try { await client.put(`/users/${u.id}`, { actif: v }); await fetchUsers(); }
                    catch { setSnack('Erreur'); }
                  }} />
                </DataTable.Cell>
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
            <TextInput label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} secureTextEntry style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Rôle admin</Text>
              <Switch value={form.role === 'admin'} onValueChange={v => setForm(f => ({ ...f, role: v ? 'admin' : 'user' }))} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text>Compte actif</Text>
              <Switch value={form.actif} onValueChange={v => setForm(f => ({ ...f, actif: v }))} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Confirmer" message="Supprimer cet utilisateur supprimera aussi ses demandes et notifications." onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
