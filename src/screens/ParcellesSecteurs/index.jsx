import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Text, Chip, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import SelectFilter from '../../components/SelectFilter';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';

const STATUT_COLORS = { actif: '#388e3c', jeune: '#1976d2', inactif: '#757575' };

export default function ParcellesSecteurs({ navigation }) {
  const { secteurs, parcelles, varietes, refreshSecteurs, refreshParcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogType, setDialogType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: '' });
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmType, setConfirmType] = useState(null);
  const [snack, setSnack] = useState('');
  const [expandedParcelle, setExpandedParcelle] = useState(null);

  const secteursOfParcelle = (parcelleId) => secteurs.filter(s => s.parcelle_id === parcelleId);
  const getVarieteNom = (id) => varietes.find(v => v.id_variete === id)?.nom || '-';

  const openCreateSecteur = (parcelleId) => {
    setEditing(null);
    setForm({ nom: '', surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: String(parcelleId) });
    setDialogType('secteur');
  };
  const openEditSecteur = (s) => {
    setEditing(s);
    setForm({ nom: s.nom, surface: String(s.surface ?? ''), nb_arbre: String(s.nb_arbre ?? ''), age_moy: String(s.age_moy ?? ''), statut: s.statut || 'actif', variete_id: String(s.variete_id ?? ''), parcelle_id: String(s.parcelle_id ?? '') });
    setDialogType('secteur');
  };
  const openCreateParcelle = () => {
    setEditing(null);
    setForm({ nom: '', surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: '' });
    setDialogType('parcelle');
  };
  const openEditParcelle = (p) => {
    setEditing(p);
    setForm({ nom: p.nom, surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: '' });
    setDialogType('parcelle');
  };

  const save = async () => {
    setLoading(true);
    try {
      if (dialogType === 'parcelle') {
        const payload = { nom: form.nom };
        if (editing) await client.put(`/parcelles/${editing.id_parcelle}`, payload);
        else await client.post('/parcelles/', payload);
        await refreshParcelles();
      } else {
        const payload = { nom: form.nom, surface: parseFloat(form.surface) || 0, nb_arbre: parseInt(form.nb_arbre) || 0, age_moy: parseInt(form.age_moy) || 0, statut: form.statut, variete_id: parseInt(form.variete_id) || null, parcelle_id: parseInt(form.parcelle_id) || null };
        if (editing) await client.put(`/secteurs/${editing.id_secteur}`, payload);
        else await client.post('/secteurs/', payload);
        await refreshSecteurs();
      }
      setDialogType(null);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    try {
      if (confirmType === 'parcelle') { await client.delete(`/parcelles/${confirmId}`); await refreshParcelles(); await refreshSecteurs(); }
      else { await client.delete(`/secteurs/${confirmId}`); await refreshSecteurs(); }
    } catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Parcelles & Secteurs" navigation={navigation} />
      <ScrollView style={{ backgroundColor: '#f0f4f0' }}>
        {parcelles.length === 0 && <EmptyState message="Aucune parcelle enregistrée" />}
        {parcelles.map(p => (
          <List.Accordion
            key={p.id_parcelle}
            title={p.nom}
            description={`${secteursOfParcelle(p.id_parcelle).length} secteur(s)`}
            left={props => <List.Icon {...props} icon="map-marker-multiple" />}
            expanded={expandedParcelle === p.id_parcelle}
            onPress={() => setExpandedParcelle(expandedParcelle === p.id_parcelle ? null : p.id_parcelle)}
            style={{ backgroundColor: '#f6faf3' }}
            titleStyle={{ color: '#2d7a4a', fontWeight: 'bold' }}
          >
            {isAdmin && (
              <View style={{ flexDirection: 'row', padding: 8, gap: 8 }}>
                <Button icon="pencil" mode="outlined" compact onPress={() => openEditParcelle(p)}>Modifier parcelle</Button>
                <Button icon="delete" mode="outlined" compact textColor="#d32f2f" onPress={() => { setConfirmType('parcelle'); setConfirmId(p.id_parcelle); }}>Supprimer</Button>
              </View>
            )}
            {secteursOfParcelle(p.id_parcelle).map(s => (
              <View key={s.id_secteur} style={styles.secteurCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="titleSmall" style={{ color: '#2d7a4a' }}>{s.nom}</Text>
                  <Chip compact style={{ backgroundColor: (STATUT_COLORS[s.statut] || '#888') + '22' }}>{s.statut}</Chip>
                </View>
                <View style={styles.secteurDetails}>
                  <Text variant="bodySmall">Surface : {s.surface} ha</Text>
                  <Text variant="bodySmall">Arbres : {s.nb_arbre}</Text>
                  <Text variant="bodySmall">Âge moy. : {s.age_moy} ans</Text>
                  <Text variant="bodySmall">Variété : {getVarieteNom(s.variete_id)}</Text>
                </View>
                {isAdmin && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Button icon="pencil" compact mode="text" onPress={() => openEditSecteur(s)}>Modifier</Button>
                    <Button icon="delete" compact mode="text" textColor="#d32f2f" onPress={() => { setConfirmType('secteur'); setConfirmId(s.id_secteur); }}>Supprimer</Button>
                  </View>
                )}
              </View>
            ))}
            {isAdmin && (
              <List.Item
                title="Ajouter un secteur"
                left={props => <List.Icon {...props} icon="plus-circle" />}
                titleStyle={{ color: '#2d7a4a' }}
                onPress={() => openCreateSecteur(p.id_parcelle)}
              />
            )}
          </List.Accordion>
        ))}
      </ScrollView>
      {isAdmin && <FAB icon="plus" label="Parcelle" style={styles.fab} onPress={openCreateParcelle} />}
      <Portal>
        <Dialog visible={!!dialogType} onDismiss={() => setDialogType(null)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} {dialogType === 'parcelle' ? 'une parcelle' : 'un secteur'}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
            {dialogType === 'secteur' && (
              <>
                <TextInput label="Surface (ha)" value={form.surface} onChangeText={v => setForm(f => ({ ...f, surface: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
                <TextInput label="Nombre d'arbres" value={form.nb_arbre} onChangeText={v => setForm(f => ({ ...f, nb_arbre: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
                <TextInput label="Âge moyen (ans)" value={form.age_moy} onChangeText={v => setForm(f => ({ ...f, age_moy: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
                <Text variant="labelMedium" style={{ marginBottom: 4 }}>Variété *</Text>
                <View style={{ marginBottom: 12 }}>
                  <SelectFilter
                    label="Choisir une variété"
                    value={form.variete_id}
                    onChange={v => setForm(f => ({ ...f, variete_id: v }))}
                    options={varietes.map(v => ({ value: String(v.id_variete), label: v.nom }))}
                  />
                </View>
                <Text variant="labelMedium" style={{ marginBottom: 4 }}>Statut</Text>
                <View style={{ marginBottom: 8 }}>
                  <SelectFilter
                    label="Choisir un statut"
                    value={form.statut}
                    onChange={v => setForm(f => ({ ...f, statut: v }))}
                    options={[
                      { value: 'actif', label: 'En production' },
                      { value: 'jeune', label: 'Jeune' },
                      { value: 'inactif', label: 'Inactif' },
                    ]}
                  />
                </View>
              </>
            )}
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
        message={confirmType === 'parcelle' ? 'Supprimer cette parcelle et tous ses secteurs associés ?' : 'Supprimer ce secteur et tous ses travaux, récoltes et fertilisations associés ?'}
        onConfirm={confirmDelete}
        onDismiss={() => setConfirmId(null)}
        confirmLabel="Supprimer"
      />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  secteurCard: { margin: 8, padding: 12, backgroundColor: '#fff', borderRadius: 8, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#2d7a4a' },
  secteurDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4, backgroundColor: '#f9fbe7', borderRadius: 6, padding: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
