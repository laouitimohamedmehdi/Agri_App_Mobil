import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Text, Divider, Snackbar, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import SelectFilter from '../../components/SelectFilter';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';
import DatePickerInput from '../../components/DatePickerInput';

const SCREEN_H = Dimensions.get('window').height;
const TYPES_FRAIS = ['Récolte', 'Transport', "Main d'œuvre", 'Trituration', 'Emballage', 'Autre'];

export default function Recoltes({ navigation }) {
  const { secteurs, parcelles } = useData();
  const { user } = useAuth();
  const { currencySymbol } = useSettings();
  const isAdmin = user?.role === 'admin';

  const [recoltes, setRecoltes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterCampagne, setFilterCampagne] = useState('');
  const [filterLieu, setFilterLieu] = useState('');

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ campagne: '', date: '', production: '', secteur_id: '', huile: '', prix: '' });
  const [formParcelle, setFormParcelle] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmId, setConfirmId] = useState(null);
  const [demandeSupprItem, setDemandeSupprItem] = useState(null);
  const [demandeModifItem, setDemandeModifItem] = useState(null);
  const [motifSuppr, setMotifSuppr] = useState('');
  const [demandeForm, setDemandeForm] = useState({ campagne: '', production: '', secteur_id: '', motif: '' });
  const [savingDemande, setSavingDemande] = useState(false);

  const [addingChargeFor, setAddingChargeFor] = useState(null);
  const [chargeForm, setChargeForm] = useState({ type_frais: TYPES_FRAIS[0], montant: '' });
  const [savingCharge, setSavingCharge] = useState(false);
  const [confirmChargeId, setConfirmChargeId] = useState(null);

  const [snack, setSnack] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r, a, c] = await Promise.all([
        client.get('/recoltes/'),
        client.get('/recolte-analyse/').catch(() => ({ data: [] })),
        client.get('/recolte-charges/').catch(() => ({ data: [] })),
      ]);
      setRecoltes(r.data);
      setAnalyses(a.data);
      setCharges(c.data);
    } catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const getAnalyse = (id) => analyses.find(a => a.recolte_id === id);
  const getCharges = (id) => charges.filter(c => c.recolte_id === id);
  const getSecteurNom = (id) => secteurs.find(s => s.id_secteur === id)?.nom || '—';
  const getParcelleNom = (secteurId) => {
    const sec = secteurs.find(s => s.id_secteur === secteurId);
    return parcelles.find(p => p.id_parcelle === sec?.parcelle_id)?.nom || '—';
  };

  const lieuOptions = secteurs.map(s => ({
    value: String(s.id_secteur),
    label: `${parcelles.find(p => p.id_parcelle === s.parcelle_id)?.nom || '—'} — ${s.nom}`,
  }));

  const campagnes = [...new Set(recoltes.map(r => r.campagne).filter(Boolean))].sort().reverse();

  const filtered = recoltes
    .filter(r => {
      if (filterCampagne && r.campagne !== filterCampagne) return false;
      if (filterLieu && String(r.secteur_id) !== filterLieu) return false;
      return true;
    })
    .sort((a, b) => (b.campagne || '').localeCompare(a.campagne || '') || (b.date || '').localeCompare(a.date || ''));

  const openCreate = () => {
    setEditing(null);
    setFormParcelle('');
    setForm({ campagne: '', date: '', production: '', secteur_id: '', huile: '', prix: '' });
    setDialogVisible(true);
  };

  const openEdit = (r) => {
    const a = getAnalyse(r.id_recolte);
    setEditing(r);
    setFormParcelle('');
    setForm({
      campagne: r.campagne || '',
      date: r.date ?? '',
      production: String(r.production ?? ''),
      secteur_id: String(r.secteur_id ?? ''),
      huile: String(a?.huile ?? ''),
      prix: String(a?.prix ?? ''),
    });
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { campagne: form.campagne, date: form.date || null, production: parseFloat(form.production) || 0, secteur_id: parseInt(form.secteur_id) || null };
      let recolteId;
      if (editing) {
        await client.put(`/recoltes/${editing.id_recolte}`, payload);
        recolteId = editing.id_recolte;
      } else {
        const res = await client.post('/recoltes/', payload);
        recolteId = res.data.id_recolte;
      }
      if (isAdmin) {
        const analysePayload = { huile: parseFloat(form.huile) || 0, prix: parseFloat(form.prix) || 0, frais: 0, recolte_id: recolteId };
        const existing = getAnalyse(recolteId);
        if (existing) await client.put(`/recolte-analyse/${existing.id_rec_analy ?? existing.id}`, analysePayload);
        else await client.post('/recolte-analyse/', analysePayload);
      }
      await fetchAll();
      setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try {
      const a = getAnalyse(confirmId);
      if (a) await client.delete(`/recolte-analyse/${a.id_rec_analy ?? a.id}`).catch(() => {});
      await client.delete(`/recoltes/${confirmId}`);
      await fetchAll();
    } catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  const addCharge = async () => {
    const montant = parseFloat(chargeForm.montant);
    if (!montant || montant <= 0) { setSnack('Montant invalide'); return; }
    setSavingCharge(true);
    try {
      await client.post('/recolte-charges/', { recolte_id: addingChargeFor, type_frais: chargeForm.type_frais, montant });
      await fetchAll();
      setChargeForm({ type_frais: TYPES_FRAIS[0], montant: '' });
      setAddingChargeFor(null);
    } catch { setSnack('Erreur lors de l\'ajout'); }
    finally { setSavingCharge(false); }
  };

  const deleteCharge = async () => {
    try {
      await client.delete(`/recolte-charges/${confirmChargeId}`);
      await fetchAll();
    } catch { setSnack('Erreur lors de la suppression'); }
    setConfirmChargeId(null);
  };

  const envoyerDemandeModif = async () => {
    setSavingDemande(true);
    try {
      const { motif: m, ...data } = demandeForm;
      await soumettreDemande({ type_action: 'modification', entity_type: 'recolte', entity_id: demandeModifItem.id_recolte, motif: m, nouvelles_donnees: { campagne: data.campagne, production: parseFloat(data.production) || 0, secteur_id: parseInt(data.secteur_id) || null } });
      setSnack('Demande envoyée');
      setDemandeModifItem(null);
    } catch { setSnack("Erreur lors de l'envoi"); }
    finally { setSavingDemande(false); }
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'recolte', entity_id: demandeSupprItem.id_recolte, motif: motifSuppr });
      setSnack('Demande envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeSupprItem(null); setMotifSuppr('');
  };

  const secteursForForm = formParcelle
    ? secteurs.filter(s => String(s.parcelle_id) === formParcelle)
    : secteurs;

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Récoltes" navigation={navigation} />

      {/* Filtres */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', padding: 8, flexDirection: 'row', gap: 8 }}>
        <SelectFilter label="Campagne" value={filterCampagne} onChange={setFilterCampagne}
          options={campagnes.map(c => ({ value: c, label: c }))} />
        <SelectFilter label="Lieu" value={filterLieu} onChange={setFilterLieu} options={lieuOptions} />
      </View>

      {/* Compteur */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="basket" size={16} color="#2d7a4a" style={{ marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold' }}>{filtered.length} récolte(s)</Text>
      </View>

      {filtered.length === 0 ? <EmptyState message="Aucune récolte" /> : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
          {filtered.map(r => {
            const a = getAnalyse(r.id_recolte);
            const rCharges = getCharges(r.id_recolte);
            const totalCharges = rCharges.reduce((s, c) => s + (c.montant || 0), 0);
            const revenu = (a?.huile || 0) * (a?.prix || 0);
            return (
              <Card key={r.id_recolte} style={{ margin: 8, elevation: 1 }}>
                <Card.Content style={{ paddingBottom: 4 }}>
                  {/* En-tête : campagne + date + lieu */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <Chip compact style={{ backgroundColor: '#e8f5e9' }} textStyle={{ color: '#2d7a4a', fontWeight: '700', fontSize: 11 }}>
                          {r.campagne || '—'}
                        </Chip>
                        {r.date && <Text variant="bodySmall" style={{ color: '#888' }}>{r.date}</Text>}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>
                        {getParcelleNom(r.secteur_id)} — {getSecteurNom(r.secteur_id)}
                      </Text>
                    </View>
                    {isAdmin ? (
                      <View style={{ flexDirection: 'row' }}>
                        <Button icon="pencil" compact contentStyle={{ margin: -4 }} onPress={() => openEdit(r)} textColor="#1677ff" />
                        <Button icon="delete" compact contentStyle={{ margin: -4 }} onPress={() => setConfirmId(r.id_recolte)} textColor="#ff4d4f" />
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row' }}>
                        <Button icon="pencil" compact contentStyle={{ margin: -4 }} onPress={() => { setDemandeModifItem(r); setDemandeForm({ campagne: r.campagne, production: String(r.production ?? ''), secteur_id: String(r.secteur_id ?? ''), motif: '' }); }} textColor="#1677ff" />
                        <Button icon="delete" compact contentStyle={{ margin: -4 }} onPress={() => { setDemandeSupprItem(r); setMotifSuppr(''); }} textColor="#ff4d4f" />
                      </View>
                    )}
                  </View>

                  {/* Production */}
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#2d7a4a', marginBottom: 4 }}>
                    {r.production?.toLocaleString('fr-FR')} kg
                  </Text>

                  {/* Analyse (admin) */}
                  {isAdmin && a && (
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                      <Text variant="bodySmall" style={{ color: '#555' }}>Huile : <Text style={{ fontWeight: '600' }}>{a.huile?.toLocaleString('fr-FR')} L</Text></Text>
                      <Text variant="bodySmall" style={{ color: '#555' }}>Prix : <Text style={{ fontWeight: '600' }}>{a.prix} {currencySymbol}/L</Text></Text>
                      <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: '700' }}>Revenu : {revenu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currencySymbol}</Text>
                    </View>
                  )}

                  {/* Frais (admin) */}
                  {isAdmin && (
                    <>
                      <Divider style={{ marginVertical: 6 }} />
                      <Text variant="bodySmall" style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontSize: 10 }}>Frais de récolte</Text>
                      {rCharges.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                          {rCharges.map(c => (
                            <View key={c.id} style={styles.chargePill}>
                              <Text style={{ fontSize: 11, color: '#d46b08', fontWeight: '600' }}>{c.type_frais}</Text>
                              <Text style={{ fontSize: 11, color: '#555' }}> — {c.montant?.toLocaleString('fr-FR')} {currencySymbol}</Text>
                              <Button icon="close" compact contentStyle={{ margin: -8 }} onPress={() => setConfirmChargeId(c.id)} textColor="#ff4d4f" />
                            </View>
                          ))}
                        </View>
                      )}
                      {rCharges.length > 0 && (
                        <Text variant="bodySmall" style={{ color: '#ff4d4f', fontWeight: '600', marginBottom: 4 }}>
                          Total frais : {totalCharges.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currencySymbol}
                        </Text>
                      )}
                      {addingChargeFor === r.id_recolte ? (
                        <View style={{ marginTop: 4, gap: 8 }}>
                          <SelectFilter noAll label="Type de frais" value={chargeForm.type_frais}
                            onChange={v => setChargeForm(f => ({ ...f, type_frais: v }))}
                            options={TYPES_FRAIS.map(t => ({ value: t, label: t }))} />
                          <TextInput label={`Montant (${currencySymbol})`} value={chargeForm.montant}
                            onChangeText={v => setChargeForm(f => ({ ...f, montant: v }))}
                            keyboardType="numeric" dense style={{ marginTop: 4 }} />
                          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <Button onPress={() => setAddingChargeFor(null)} compact>Annuler</Button>
                            <Button mode="contained" onPress={addCharge} loading={savingCharge} compact buttonColor="#2d7a4a">Ajouter</Button>
                          </View>
                        </View>
                      ) : (
                        <Button icon="plus" compact onPress={() => { setAddingChargeFor(r.id_recolte); setChargeForm({ type_frais: TYPES_FRAIS[0], montant: '' }); }} textColor="#2d7a4a" style={{ alignSelf: 'flex-start' }}>
                          Ajouter un frais
                        </Button>
                      )}
                    </>
                  )}
                </Card.Content>
              </Card>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} />

      <Portal>
        {/* Dialog création/modification */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} une récolte</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.5 }}>
              <TextInput label="Campagne (ex: 25/26)" value={form.campagne} onChangeText={v => setForm(f => ({ ...f, campagne: v }))} maxLength={20} style={{ marginBottom: 12 }} />
              <DatePickerInput label="Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Parcelle</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Choisir une parcelle" value={formParcelle}
                  onChange={v => { setFormParcelle(v); setForm(f => ({ ...f, secteur_id: '' })); }}
                  options={parcelles.map(p => ({ value: String(p.id_parcelle), label: p.nom }))} />
              </View>

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Secteur *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Choisir un secteur" value={form.secteur_id}
                  onChange={v => setForm(f => ({ ...f, secteur_id: v }))}
                  options={secteursForForm.map(s => ({ value: String(s.id_secteur), label: s.nom }))} />
              </View>

              <TextInput label="Production (kg)" value={form.production} onChangeText={v => setForm(f => ({ ...f, production: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />

              {isAdmin && (
                <>
                  <Divider style={{ marginBottom: 12 }} />
                  <Text variant="labelMedium" style={{ marginBottom: 8 }}>Analyse</Text>
                  <TextInput label="Huile (L)" value={form.huile} onChangeText={v => setForm(f => ({ ...f, huile: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                  <TextInput label={`Prix (${currencySymbol}/L)`} value={form.prix} onChangeText={v => setForm(f => ({ ...f, prix: v }))} keyboardType="numeric" />
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog demande modification */}
        <Dialog visible={!!demandeModifItem} onDismiss={() => setDemandeModifItem(null)}>
          <Dialog.Title>Demande de modification</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Motif *" value={demandeForm.motif} onChangeText={v => setDemandeForm(f => ({ ...f, motif: v }))} multiline maxLength={200} style={{ marginBottom: 12 }} />
            <TextInput label="Campagne" value={demandeForm.campagne} onChangeText={v => setDemandeForm(f => ({ ...f, campagne: v }))} maxLength={20} style={{ marginBottom: 12 }} />
            <TextInput label="Production (kg)" value={demandeForm.production} onChangeText={v => setDemandeForm(f => ({ ...f, production: v }))} keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeModifItem(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeModif} loading={savingDemande}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Dialog demande suppression */}
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

      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cette récolte ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <ConfirmDialog visible={!!confirmChargeId} title="Supprimer le frais" message="Supprimer ce frais ?" onConfirm={deleteCharge} onDismiss={() => setConfirmChargeId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
  chargePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8f0e4', borderRadius: 16, paddingLeft: 10, paddingVertical: 2 },
});
