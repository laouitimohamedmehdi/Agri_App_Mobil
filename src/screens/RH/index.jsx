import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Switch, Text, Snackbar, SegmentedButtons, Chip, Card, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import SelectFilter from '../../components/SelectFilter';
import { useData } from '../../contexts/DataContext';
import client from '../../api/client';

const SALAIRE_CONFIG = {
  journalier: { color: '#fa8c16', bg: '#fff7e6', icon: 'calendar-today' },
  fixe:       { color: '#1677ff', bg: '#e6f4ff', icon: 'currency-usd'  },
};

export default function RH({ navigation }) {
  const { employes, refreshEmployes } = useData();
  const [tab, setTab] = useState('employes');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', poste: '', telephone: '', type_contrat: 'CDI', date_embauche: '', is_active: true, type_salaire: 'journalier', tarif_journalier: '', salaire_fixe: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPoste, setFilterPoste] = useState('');

  const postes = [...new Set(employes.map(e => e.poste).filter(Boolean))];
  const employesFiltres = employes.filter(e => {
    if (filterNom && !`${e.nom} ${e.prenom ?? ''}`.toLowerCase().includes(filterNom.toLowerCase())) return false;
    if (filterStatut === 'actif' && !e.is_active) return false;
    if (filterStatut === 'inactif' && e.is_active) return false;
    if (filterPoste && e.poste !== filterPoste) return false;
    return true;
  });

  const openCreate = () => { setEditing(null); setForm({ nom: '', prenom: '', poste: '', telephone: '', type_contrat: 'CDI', date_embauche: '', is_active: true, type_salaire: 'journalier', tarif_journalier: '', salaire_fixe: '' }); setDialogVisible(true); };
  const openEdit = (e) => { setEditing(e); setForm({ nom: e.nom, prenom: e.prenom ?? '', poste: e.poste ?? '', telephone: e.telephone ?? '', type_contrat: e.type_contrat ?? 'CDI', date_embauche: e.date_embauche ?? '', is_active: e.is_active ?? true, type_salaire: e.type_salaire ?? 'journalier', tarif_journalier: String(e.tarif_journalier ?? ''), salaire_fixe: String(e.salaire_fixe ?? '') }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, prenom: form.prenom, poste: form.poste, telephone: form.telephone, type_contrat: form.type_contrat, date_embauche: form.date_embauche || null, is_active: form.is_active, type_salaire: form.type_salaire, tarif_journalier: parseFloat(form.tarif_journalier) || null, salaire_fixe: parseFloat(form.salaire_fixe) || null };
      if (editing) await client.put(`/rh/employes/${editing.id_employe}`, payload);
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
    <View style={styles.screen}>
      <AppHeader title="Gestion RH" navigation={navigation} />
      <SegmentedButtons value={tab} onValueChange={setTab} style={{ margin: 12 }}
        buttons={[{ value: 'employes', label: 'Employés', icon: 'account-group' }, { value: 'presences', label: 'Présences', icon: 'calendar-check' }]} />

      {tab === 'employes' && (
        <View style={{ backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderColor: '#e0ece0' }}>
          <TextInput
            placeholder="Rechercher un employé..."
            value={filterNom}
            onChangeText={setFilterNom}
            left={<TextInput.Icon icon="magnify" />}
            right={filterNom ? <TextInput.Icon icon="close" onPress={() => setFilterNom('')} /> : null}
            mode="outlined"
            dense
            style={{ marginBottom: 8, backgroundColor: '#fff' }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={filterStatut}
              onValueChange={setFilterStatut}
              buttons={[
                { value: '', label: 'Tous' },
                { value: 'actif', label: 'Actifs' },
                { value: 'inactif', label: 'Inactifs' },
              ]}
              style={{ marginRight: 8 }}
            />
            <SelectFilter
              label="Poste"
              value={filterPoste}
              onChange={setFilterPoste}
              options={postes.map(p => ({ value: p, label: p }))}
            />
          </ScrollView>
        </View>
      )}

      {tab === 'employes' ? (
        <ScrollView style={styles.container}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialCommunityIcons name="account-group" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
            <Text variant="titleSmall" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>{employesFiltres.length} employé(s)</Text>
          </View>
          {employesFiltres.length === 0 && employes.length > 0 ? <EmptyState message="Aucun employé pour ces filtres" /> : employesFiltres.length === 0 ? <EmptyState message="Aucun employé enregistré" /> : (
            employesFiltres.map((e, i) => {
              const sc = SALAIRE_CONFIG[e.type_salaire] || SALAIRE_CONFIG.journalier;
              const salaire = e.type_salaire === 'journalier' ? `${e.tarif_journalier ?? 0} DH/j` : `${e.salaire_fixe ?? 0} DH/mois`;
              return (
                <Card key={e.id_employe} style={[styles.empCard, i > 0 && { marginTop: 8 }]}>
                  <View style={styles.empRow}>
                    <View style={[styles.avatar, { backgroundColor: e.is_active ? '#e8f5e9' : '#f5f5f5' }]}>
                      <MaterialCommunityIcons name={e.is_active ? 'account' : 'account-off'} size={26} color={e.is_active ? '#2d7a4a' : '#aaa'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '700' }}>{e.nom} {e.prenom ?? ''}</Text>
                      <Text variant="bodySmall" style={{ color: '#666' }}>{e.poste ?? '—'}</Text>
                      {e.telephone ? <Text variant="bodySmall" style={{ color: '#888', fontSize: 11 }}>{e.telephone}</Text> : null}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <Chip compact icon={sc.icon} style={{ backgroundColor: sc.bg }} textStyle={{ color: sc.color, fontSize: 10 }}>{salaire}</Chip>
                        {!e.is_active && <Chip compact style={{ backgroundColor: '#f5f5f5' }} textStyle={{ color: '#aaa', fontSize: 10 }}>Inactif</Chip>}
                      </View>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Button icon="pencil" compact onPress={() => openEdit(e)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => setConfirmId(e.id_employe)} textColor="#ff4d4f" />
                    </View>
                  </View>
                </Card>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <PresencesResume employes={employes} />
      )}

      {tab === 'employes' && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un employé</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
              <TextInput label="Prénom" value={form.prenom} onChangeText={v => setForm(f => ({ ...f, prenom: v }))} style={{ marginBottom: 8 }} />
              <TextInput label="Poste" value={form.poste} onChangeText={v => setForm(f => ({ ...f, poste: v }))} style={{ marginBottom: 8 }} />
              <TextInput label="Téléphone" value={form.telephone} onChangeText={v => setForm(f => ({ ...f, telephone: v }))} keyboardType="phone-pad" style={{ marginBottom: 8 }} />
              <TextInput label="Date d'embauche (YYYY-MM-DD)" value={form.date_embauche} onChangeText={v => setForm(f => ({ ...f, date_embauche: v }))} style={{ marginBottom: 8 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>Actif</Text>
                <Switch value={form.is_active} onValueChange={v => setForm(f => ({ ...f, is_active: v }))} color="#2d7a4a" />
              </View>
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Type de salaire</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {['journalier', 'fixe'].map(t => (
                  <Chip key={t} selected={form.type_salaire === t} onPress={() => setForm(f => ({ ...f, type_salaire: t }))}>{t}</Chip>
                ))}
              </View>
              {form.type_salaire === 'journalier'
                ? <TextInput label="Tarif journalier (DH)" value={form.tarif_journalier} onChangeText={v => setForm(f => ({ ...f, tarif_journalier: v }))} keyboardType="numeric" />
                : <TextInput label="Salaire fixe (DH/mois)" value={form.salaire_fixe} onChangeText={v => setForm(f => ({ ...f, salaire_fixe: v }))} keyboardType="numeric" />
              }
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cet employé ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function PresencesResume({ employes }) {
  const [feuille, setFeuille] = useState(null);
  const [loading, setLoading] = useState(true);
  const mois = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    client.get(`/feuilles/?mois=${mois}`)
      .then(r => setFeuille(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Text style={{ padding: 16, color: '#888' }}>Chargement...</Text>;
  if (!feuille || !feuille.lignes?.length) return <EmptyState message="Aucune présence ce mois" />;

  return (
    <ScrollView style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <MaterialCommunityIcons name="calendar-month" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="titleSmall" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>Présences — {mois}</Text>
      </View>
      {feuille.lignes.map((l, i) => {
        const emp = employes.find(e => e.id_employe === l.employe_id);
        const nom = emp ? `${emp.nom} ${emp.prenom ?? ''}` : l.nom_temp || `Employé ${l.employe_id}`;
        const jours = l.nb_jours_present ?? 0;
        return (
          <Card key={i} style={{ marginBottom: 8, elevation: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
              <MaterialCommunityIcons name="account-circle" size={32} color="#2d7a4a" style={{ marginRight: 10 }} />
              <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '600' }}>{nom}</Text>
              <View style={{ backgroundColor: '#2d7a4a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{jours}</Text>
                <Text style={{ color: '#fff', fontSize: 9 }}>jours</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, paddingHorizontal: 12 },
  empCard: { elevation: 2 },
  empRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
