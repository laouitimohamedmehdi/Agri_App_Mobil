import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Switch, Text, Snackbar, SegmentedButtons, Chip } from 'react-native-paper';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import client from '../../api/client';

export default function RH({ navigation }) {
  const { employes, refreshEmployes } = useData();
  const [tab, setTab] = useState('employes');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', poste: '', telephone: '', type_contrat: 'CDI', date_embauche: '', is_active: true, type_salaire: 'journalier', tarif_journalier: '', salaire_fixe: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [snack, setSnack] = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: '', prenom: '', poste: '', telephone: '', type_contrat: 'CDI', date_embauche: '', is_active: true, type_salaire: 'journalier', tarif_journalier: '', salaire_fixe: '' });
    setDialogVisible(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setForm({ nom: e.nom, prenom: e.prenom ?? '', poste: e.poste ?? '', telephone: e.telephone ?? '', type_contrat: e.type_contrat ?? 'CDI', date_embauche: e.date_embauche ?? '', is_active: e.is_active ?? true, type_salaire: e.type_salaire ?? 'journalier', tarif_journalier: String(e.tarif_journalier ?? ''), salaire_fixe: String(e.salaire_fixe ?? '') });
    setDialogVisible(true);
  };

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
    <View style={{ flex: 1 }}>
      <AppHeader title="Gestion RH" navigation={navigation} />
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[{ value: 'employes', label: 'Employés' }, { value: 'presences', label: 'Présences du mois' }]}
        style={{ margin: 12 }}
      />
      {tab === 'employes' ? (
        <>
          {employes.length === 0 ? <EmptyState message="Aucun employé enregistré" /> : (
            <ScrollView style={{ backgroundColor: '#f5f5f5' }}>
              {employes.map(e => (
                <List.Item
                  key={e.id_employe}
                  title={`${e.nom} ${e.prenom ?? ''}`}
                  description={`${e.poste ?? '-'} • ${e.type_salaire === 'journalier' ? `${e.tarif_journalier ?? 0} DH/j` : `${e.salaire_fixe ?? 0} DH/mois`}`}
                  left={props => <List.Icon {...props} icon={e.is_active ? 'account' : 'account-off'} />}
                  right={() => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {e.telephone ? <Text variant="bodySmall" style={{ marginRight: 8, color: '#888' }}>{e.telephone}</Text> : null}
                      <Button icon="pencil" compact onPress={() => openEdit(e)} />
                      <Button icon="delete" compact onPress={() => setConfirmId(e.id_employe)} />
                    </View>
                  )}
                />
              ))}
            </ScrollView>
          )}
          <FAB icon="plus" style={styles.fab} onPress={openCreate} />
        </>
      ) : (
        <PresencesResume employes={employes} />
      )}
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
                <Switch value={form.is_active} onValueChange={v => setForm(f => ({ ...f, is_active: v }))} />
              </View>
              <Text variant="labelMedium">Type de salaire</Text>
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

  if (loading) return <Text style={{ padding: 16 }}>Chargement...</Text>;
  if (!feuille || !feuille.lignes?.length) return <EmptyState message="Aucune présence ce mois" />;

  return (
    <ScrollView>
      <Text variant="titleSmall" style={{ padding: 12, color: '#2d7a4a' }}>{mois}</Text>
      {feuille.lignes.map((l, i) => {
        const emp = employes.find(e => e.id_employe === l.employe_id);
        const nom = emp ? `${emp.nom} ${emp.prenom ?? ''}` : l.nom_temp || `Employé ${l.employe_id}`;
        return (
          <List.Item
            key={i}
            title={nom}
            description={`${l.nb_jours_present ?? 0} jours • Coût : ${l.cout_total ?? 0} DH`}
            left={props => <List.Icon {...props} icon="calendar-check" />}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' } });
