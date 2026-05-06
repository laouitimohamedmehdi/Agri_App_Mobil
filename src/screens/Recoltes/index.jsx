import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Text, Divider, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import SelectFilter from '../../components/SelectFilter';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';

export default function Recoltes({ navigation }) {
  const { secteurs, parcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [recoltes, setRecoltes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ campagne: '', date: '', production: '', secteur_id: '', huile: '', prix: '', frais: '' });
  const [formParcelle, setFormParcelle] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [expandedCampagne, setExpandedCampagne] = useState(null);
  const [demandeSupprItem, setDemandeSupprItem] = useState(null);
  const [demandeModifItem, setDemandeModifItem] = useState(null);
  const [motifSuppr, setMotifSuppr] = useState('');
  const [demandeForm, setDemandeForm] = useState({ campagne: '', production: '', secteur_id: '', motif: '' });
  const [savingDemande, setSavingDemande] = useState(false);
  const [snack, setSnack] = useState('');
  const [filterCampagne, setFilterCampagne] = useState('');
  const [filterParcelle, setFilterParcelle] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r, a] = await Promise.all([
        client.get('/recoltes/'),
        client.get('/recolte-analyse/').catch(() => ({ data: [] })),
      ]);
      setRecoltes(r.data);
      setAnalyses(a.data);
    } catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const getSecteurNom = (id) => secteurs.find(s => s.id_secteur === id)?.nom || '-';
  const getAnalyse = (recolteId) => analyses.find(a => a.recolte_id === recolteId);

  const secteursOfParcelle = filterParcelle
    ? secteurs.filter(s => String(s.parcelle_id) === filterParcelle)
    : secteurs;

  const recoltesFiltered = recoltes.filter(r => {
    if (filterCampagne && r.campagne !== filterCampagne) return false;
    if (filterParcelle) {
      const sec = secteurs.find(s => s.id_secteur === r.secteur_id);
      if (!sec || String(sec.parcelle_id) !== filterParcelle) return false;
    }
    if (filterSecteur && String(r.secteur_id) !== filterSecteur) return false;
    return true;
  });
  const campagnes = [...new Set(recoltes.map(r => r.campagne).filter(Boolean))];
  const byCampagne = recoltesFiltered.reduce((acc, r) => {
    const key = r.campagne || 'Sans campagne';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const campagneStats = (items) => {
    const production = items.reduce((s, r) => s + (r.production || 0), 0);
    const huile = items.reduce((s, r) => s + (getAnalyse(r.id_recolte)?.huile || 0), 0);
    const revenu = items.reduce((s, r) => { const a = getAnalyse(r.id_recolte); return s + ((a?.huile || 0) * (a?.prix || 0)); }, 0);
    const frais = items.reduce((s, r) => s + (getAnalyse(r.id_recolte)?.frais || 0), 0);
    return { production, huile, revenu, frais, marge: revenu - frais };
  };

  const openCreate = () => { setEditing(null); setFormParcelle(''); setForm({ campagne: '', date: '', production: '', secteur_id: '', huile: '', prix: '', frais: '' }); setDialogVisible(true); };
  const openEdit = (r) => {
    const a = getAnalyse(r.id_recolte);
    setEditing(r);
    setFormParcelle('');
    setForm({ campagne: r.campagne, date: r.date ?? '', production: String(r.production ?? ''), secteur_id: String(r.secteur_id ?? ''), huile: String(a?.huile ?? ''), prix: String(a?.prix ?? ''), frais: String(a?.frais ?? '') });
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
      const analysePayload = { huile: parseFloat(form.huile) || 0, prix: parseFloat(form.prix) || 0, frais: parseFloat(form.frais) || 0, recolte_id: recolteId };
      const existingAnalyse = getAnalyse(recolteId);
      if (existingAnalyse) await client.put(`/recolte-analyse/${existingAnalyse.id}`, analysePayload);
      else await client.post('/recolte-analyse/', analysePayload);
      await fetchAll(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/recoltes/${confirmId}`); await fetchAll(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  const openDemandeModif = (r) => {
    setDemandeModifItem(r);
    setDemandeForm({ campagne: r.campagne, production: String(r.production ?? ''), secteur_id: String(r.secteur_id ?? ''), motif: '' });
  };

  const envoyerDemandeModif = async () => {
    setSavingDemande(true);
    try {
      const { motif: m, ...data } = demandeForm;
      await soumettreDemande({ type_action: 'modification', entity_type: 'recolte', entity_id: demandeModifItem.id_recolte, motif: m, nouvelles_donnees: { campagne: data.campagne, production: parseFloat(data.production) || 0, secteur_id: parseInt(data.secteur_id) || null } });
      setSnack('Demande de modification envoyée');
      setDemandeModifItem(null);
    } catch { setSnack("Erreur lors de l'envoi"); }
    finally { setSavingDemande(false); }
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'recolte', entity_id: demandeSupprItem.id_recolte, motif: motifSuppr });
      setSnack('Demande de suppression envoyée');
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
      {recoltes.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e0ece0', padding: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SelectFilter
              label="Campagne"
              value={filterCampagne}
              onChange={setFilterCampagne}
              options={campagnes.map(c => ({ value: c, label: c }))}
            />
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
          </ScrollView>
        </View>
      )}
      {recoltesFiltered.length === 0 && recoltes.length > 0 ? <EmptyState message="Aucune récolte pour ces filtres" /> : recoltes.length === 0 ? <EmptyState message="Aucune récolte enregistrée" /> : (
        <ScrollView style={{ backgroundColor: '#f0f4f0' }}>
          {Object.entries(byCampagne).map(([campagne, items]) => {
            const stats = campagneStats(items);
            return (
              <List.Accordion
                key={campagne}
                title={campagne}
                description={isAdmin
                  ? `${stats.production.toLocaleString()} kg • Marge : ${stats.marge.toFixed(0)} DT`
                  : `${stats.production.toLocaleString()} kg`}
                expanded={expandedCampagne === campagne}
                onPress={() => setExpandedCampagne(expandedCampagne === campagne ? null : campagne)}
                left={props => <List.Icon {...props} icon="basket" />}
                style={{ backgroundColor: '#f6faf3', marginBottom: 8, borderRadius: 8 }}
                titleStyle={{ color: '#2d7a4a', fontWeight: 'bold' }}
              >
                {isAdmin && (
                  <View style={styles.financeRow}>
                    <StatBadge label="Production" value={`${stats.production.toLocaleString()} kg`} />
                    <StatBadge label="Huile" value={`${stats.huile.toLocaleString()} L`} />
                    <StatBadge label="Revenu brut" value={`${stats.revenu.toFixed(0)} DT`} />
                    <StatBadge label="Frais" value={`${stats.frais.toFixed(0)} DT`} color="#c0392b" />
                    <StatBadge label="Marge nette" value={`${stats.marge.toFixed(0)} DT`} color={stats.marge >= 0 ? '#2d7a4a' : '#c0392b'} />
                  </View>
                )}
                {!isAdmin && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#e8f5e9' }}>
                    <MaterialCommunityIcons name="basket-outline" size={18} color="#2d7a4a" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#2d7a4a' }}>
                      {stats.production.toLocaleString()} kg
                    </Text>
                    <Text style={{ fontSize: 12, color: '#888' }}>production totale · {items.length} secteur(s)</Text>
                  </View>
                )}
                <Divider />
                {items.map(r => {
                  const a = getAnalyse(r.id_recolte);
                  return (
                    <View key={r.id_recolte} style={[styles.recolteRow, { borderLeftWidth: 3, borderLeftColor: '#2d7a4a' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>{getSecteurNom(r.secteur_id)}</Text>
                        <Text style={{ fontSize: 13, color: '#2d7a4a', fontWeight: '600', marginTop: 2 }}>
                          {r.production?.toLocaleString()} kg
                        </Text>
                        {r.date && <Text style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{r.date}</Text>}
                        {isAdmin && a && (
                          <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                            Huile : {a.huile} L  ·  Prix : {a.prix} DT/L
                          </Text>
                        )}
                      </View>
                      {isAdmin ? (
                        <View style={{ flexDirection: 'row' }}>
                          <Button icon="pencil" compact onPress={() => openEdit(r)} textColor="#1677ff" />
                          <Button icon="delete" compact onPress={() => setConfirmId(r.id_recolte)} textColor="#ff4d4f" />
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <TouchableOpacity style={{ padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#1677ff' }} onPress={() => openDemandeModif(r)}>
                            <MaterialCommunityIcons name="pencil-outline" size={18} color="#1677ff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={{ padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ff4d4f' }} onPress={() => { setDemandeSupprItem(r); setMotifSuppr(''); }}>
                            <MaterialCommunityIcons name="delete-outline" size={18} color="#ff4d4f" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </List.Accordion>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreate} />}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} une récolte</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput label="Campagne (ex: 25/26)" value={form.campagne} onChangeText={v => setForm(f => ({ ...f, campagne: v }))} style={{ marginBottom: 12 }} />

              <TextInput label="Date (YYYY-MM-DD)" value={form.date ?? ''} onChangeText={v => setForm(f => ({ ...f, date: v }))} style={{ marginBottom: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Parcelle *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll
                  label="Choisir une parcelle"
                  value={formParcelle}
                  onChange={v => { setFormParcelle(v); setForm(f => ({ ...f, secteur_id: '' })); }}
                  options={parcelles.map(p => ({ value: String(p.id_parcelle), label: p.nom }))}
                />
              </View>

              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Secteur *</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll
                  label="Choisir un secteur"
                  value={form.secteur_id}
                  onChange={v => setForm(f => ({ ...f, secteur_id: v }))}
                  options={secteursForForm.map(s => ({ value: String(s.id_secteur), label: s.nom }))}
                />
              </View>

              <TextInput label="Production (kg)" value={form.production} onChangeText={v => setForm(f => ({ ...f, production: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />

              <Divider style={{ marginBottom: 12 }} />
              <Text variant="labelMedium" style={{ marginBottom: 8 }}>Analyse</Text>
              <TextInput label="Huile (L)" value={form.huile} onChangeText={v => setForm(f => ({ ...f, huile: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
              <TextInput label="Prix (DT/L)" value={form.prix} onChangeText={v => setForm(f => ({ ...f, prix: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
              <TextInput label="Frais de traitement (DT)" value={form.frais} onChangeText={v => setForm(f => ({ ...f, frais: v }))} keyboardType="numeric" />
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
            <TextInput label="Motif *" value={demandeForm.motif} onChangeText={v => setDemandeForm(f => ({ ...f, motif: v }))} multiline style={{ marginBottom: 12 }} />
            <TextInput label="Campagne" value={demandeForm.campagne} onChangeText={v => setDemandeForm(f => ({ ...f, campagne: v }))} style={{ marginBottom: 12 }} />
            <TextInput label="Production (kg)" value={demandeForm.production} onChangeText={v => setDemandeForm(f => ({ ...f, production: v }))} keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeModifItem(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeModif} loading={savingDemande}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeSupprItem} onDismiss={() => setDemandeSupprItem(null)}>
          <Dialog.Title>Demande de suppression</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Motif *" value={motifSuppr} onChangeText={setMotifSuppr} multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeSupprItem(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeSuppr}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cette récolte et son analyse ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

function StatBadge({ label, value, color = '#2d7a4a' }) {
  return (
    <View style={{ alignItems: 'center', padding: 4 }}>
      <Text variant="titleSmall" style={{ color, fontWeight: 'bold' }}>{value}</Text>
      <Text variant="bodySmall" style={{ color: '#666' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  financeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', padding: 8, backgroundColor: '#e8f5e9' },
  recolteRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
