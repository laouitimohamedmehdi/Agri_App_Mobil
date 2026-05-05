import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Snackbar, Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';

export default function Fertilisation({ navigation }) {
  const { secteurs, parcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterParcelle, setFilterParcelle] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ produit: '', quantite: '', cout_unitaire: '', date: '', secteur_id: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [demandeItem, setDemandeItem] = useState(null);
  const [motif, setMotif] = useState('');
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const res = await client.get('/fertilisation/'); setItems(res.data); }
    catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const secteursOfParcelle = filterParcelle
    ? secteurs.filter(s => String(s.parcelle_id) === filterParcelle)
    : secteurs;

  const filtered = items.filter(item => {
    if (filterSecteur && String(item.secteur_id) !== filterSecteur) return false;
    if (filterParcelle) {
      const sec = secteurs.find(s => s.id_secteur === item.secteur_id);
      if (!sec || String(sec.parcelle_id) !== filterParcelle) return false;
    }
    if (filterAnnee && item.date && !item.date.startsWith(filterAnnee)) return false;
    return true;
  });

  const getSecteurNom = (id) => secteurs.find(s => s.id_secteur === id)?.nom || '-';
  const getParcelleNom = (secteurId) => {
    const sec = secteurs.find(s => s.id_secteur === secteurId);
    return parcelles.find(p => p.id_parcelle === sec?.parcelle_id)?.nom || '-';
  };

  const openCreate = () => { setEditing(null); setForm({ produit: '', quantite: '', cout_unitaire: '', date: '', secteur_id: '' }); setDialogVisible(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ produit: item.produit, quantite: String(item.quantite ?? ''), cout_unitaire: String(item.cout_unitaire ?? ''), date: item.date ?? '', secteur_id: String(item.secteur_id ?? '') });
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { produit: form.produit, quantite: parseFloat(form.quantite) || 0, cout_unitaire: parseFloat(form.cout_unitaire) || 0, date: form.date, secteur_id: parseInt(form.secteur_id) || null };
      if (editing) await client.put(`/fertilisation/${editing.id_fertilisation}`, payload);
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

  const envoyerDemande = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'fertilisation', entity_id: demandeItem.id_fertilisation, motif });
      setSnack('Demande envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeItem(null); setMotif('');
  };

  const annees = [...new Set(items.map(i => i.date?.slice(0, 4)).filter(Boolean))].sort().reverse();

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Fertilisation" navigation={navigation} />
      <View style={styles.filtersContainer}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={filterParcelle} onValueChange={v => { setFilterParcelle(v); setFilterSecteur(''); }} style={styles.picker}>
              <Picker.Item label="Toutes parcelles" value="" />
              {parcelles.map(p => <Picker.Item key={p.id_parcelle} label={p.nom} value={String(p.id_parcelle)} />)}
            </Picker>
          </View>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={filterSecteur} onValueChange={setFilterSecteur} style={styles.picker}>
              <Picker.Item label="Tous secteurs" value="" />
              {secteursOfParcelle.map(s => <Picker.Item key={s.id_secteur} label={s.nom} value={String(s.id_secteur)} />)}
            </Picker>
          </View>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={filterAnnee} onValueChange={setFilterAnnee} style={styles.picker}>
              <Picker.Item label="Toutes années" value="" />
              {annees.map(a => <Picker.Item key={a} label={a} value={a} />)}
            </Picker>
          </View>
        </View>
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucune fertilisation" /> : (
        <ScrollView horizontal>
          <DataTable style={{ minWidth: 650 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Produit</DataTable.Title>
              <DataTable.Title>Parcelle</DataTable.Title>
              <DataTable.Title>Secteur</DataTable.Title>
              <DataTable.Title numeric>Qté</DataTable.Title>
              <DataTable.Title numeric>Coût/u</DataTable.Title>
              <DataTable.Title>Date</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>
            {filtered.map(item => (
              <DataTable.Row key={item.id_fertilisation}>
                <DataTable.Cell style={{ flex: 2 }}>{item.produit}</DataTable.Cell>
                <DataTable.Cell>{getParcelleNom(item.secteur_id)}</DataTable.Cell>
                <DataTable.Cell>{getSecteurNom(item.secteur_id)}</DataTable.Cell>
                <DataTable.Cell numeric>{item.quantite}</DataTable.Cell>
                <DataTable.Cell numeric>{item.cout_unitaire} DH</DataTable.Cell>
                <DataTable.Cell>{item.date}</DataTable.Cell>
                <DataTable.Cell>
                  {isAdmin ? (
                    <View style={{ flexDirection: 'row' }}>
                      <Button icon="pencil" compact onPress={() => openEdit(item)} />
                      <Button icon="delete" compact onPress={() => setConfirmId(item.id_fertilisation)} />
                    </View>
                  ) : (
                    <Button compact icon="file-send" onPress={() => { setDemandeItem(item); setMotif(''); }}>
                      Demande
                    </Button>
                  )}
                </DataTable.Cell>
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
            <TextInput label="Quantité (kg)" value={form.quantite} onChangeText={v => setForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Coût unitaire (DH)" value={form.cout_unitaire} onChangeText={v => setForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Date (YYYY-MM-DD)" value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 8 }} />
            <Text variant="labelMedium">Secteur</Text>
            <Picker selectedValue={form.secteur_id} onValueChange={v => setForm(f => ({ ...f, secteur_id: v }))}>
              <Picker.Item label="Sélectionner..." value="" />
              {secteurs.map(s => <Picker.Item key={s.id_secteur} label={s.nom} value={String(s.id_secteur)} />)}
            </Picker>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeItem} onDismiss={() => setDemandeItem(null)}>
          <Dialog.Title>Soumettre une demande</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Motif" value={motif} onChangeText={setMotif} multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeItem(null)}>Annuler</Button>
            <Button onPress={envoyerDemande}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cette fertilisation ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  filtersContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', padding: 8 },
  pickerWrap: { flex: 1, minWidth: 140, borderWidth: 1, borderColor: '#ccc', borderRadius: 4 },
  picker: { height: 44 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
