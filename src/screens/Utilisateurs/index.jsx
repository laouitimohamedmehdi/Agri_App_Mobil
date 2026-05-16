import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
const SCREEN_H = Dimensions.get('window').height;
import { FAB, Portal, Dialog, TextInput, Button, Switch, Text, Chip, Snackbar, SegmentedButtons, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SelectFilter from '../../components/SelectFilter';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';

const ROLE_COLOR = { admin: '#722ed1', user: '#1677ff' };
const ROLE_BG    = { admin: '#f9f0ff', user: '#e6f4ff' };

export default function Utilisateurs({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
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

  useEffect(() => {
    const controller = new AbortController();
    client.get('/users/', { signal: controller.signal })
      .then(res => setUsers(res.data))
      .catch(e => { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError' && e?.name !== 'CanceledError') setSnack(t('mobile.error_load')); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

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
    <View style={styles.screen}>
      <AppHeader title="Utilisateurs" navigation={navigation} />
      <ScrollView style={styles.container}>
        <View style={styles.filtersBox}>
          <SegmentedButtons value={filterRole} onValueChange={setFilterRole} style={{ marginBottom: 8 }}
            buttons={[{ value: 'tous', label: 'Tous' }, { value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]} />
          <SegmentedButtons value={filterActif} onValueChange={setFilterActif}
            buttons={[{ value: 'tous', label: 'Tous' }, { value: 'actif', label: 'Actifs' }, { value: 'inactif', label: 'Inactifs' }]} />
        </View>

        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="account-group" size={18} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
          <Text variant="titleSmall" style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{filtered.length} utilisateur(s)</Text>
        </View>

        {filtered.length === 0 ? <EmptyState message="Aucun utilisateur" /> : (
          filtered.map((u, i) => (
            <Card key={u.id} style={[styles.userCard, i > 0 && { marginTop: 8 }]}>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: ROLE_BG[u.role] }]}>
                  <MaterialCommunityIcons name={u.role === 'admin' ? 'shield-account' : 'account'} size={24} color={ROLE_COLOR[u.role]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{u.nom}</Text>
                  <Text variant="bodySmall" style={{ color: '#888', textAlign: isRTL ? 'right' : 'left' }}>{u.email}</Text>
                  <Chip style={{ marginTop: 4, alignSelf: isRTL ? 'flex-end' : 'flex-start', backgroundColor: ROLE_BG[u.role] }}
                    textStyle={{ color: ROLE_COLOR[u.role], fontSize: 10 }}>{u.role}</Chip>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Switch value={u.is_active} onValueChange={() => toggleActif(u)} color="#2d7a4a" />
                  <Text variant="bodySmall" style={{ color: u.is_active ? '#52c41a' : '#aaa', fontSize: 10, textAlign: isRTL ? 'right' : 'left' }}>
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
              </View>
              <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Button icon="pencil" compact onPress={() => openEdit(u)} textColor="#1677ff">Modifier</Button>
                <Button icon="delete" compact onPress={() => setConfirmId(u.id)} textColor="#ff4d4f">Supprimer</Button>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un utilisateur</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
            <TextInput label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" maxLength={50} style={{ marginBottom: 8 }} />
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} maxLength={20} style={{ marginBottom: 8 }} />
            <TextInput label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} secureTextEntry maxLength={50} style={{ marginBottom: 8 }} />
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Rôle</Text>
            <View style={{ marginBottom: 12 }}>
              <SelectFilter noAll
                label="Choisir un rôle"
                value={form.role}
                onChange={v => setForm(f => ({ ...f, role: v }))}
                options={[
                  { value: 'user', label: 'Utilisateur' },
                  { value: 'admin', label: 'Administrateur' },
                ]}
              />
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ textAlign: isRTL ? 'right' : 'left' }}>Compte actif</Text>
              <Switch value={form.is_active} onValueChange={v => setForm(f => ({ ...f, is_active: v }))} color="#2d7a4a" />
            </View>
            </ScrollView>
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
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, padding: 12 },
  filtersBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  userCard: { elevation: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
