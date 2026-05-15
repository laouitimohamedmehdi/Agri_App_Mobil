import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
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
import DatePickerInput from '../../components/DatePickerInput';

const SCREEN_H = Dimensions.get('window').height;
const TYPES = ['Fertilisation', 'Taille', 'Labour mécanique', 'Nettoyage', 'Ramassage', 'Transport', 'Traitement', 'Irrigation', 'Loyer', 'Autre'];
const PRODUITS_FERTILISATION = ['Fumier de ferme', 'D.A.P', 'Super 45', 'Urée', 'NPK', 'Compost', 'Autre'];
const STATUTS = ['planifie', 'actif', 'termine'];
const STATUT_COLORS = { planifie: '#f57c00', actif: '#1976d2', termine: '#388e3c' };

export default function TravailAgricole({ navigation }) {
  const { secteurs, parcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [travaux, setTravaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLieu, setFilterLieu] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', type: 'Taille', cout: '', m_o: '', date: '', statut: 'planifie', secteur_id: '', quantite: '', cout_unitaire: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [demandeSupprItem, setDemandeSupprItem] = useState(null);
  const [demandeModifItem, setDemandeModifItem] = useState(null);
  const [motifSuppr, setMotifSuppr] = useState('');
  const [demandeForm, setDemandeForm] = useState({ nom: '', type: 'Taille', cout: '', m_o: '', date: '', statut: 'planifie', secteur_id: '', motif: '', quantite: '', cout_unitaire: '' });
  const [savingDemande, setSavingDemande] = useState(false);
  const [snack, setSnack] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTravaux();
    setRefreshing(false);
  };

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

  const lieuOptions = secteurs.map(s => ({
    value: String(s.id_secteur),
    label: `${parcelles.find(p => p.id_parcelle === s.parcelle_id)?.nom || '—'} — ${s.nom}`,
  }));

  const filtered = travaux.filter(t => {
    if (filterLieu && String(t.secteur_id) !== filterLieu) return false;
    if (filterAnnee && t.date && !t.date.startsWith(filterAnnee)) return false;
    if (filterType && t.type !== filterType) return false;
    if (filterStatut && t.statut !== filterStatut) return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const getSecteurNom = (id) => secteurs.find(s => s.id_secteur === id)?.nom || '-';
  const getParcelleNom = (secteurId) => {
    const sec = secteurs.find(s => s.id_secteur === secteurId);
    return parcelles.find(p => p.id_parcelle === sec?.parcelle_id)?.nom || '-';
  };

  const openCreate = () => { setEditing(null); setForm({ nom: '', type: '', cout: '', m_o: '', date: '', statut: 'planifie', secteur_id: '', quantite: '', cout_unitaire: '' }); setDialogVisible(true); };
  const openEdit = (t) => { setEditing(t); setForm({ nom: t.nom, type: t.type ?? 'Taille', cout: String(t.cout ?? ''), m_o: String(t.m_o ?? ''), date: t.date ?? '', statut: t.statut, secteur_id: String(t.secteur_id ?? ''), quantite: t.quantite != null ? String(t.quantite) : '', cout_unitaire: t.cout_unitaire != null ? String(t.cout_unitaire) : '' }); setDialogVisible(true); };

  const save = async () => {
    setSaving(true);
    try {
      const isFert = form.type === 'Fertilisation';
      const quantite = isFert && form.quantite !== '' ? parseFloat(form.quantite) : null;
      const cout_unitaire = isFert && form.cout_unitaire !== '' ? parseFloat(form.cout_unitaire) : null;
      const payload = {
        nom: form.nom, type: form.type, statut: form.statut,
        date: form.date, secteur_id: parseInt(form.secteur_id) || null,
        cout: isFert ? (quantite || 0) * (cout_unitaire || 0) : parseFloat(form.cout) || 0,
        m_o: isFert ? 0 : parseInt(form.m_o) || 0,
        quantite, cout_unitaire,
      };
      if (editing) await client.put(`/travaux/${editing.id_travail}`, payload);
      else await client.post('/travaux/', payload);
      await fetchTravaux(); setDialogVisible(false);
    } catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
        setDialogVisible(false);
      } else {
        setSnack('Erreur lors de la sauvegarde');
      }
    }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/travaux/${confirmId}`); await fetchTravaux(); }
    catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack('Erreur lors de la suppression');
      }
    }
    setConfirmId(null);
  };

  const openDemandeModif = (t) => {
    setDemandeModifItem(t);
    setDemandeForm({ nom: t.nom, type: t.type ?? 'Taille', cout: String(t.cout ?? ''), m_o: String(t.m_o ?? ''), date: t.date ?? '', statut: t.statut, secteur_id: String(t.secteur_id ?? ''), motif: '', quantite: t.quantite != null ? String(t.quantite) : '', cout_unitaire: t.cout_unitaire != null ? String(t.cout_unitaire) : '' });
  };

  const envoyerDemandeModif = async () => {
    setSavingDemande(true);
    try {
      const { motif: m, ...data } = demandeForm;
      await soumettreDemande({ type_action: 'modification', entity_type: 'travail', travail_id: demandeModifItem.id_travail, motif: m, nouvelles_donnees: { nom: data.nom, type: data.type, cout: parseFloat(data.cout) || 0, m_o: parseInt(data.m_o) || 0, date: data.date, statut: data.statut, secteur_id: parseInt(data.secteur_id) || null, quantite: data.type === 'Fertilisation' && data.quantite !== '' ? parseFloat(data.quantite) : null, cout_unitaire: data.type === 'Fertilisation' && data.cout_unitaire !== '' ? parseFloat(data.cout_unitaire) : null } });
      setSnack('Demande de modification envoyée');
      setDemandeModifItem(null);
    } catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack("Erreur lors de l'envoi");
      }
    }
    finally { setSavingDemande(false); }
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'travail', travail_id: demandeSupprItem.id_travail, motif: motifSuppr });
      setSnack('Demande de suppression envoyée');
    } catch (e) {
      if (e?.isQueued) {
        setSnack('Saisie enregistrée hors-ligne — sera envoyée au retour du réseau');
      } else {
        setSnack("Erreur lors de l'envoi");
      }
    }
    setDemandeSupprItem(null); setMotifSuppr('');
  };

  const annees = [...new Set(travaux.map(t => t.date?.slice(0, 4)).filter(Boolean))].sort().reverse();

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Travaux Agricoles" navigation={navigation} />
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SelectFilter
            label="Lieu"
            value={filterLieu}
            onChange={setFilterLieu}
            options={lieuOptions}
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
        <ScrollView style={{ flex: 1 }} nestedScrollEnabled refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: 666 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 88 }]}>Date</Text>
                <Text style={[styles.th, { width: 130 }]}>Nom</Text>
                <Text style={[styles.th, { width: 110 }]}>Type</Text>
                <Text style={[styles.th, { width: 114 }]}>Lieu</Text>
                <Text style={[styles.th, { width: 76 }]}>Coût (DT)</Text>
                <Text style={[styles.th, { width: 68 }]}>Statut</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'center', paddingRight: 0 }]}>Actions</Text>
              </View>
              {filtered.map((t, idx) => {
                const statutLabel = { planifie: 'Planifié', actif: 'En cours', termine: 'Terminé' }[t.statut] || t.statut;
                const statutColor = { planifie: '#faad14', actif: '#1677ff', termine: '#52c41a' }[t.statut] || '#888';
                const isFert = t.type === 'Fertilisation' && t.quantite > 0 && t.cout_unitaire > 0;
                const coutAffiche = isFert ? t.quantite * t.cout_unitaire : t.cout;
                return (
                  <View key={t.id_travail} style={[styles.tableRow, idx % 2 !== 0 && styles.tableRowAlt]}>
                    <Text style={[styles.td, { width: 88 }]}>{t.date || '—'}</Text>
                    <Text style={[styles.td, { width: 130 }]} numberOfLines={1}>{t.nom}</Text>
                    <Text style={[styles.td, { width: 110 }]} numberOfLines={1}>{t.type}</Text>
                    <View style={{ width: 114, paddingRight: 8, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }} numberOfLines={1}>{getParcelleNom(t.secteur_id)}</Text>
                      <Text style={{ fontSize: 11, color: '#8c8c8c' }} numberOfLines={1}>{getSecteurNom(t.secteur_id)}</Text>
                    </View>
                    <View style={{ width: 76, paddingRight: 8, justifyContent: 'center' }}>
                      <Text style={[styles.td, { paddingRight: 0 }]}>{coutAffiche?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</Text>
                      {isFert && (
                        <Text style={{ fontSize: 9, color: '#13c2c2', fontStyle: 'italic' }}>
                          {t.quantite} qté × {t.cout_unitaire} p.u.
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.td, { width: 68, color: statutColor, fontWeight: '600' }]}>{statutLabel}</Text>
                    <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                      {isAdmin ? (
                        <>
                          <Button icon="pencil" compact contentStyle={{ margin: -4 }} onPress={() => openEdit(t)} textColor="#1677ff" />
                          <Button icon="delete" compact contentStyle={{ margin: -4 }} onPress={() => setConfirmId(t.id_travail)} textColor="#ff4d4f" />
                        </>
                      ) : (
                        <>
                          <Button icon="pencil" compact contentStyle={{ margin: -4 }} onPress={() => openDemandeModif(t)} textColor="#1677ff" />
                          <Button icon="delete" compact contentStyle={{ margin: -4 }} onPress={() => { setDemandeSupprItem(t); setMotifSuppr(''); }} textColor="#ff4d4f" />
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} un travail</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.5 }}>
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Type *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Choisir un type" value={form.type}
                  onChange={v => setForm(f => ({ ...f, type: v, nom: '', cout: '', quantite: '', cout_unitaire: '' }))}
                  options={TYPES.map(t => ({ value: t, label: t }))} />
              </View>

              {form.type === 'Fertilisation' ? (
                <>
                  <Text variant="labelMedium" style={{ marginBottom: 4 }}>Produit</Text>
                  <View style={{ marginBottom: 12 }}>
                    <SelectFilter noAll label="Choisir un produit" value={form.nom}
                      onChange={v => setForm(f => ({ ...f, nom: v }))}
                      options={PRODUITS_FERTILISATION.map(p => ({ value: p, label: p }))} />
                  </View>
                </>
              ) : (
                <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} maxLength={50} style={{ marginBottom: 12 }} />
              )}

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Statut *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Choisir un statut" value={form.statut}
                  onChange={v => setForm(f => ({ ...f, statut: v }))}
                  options={[{ value: 'planifie', label: 'Planifié' }, { value: 'actif', label: 'En cours' }]} />
              </View>

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Secteur *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Choisir un secteur" value={form.secteur_id}
                  onChange={v => setForm(f => ({ ...f, secteur_id: v }))}
                  options={secteurs.map(s => ({ value: String(s.id_secteur), label: s.nom }))} />
              </View>

              <DatePickerInput label="Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />

              {form.type === 'Fertilisation' ? (
                <>
                  <TextInput label="Quantité" value={form.quantite} onChangeText={v => setForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                  <TextInput label="Coût unitaire (DT)" value={form.cout_unitaire} onChangeText={v => setForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
                  {form.quantite !== '' && form.cout_unitaire !== '' && (
                    <Text variant="bodySmall" style={{ color: '#13c2c2', marginBottom: 12, fontStyle: 'italic' }}>
                      Coût total : {(parseFloat(form.quantite) || 0) * (parseFloat(form.cout_unitaire) || 0)} DT
                    </Text>
                  )}
                  <TextInput label="Main d'œuvre (jours)" value={form.m_o} onChangeText={v => setForm(f => ({ ...f, m_o: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                </>
              ) : (
                <>
                  <TextInput label="Coût (DT)" value={form.cout} onChangeText={v => setForm(f => ({ ...f, cout: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                  <TextInput label="Main d'œuvre (jours)" value={form.m_o} onChangeText={v => setForm(f => ({ ...f, m_o: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeModifItem} onDismiss={() => setDemandeModifItem(null)}>
          <Dialog.Title>Demande de modification</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.5 }}>
              <TextInput label="Motif *" value={demandeForm.motif} onChangeText={v => setDemandeForm(f => ({ ...f, motif: v }))} multiline maxLength={200} style={{ marginBottom: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Type</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Type" value={demandeForm.type}
                  onChange={v => setDemandeForm(f => ({ ...f, type: v, nom: '', cout: '', quantite: '', cout_unitaire: '' }))}
                  options={TYPES.map(t => ({ value: t, label: t }))} />
              </View>

              {demandeForm.type === 'Fertilisation' ? (
                <>
                  <Text variant="labelMedium" style={{ marginBottom: 4 }}>Produit</Text>
                  <View style={{ marginBottom: 12 }}>
                    <SelectFilter noAll label="Choisir un produit" value={demandeForm.nom}
                      onChange={v => setDemandeForm(f => ({ ...f, nom: v }))}
                      options={PRODUITS_FERTILISATION.map(p => ({ value: p, label: p }))} />
                  </View>
                </>
              ) : (
                <TextInput label="Nom" value={demandeForm.nom} onChangeText={v => setDemandeForm(f => ({ ...f, nom: v }))} maxLength={50} style={{ marginBottom: 12 }} />
              )}

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Statut</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Statut" value={demandeForm.statut}
                  onChange={v => setDemandeForm(f => ({ ...f, statut: v }))}
                  options={[{ value: 'planifie', label: 'Planifié' }, { value: 'actif', label: 'En cours' }, { value: 'termine', label: 'Terminé' }]} />
              </View>

              <DatePickerInput label="Date" value={demandeForm.date} onChange={v => setDemandeForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />

              {demandeForm.type === 'Fertilisation' ? (
                <>
                  <TextInput label="Quantité" value={demandeForm.quantite} onChangeText={v => setDemandeForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                  <TextInput label="Coût unitaire (DT)" value={demandeForm.cout_unitaire} onChangeText={v => setDemandeForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
                  {demandeForm.quantite !== '' && demandeForm.cout_unitaire !== '' && (
                    <Text variant="bodySmall" style={{ color: '#13c2c2', marginBottom: 12, fontStyle: 'italic' }}>
                      Coût total : {(parseFloat(demandeForm.quantite) || 0) * (parseFloat(demandeForm.cout_unitaire) || 0)} DT
                    </Text>
                  )}
                  <TextInput label="Main d'œuvre (jours)" value={demandeForm.m_o} onChangeText={v => setDemandeForm(f => ({ ...f, m_o: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                </>
              ) : (
                <>
                  <TextInput label="Coût (DT)" value={demandeForm.cout} onChangeText={v => setDemandeForm(f => ({ ...f, cout: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                  <TextInput label="Main d'œuvre (jours)" value={demandeForm.m_o} onChangeText={v => setDemandeForm(f => ({ ...f, m_o: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeModifItem(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeModif} loading={savingDemande}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeSupprItem} onDismiss={() => setDemandeSupprItem(null)}>
          <Dialog.Title>Demande de suppression</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Motif *" value={motifSuppr} onChangeText={setMotifSuppr} multiline maxLength={200} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeSupprItem(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeSuppr}>Envoyer</Button>
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
  th: { fontSize: 12, fontWeight: 'bold', color: '#2d7a4a', paddingRight: 8 },
  td: { fontSize: 12, color: '#333', paddingRight: 8 },
});
