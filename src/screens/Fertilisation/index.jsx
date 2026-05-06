import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Chip, Snackbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SelectFilter from '../../components/SelectFilter';
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
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Fertilisation" navigation={navigation} />
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SelectFilter
            label="Parcelle"
            value={filterParcelle}
            onChange={v => { setFilterParcelle(v); setFilterSecteur(''); }}
            options={parcelles.map(p => ({ value: String(p.id_parcelle), label: p.nom }))}
          />
          <SelectFilter
            label="Secteur"
            value={filterSecteur}
            onChange={setFilterSecteur}
            options={secteursOfParcelle.map(s => ({ value: String(s.id_secteur), label: s.nom }))}
          />
          <SelectFilter
            label="Année"
            value={filterAnnee}
            onChange={setFilterAnnee}
            options={annees.map(a => ({ value: a, label: a }))}
          />
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="sprout" size={16} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>{filtered.length} fertilisation(s)</Text>
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucune fertilisation" /> : (
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
          <View style={{ width: 640 }}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 130 }]}>Produit</Text>
              <Text style={[styles.th, { width: 90 }]}>Parcelle</Text>
              <Text style={[styles.th, { width: 90 }]}>Secteur</Text>
              <Text style={[styles.th, { width: 60, textAlign: 'right' }]}>Qté</Text>
              <Text style={[styles.th, { width: 75, textAlign: 'right' }]}>Coût/u</Text>
              <Text style={[styles.th, { width: 90 }]}>Date</Text>
              <Text style={[styles.th, { width: 105 }]}>Actions</Text>
            </View>
            {/* Rows */}
            {filtered.map((item, idx) => (
              <View key={item.id_fertilisation} style={[styles.tableRow, idx % 2 !== 0 && styles.tableRowAlt]}>
                <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>{item.produit}</Text>
                <Text style={[styles.td, { width: 90 }]} numberOfLines={1}>{getParcelleNom(item.secteur_id)}</Text>
                <Text style={[styles.td, { width: 90 }]} numberOfLines={1}>{getSecteurNom(item.secteur_id)}</Text>
                <Text style={[styles.td, { width: 60, textAlign: 'right' }]}>{item.quantite}</Text>
                <Text style={[styles.td, { width: 75, textAlign: 'right' }]}>{item.cout_unitaire} DH</Text>
                <Text style={[styles.td, { width: 90 }]}>{item.date}</Text>
                <View style={{ width: 105, justifyContent: 'center', flexDirection: 'row' }}>
                  {isAdmin ? (
                    <>
                      <Button icon="pencil" compact onPress={() => openEdit(item)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => setConfirmId(item.id_fertilisation)} textColor="#ff4d4f" />
                    </>
                  ) : (
                    <Button compact icon="file-send" onPress={() => { setDemandeItem(item); setMotif(''); }} textColor="#fa8c16" />
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} fertilisation</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput label="Produit" value={form.produit} onChangeText={v => setForm(f => ({ ...f, produit: v }))} style={{ marginBottom: 8 }} />
              <TextInput label="Quantité (kg)" value={form.quantite} onChangeText={v => setForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
              <TextInput label="Coût unitaire (DH)" value={form.cout_unitaire} onChangeText={v => setForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
              <TextInput label="Date (YYYY-MM-DD)" value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 8 }} />
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Secteur</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {secteurs.map(s => (
                  <Chip key={s.id_secteur} selected={form.secteur_id === String(s.id_secteur)} onPress={() => setForm(f => ({ ...f, secteur_id: String(s.id_secteur) }))} style={{ marginRight: 6 }}>{s.nom}</Chip>
                ))}
              </ScrollView>
            </ScrollView>
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
  chip: { marginRight: 6 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8f5e9', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 2, borderColor: '#2d7a4a' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e0ece0' },
  tableRowAlt: { backgroundColor: '#f0f7f0' },
  th: { fontSize: 12, fontWeight: 'bold', color: '#2d7a4a' },
  td: { fontSize: 12, color: '#333' },
});
