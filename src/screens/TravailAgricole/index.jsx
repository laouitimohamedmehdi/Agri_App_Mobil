import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, FAB, Portal, Dialog, TextInput, Button, Chip, Text, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
          <Chip selected={!filterParcelle} onPress={() => { setFilterParcelle(''); setFilterSecteur(''); }} style={styles.chip}>Toutes parcelles</Chip>
          {parcelles.map(p => (
            <Chip key={p.id_parcelle} selected={filterParcelle === String(p.id_parcelle)} onPress={() => { setFilterParcelle(String(p.id_parcelle)); setFilterSecteur(''); }} style={styles.chip}>{p.nom}</Chip>
          ))}
          {secteursOfParcelle.map(s => (
            <Chip key={s.id_secteur} selected={filterSecteur === String(s.id_secteur)} onPress={() => setFilterSecteur(filterSecteur === String(s.id_secteur) ? '' : String(s.id_secteur))} style={styles.chip}>{s.nom}</Chip>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {annees.map(a => (
            <Chip key={a} selected={filterAnnee === a} onPress={() => setFilterAnnee(filterAnnee === a ? '' : a)} style={styles.chip}>{a}</Chip>
          ))}
          {TYPES.map(t => (
            <Chip key={t} selected={filterType === t} onPress={() => setFilterType(filterType === t ? '' : t)} style={styles.chip}>{t}</Chip>
          ))}
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="shovel" size={16} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>{filtered.length} travaux</Text>
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucun travail" /> : (
        <ScrollView horizontal style={{ flex: 1 }}>
          <DataTable style={{ minWidth: 750 }}>
            <DataTable.Header style={{ backgroundColor: '#e8f5e9' }}>
              <DataTable.Title style={{ flex: 2 }}>Nom</DataTable.Title>
              <DataTable.Title>Type</DataTable.Title>
              <DataTable.Title>Parcelle</DataTable.Title>
              <DataTable.Title>Secteur</DataTable.Title>
              <DataTable.Title numeric>Coût</DataTable.Title>
              <DataTable.Title numeric>M.O.</DataTable.Title>
              <DataTable.Title>Date</DataTable.Title>
              <DataTable.Title>Statut</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>
            {filtered.map((t, idx) => (
              <DataTable.Row key={t.id_travail} style={idx % 2 !== 0 ? { backgroundColor: '#f9fbe7' } : {}}>
                <DataTable.Cell style={{ flex: 2 }}>{t.nom}</DataTable.Cell>
                <DataTable.Cell>{t.type}</DataTable.Cell>
                <DataTable.Cell>{getParcelleNom(t.secteur_id)}</DataTable.Cell>
                <DataTable.Cell>{getSecteurNom(t.secteur_id)}</DataTable.Cell>
                <DataTable.Cell numeric>{t.cout} DH</DataTable.Cell>
                <DataTable.Cell numeric>{t.m_o}j</DataTable.Cell>
                <DataTable.Cell>{t.date}</DataTable.Cell>
                <DataTable.Cell>
                  <Chip compact style={{ backgroundColor: (STATUT_COLORS[t.statut] || '#888') + '22' }}>
                    {t.statut}
                  </Chip>
                </DataTable.Cell>
                <DataTable.Cell>
                  {isAdmin ? (
                    <View style={{ flexDirection: 'row' }}>
                      <Button icon="pencil" compact onPress={() => openEdit(t)} />
                      <Button icon="delete" compact onPress={() => setConfirmId(t.id_travail)} />
                    </View>
                  ) : (
                    <Button compact icon="file-send" onPress={() => { setDemandeItem(t); setMotif(''); }}>
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
});
