import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Chip, Text, Snackbar } from 'react-native-paper';
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

const TYPES = ['Taille', 'Labour mécanique', 'Nettoyage', 'Ramassage', 'Transport', 'Fertilisation', 'Traitement', 'Irrigation', 'Loyer', 'Autre'];
const STATUTS = ['planifie', 'actif', 'termine'];
const STATUT_COLORS = { planifie: '#f57c00', actif: '#1976d2', termine: '#388e3c' };

export default function TravailAgricole({ navigation }) {
  const { secteurs, parcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [travaux, setTravaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterParcelle, setFilterParcelle] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', type: 'Taille', cout: '', m_o: '', date: '', statut: 'planifie', secteur_id: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [demandeItem, setDemandeItem] = useState(null);
  const [motif, setMotif] = useState('');
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchTravaux(); }, []);

  const fetchTravaux = async () => {
    try {
      const res = await client.get('/travaux/');
      setTravaux(res.data);
    } catch (e) {
      const msg = e?.response?.status
        ? `Erreur ${e.response.status}: ${JSON.stringify(e.response.data)}`
        : e?.message || 'Erreur de chargement';
      setSnack(msg);
    } finally {
      setLoading(false);
    }
  };

  const secteursOfParcelle = filterParcelle ? secteurs.filter(s => String(s.parcelle_id) === filterParcelle) : secteurs;

  const filtered = travaux.filter(t => {
    if (filterSecteur && String(t.secteur_id) !== filterSecteur) return false;
    if (filterParcelle) {
      const sec = secteurs.find(s => s.id_secteur === t.secteur_id);
      if (!sec || String(sec.parcelle_id) !== filterParcelle) return false;
    }
    if (filterAnnee && t.date && !t.date.startsWith(filterAnnee)) return false;
    if (filterType && t.type !== filterType) return false;
    if (filterStatut && t.statut !== filterStatut) return false;
    return true;
  });

  const getSecteurNom = (id) => secteurs.find(s => s.id_secteur === id)?.nom || '-';
  const getParcelleNom = (secteurId) => {
    const sec = secteurs.find(s => s.id_secteur === secteurId);
    return parcelles.find(p => p.id_parcelle === sec?.parcelle_id)?.nom || '-';
  };

  const openCreate = () => { setEditing(null); setForm({ nom: '', type: 'Taille', cout: '', m_o: '', date: '', statut: 'planifie', secteur_id: '' }); setDialogVisible(true); };
  const openEdit = (t) => { setEditing(t); setForm({ nom: t.nom, type: t.type ?? 'Taille', cout: String(t.cout ?? ''), m_o: String(t.m_o ?? ''), date: t.date ?? '', statut: t.statut, secteur_id: String(t.secteur_id ?? '') }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, type: form.type, cout: parseFloat(form.cout) || 0, m_o: parseInt(form.m_o) || 0, date: form.date, statut: form.statut, secteur_id: parseInt(form.secteur_id) || null };
      if (editing) await client.put(`/travaux/${editing.id_travail}`, payload);
      else await client.post('/travaux/', payload);
      await fetchTravaux(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/travaux/${confirmId}`); await fetchTravaux(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  const envoyerDemande = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'travail', travail_id: demandeItem.id_travail, motif });
      setSnack('Demande envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeItem(null); setMotif('');
  };

  const annees = [...new Set(travaux.map(t => t.date?.slice(0, 4)).filter(Boolean))].sort().reverse();

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Travaux Agricoles" navigation={navigation} />
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
          <SelectFilter
            label="Type"
            value={filterType}
            onChange={setFilterType}
            options={TYPES.map(t => ({ value: t, label: t }))}
          />
          <SelectFilter
            label="Statut"
            value={filterStatut}
            onChange={setFilterStatut}
            options={STATUTS.map(s => ({ value: s, label: s }))}
          />
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="shovel" size={16} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>{filtered.length} travaux</Text>
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucun travail" /> : (
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
          <View style={{ width: 820 }}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 140 }]}>Nom</Text>
              <Text style={[styles.th, { width: 100 }]}>Type</Text>
              <Text style={[styles.th, { width: 90 }]}>Parcelle</Text>
              <Text style={[styles.th, { width: 90 }]}>Secteur</Text>
              <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Coût</Text>
              <Text style={[styles.th, { width: 50, textAlign: 'right' }]}>M.O.</Text>
              <Text style={[styles.th, { width: 90 }]}>Date</Text>
              <Text style={[styles.th, { width: 80 }]}>Statut</Text>
              <Text style={[styles.th, { width: 110 }]}>Actions</Text>
            </View>
            {filtered.map((t, idx) => (
              <View key={t.id_travail} style={[styles.tableRow, idx % 2 !== 0 && styles.tableRowAlt]}>
                <Text style={[styles.td, { width: 140 }]} numberOfLines={1}>{t.nom}</Text>
                <Text style={[styles.td, { width: 100 }]} numberOfLines={1}>{t.type}</Text>
                <Text style={[styles.td, { width: 90 }]} numberOfLines={1}>{getParcelleNom(t.secteur_id)}</Text>
                <Text style={[styles.td, { width: 90 }]} numberOfLines={1}>{getSecteurNom(t.secteur_id)}</Text>
                <Text style={[styles.td, { width: 70, textAlign: 'right' }]}>{t.cout} DH</Text>
                <Text style={[styles.td, { width: 50, textAlign: 'right' }]}>{t.m_o}j</Text>
                <Text style={[styles.td, { width: 90 }]}>{t.date}</Text>
                <View style={{ width: 80, justifyContent: 'center' }}>
                  <Chip compact textStyle={{ fontSize: 9 }} style={{ backgroundColor: (STATUT_COLORS[t.statut] || '#888') + '33' }}>
                    {t.statut}
                  </Chip>
                </View>
                <View style={{ width: 110, flexDirection: 'row', alignItems: 'center' }}>
                  {isAdmin ? (
                    <>
                      <Button icon="pencil" compact onPress={() => openEdit(t)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => setConfirmId(t.id_travail)} textColor="#ff4d4f" />
                    </>
                  ) : (
                    <Button compact icon="file-send" onPress={() => { setDemandeItem(t); setMotif(''); }} textColor="#fa8c16" />
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
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un travail</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} style={{ marginBottom: 8 }} />
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {TYPES.map(t => <Chip key={t} selected={form.type === t} onPress={() => setForm(f => ({ ...f, type: t }))} style={{ marginRight: 6 }}>{t}</Chip>)}
              </ScrollView>
              <TextInput label="Coût (DH)" value={form.cout} onChangeText={v => setForm(f => ({ ...f, cout: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
              <TextInput label="Main d'œuvre (jours)" value={form.m_o} onChangeText={v => setForm(f => ({ ...f, m_o: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
              <TextInput label="Date (YYYY-MM-DD)" value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 8 }} />
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Statut</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {STATUTS.map(s => <Chip key={s} selected={form.statut === s} onPress={() => setForm(f => ({ ...f, statut: s }))}>{s}</Chip>)}
              </View>
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Secteur</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {secteurs.map(s => <Chip key={s.id_secteur} selected={form.secteur_id === String(s.id_secteur)} onPress={() => setForm(f => ({ ...f, secteur_id: String(s.id_secteur) }))} style={{ marginRight: 6 }}>{s.nom}</Chip>)}
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
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer ce travail ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={8000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  filtersContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', padding: 8 },
  chip: { marginRight: 6 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8f5e9', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 2, borderColor: '#2d7a4a' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e0ece0' },
  tableRowAlt: { backgroundColor: '#f0f7f0' },
  th: { fontSize: 12, fontWeight: 'bold', color: '#2d7a4a' },
  td: { fontSize: 12, color: '#333' },
});
