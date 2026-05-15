import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Switch, Text, Chip, Snackbar, SegmentedButtons, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SelectFilter from '../../components/SelectFilter';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import client from '../../api/client';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { I18nManager } from 'react-native';

const SCREEN_H = Dimensions.get('window').height;
const ROLE_COLOR = { admin: '#722ed1', user: '#1677ff' };
const ROLE_BG    = { admin: '#f9f0ff', user: '#e6f4ff' };

const CURRENCY_OPTIONS = [
  { value: 'dinar',  label: 'Dinar (دت)' },
  { value: 'euro',   label: 'Euro (€)' },
  { value: 'dollar', label: 'Dollar ($)' },
];

export default function Parametres({ navigation }) {
  const { currency, currencySymbol, updateCurrency } = useSettings();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const LANG_OPTIONS = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
  ];

  const handleLanguageChange = async (lang) => {
    await changeLanguage(lang);
    if (lang === 'ar') I18nManager.forceRTL(true);
    else I18nManager.forceRTL(false);
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('tous');
  const [filterActif, setFilterActif] = useState('tous');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', nom: '', password: '', role: 'user', is_active: true });
  const [saving, setSaving] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await client.get('/users/'); setUsers(res.data); }
    catch { setSnack(t('mobile.error_load')); }
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
    } catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
        setDialogVisible(false);
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setSaving(false); }
  };

  const handleCurrencyChange = async (value) => {
    setSavingCurrency(true);
    try { await updateCurrency(value); setSnack(`Devise mise à jour : ${value}`); }
    catch { setSnack(t('mobile.error_save')); }
    finally { setSavingCurrency(false); }
  };

  const toggleActif = async (u) => {
    try { await client.put(`/users/${u.id}`, { is_active: !u.is_active }); await fetchUsers(); }
    catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack('Erreur');
      }
    }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/users/${confirmId}`); await fetchUsers(); }
    catch { setSnack(t('mobile.error_delete')); }
    setConfirmId(null);
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={styles.screen}>
      <AppHeader title={t('menu.settings')} navigation={navigation} />
      {/* Section Langue */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="translate" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('mobile.language')}</Text>
      </View>
      <Card style={{ marginHorizontal: 12, marginBottom: 8, elevation: 1 }}>
        <Card.Content>
          <SelectFilter
            noAll
            label={t('mobile.language')}
            value={currentLang}
            onChange={handleLanguageChange}
            options={LANG_OPTIONS}
          />
        </Card.Content>
      </Card>
      {/* Devise — fixe */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="currency-usd" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('parametres.title_general')}</Text>
      </View>
      <Card style={{ marginHorizontal: 12, marginBottom: 8, elevation: 1 }}>
        <Card.Content>
          <Text variant="bodyMedium" style={{ marginBottom: 8, color: '#555' }}>{t('parametres.currency_label')}</Text>
          <SelectFilter noAll label={t('parametres.currency_label')} value={currency} onChange={handleCurrencyChange} options={CURRENCY_OPTIONS} />
          <Text variant="bodySmall" style={{ color: '#888', marginTop: 6 }}>
            Symbole actuel : <Text style={{ fontWeight: 'bold', color: '#2d7a4a' }}>{currencySymbol}</Text>
          </Text>
        </Card.Content>
      </Card>

      {/* Filtres utilisateurs — fixes */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="account-group" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="titleSmall" style={styles.sectionTitle}>{t('parametres.title_users')}</Text>
      </View>
      <View style={styles.filtersBox}>
        <SegmentedButtons value={filterRole} onValueChange={setFilterRole} style={{ marginBottom: 8 }}
          buttons={[{ value: 'tous', label: t('mobile.all') }, { value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }]} />
        <SegmentedButtons value={filterActif} onValueChange={setFilterActif}
          buttons={[{ value: 'tous', label: t('mobile.all') }, { value: 'actif', label: t('mobile.active') }, { value: 'inactif', label: t('mobile.inactive') }]} />
      </View>

      {/* Liste scrollable */}
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
        {filtered.length === 0 ? <EmptyState message={t('parametres.msg_error')} /> : (
          filtered.map((u, i) => (
            <Card key={u.id} style={[styles.userCard, i > 0 && { marginTop: 8 }]}>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: ROLE_BG[u.role] }]}>
                  <MaterialCommunityIcons name={u.role === 'admin' ? 'shield-account' : 'account'} size={24} color={ROLE_COLOR[u.role]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{u.nom}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>{u.email}</Text>
                  <Chip style={{ marginTop: 4, alignSelf: 'flex-start', backgroundColor: ROLE_BG[u.role] }}
                    textStyle={{ color: ROLE_COLOR[u.role], fontSize: 10 }}>{u.role}</Chip>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Switch value={u.is_active} onValueChange={() => toggleActif(u)} color="#2d7a4a" />
                  <Text variant="bodySmall" style={{ color: u.is_active ? '#52c41a' : '#aaa', fontSize: 10 }}>
                    {u.is_active ? t('mobile.active') : t('mobile.inactive')}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Button icon="pencil" compact onPress={() => openEdit(u)} textColor="#1677ff">{t('mobile.edit')}</Button>
                <Button icon="delete" compact onPress={() => setConfirmId(u.id)} textColor="#ff4d4f">{t('mobile.delete')}</Button>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB icon="plus" style={styles.fab} onPress={openCreate} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? t('parametres.modal_edit') : t('parametres.modal_create')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              <TextInput label={t('auth.email')} value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" maxLength={50} style={{ marginBottom: 8 }} />
              <TextInput label={t('mobile.name')} value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} maxLength={20} style={{ marginBottom: 8 }} />
              <TextInput label={editing ? t('parametres.form_password_edit') : t('auth.password')} value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} secureTextEntry maxLength={50} style={{ marginBottom: 8 }} />
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t('parametres.form_role')}</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label={t('parametres.form_role')} value={form.role}
                  onChange={v => setForm(f => ({ ...f, role: v }))}
                  options={[{ value: 'user', label: 'Utilisateur' }, { value: 'admin', label: 'Administrateur' }]} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>{t('mobile.active')}</Text>
                <Switch value={form.is_active} onValueChange={v => setForm(f => ({ ...f, is_active: v }))} color="#2d7a4a" />
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>{t('mobile.cancel')}</Button>
            <Button onPress={save} loading={saving}>{t('mobile.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog visible={!!confirmId} title={t('mobile.delete')} message={t('mobile.confirm_delete')} onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel={t('mobile.delete')} />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, padding: 12 },
  filtersBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  userCard: { elevation: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
