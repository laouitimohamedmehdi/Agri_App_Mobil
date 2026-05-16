import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
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
import DatePickerInput from '../../components/DatePickerInput';

const SCREEN_H = Dimensions.get('window').height;

export default function Fertilisation({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
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
  const [demandeSupprItem, setDemandeSupprItem] = useState(null);
  const [demandeModifItem, setDemandeModifItem] = useState(null);
  const [motifSuppr, setMotifSuppr] = useState('');
  const [demandeForm, setDemandeForm] = useState({ produit: '', quantite: '', cout_unitaire: '', date: '', secteur_id: '', motif: '' });
  const [savingDemande, setSavingDemande] = useState(false);
  const [formParcelle, setFormParcelle] = useState('');
  const [snack, setSnack] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    client.get('/fertilisation/', { signal: controller.signal })
      .then(res => setItems(res.data))
      .catch(e => { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError' && e?.name !== 'CanceledError') setSnack(t('mobile.error_load')); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const fetchData = async () => {
    try { const res = await client.get('/fertilisation/'); setItems(res.data); }
    catch (e) { if (e?.code !== 'ERR_CANCELED' && e?.name !== 'AbortError') setSnack(t('mobile.error_load')); }
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

  const openCreate = () => { setEditing(null); setFormParcelle(''); setForm({ produit: '', quantite: '', cout_unitaire: '', date: '', secteur_id: '' }); setDialogVisible(true); };
  const openEdit = (item) => {
    setEditing(item);
    setFormParcelle('');
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

  const openDemandeModif = (item) => {
    setDemandeModifItem(item);
    setDemandeForm({ produit: item.produit, quantite: String(item.quantite ?? ''), cout_unitaire: String(item.cout_unitaire ?? ''), date: item.date ?? '', secteur_id: String(item.secteur_id ?? ''), motif: '' });
  };

  const envoyerDemandeModif = async () => {
    setSavingDemande(true);
    try {
      const { motif: m, ...data } = demandeForm;
      await soumettreDemande({ type_action: 'modification', entity_type: 'fertilisation', entity_id: demandeModifItem.id_fertilisation, motif: m, nouvelles_donnees: { produit: data.produit, quantite: parseFloat(data.quantite) || 0, cout_unitaire: parseFloat(data.cout_unitaire) || 0, date: data.date, secteur_id: parseInt(data.secteur_id) || null } });
      setSnack('Demande de modification envoyée');
      setDemandeModifItem(null);
    } catch { setSnack("Erreur lors de l'envoi"); }
    finally { setSavingDemande(false); }
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'fertilisation', entity_id: demandeSupprItem.id_fertilisation, motif: motifSuppr });
      setSnack('Demande de suppression envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeSupprItem(null); setMotifSuppr('');
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
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e8f5e9' }}>
        <MaterialCommunityIcons name="sprout" size={16} color="#2d7a4a" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
        <Text variant="bodySmall" style={{ color: '#2d7a4a', fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{filtered.length} fertilisation(s)</Text>
      </View>
      {filtered.length === 0 ? <EmptyState message="Aucune fertilisation" /> : (
        <ScrollView horizontal style={{ flex: 1 }} showsHorizontalScrollIndicator={false}>
          <View style={{ width: 640 }}>
            {/* Header */}
            <View style={[styles.tableHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.th, { width: 130, textAlign: isRTL ? 'right' : 'left' }]}>Produit</Text>
              <Text style={[styles.th, { width: 90, textAlign: isRTL ? 'right' : 'left' }]}>Parcelle</Text>
              <Text style={[styles.th, { width: 90, textAlign: isRTL ? 'right' : 'left' }]}>Secteur</Text>
              <Text style={[styles.th, { width: 60, textAlign: isRTL ? 'left' : 'right' }]}>Qté</Text>
              <Text style={[styles.th, { width: 75, textAlign: isRTL ? 'left' : 'right' }]}>Coût/u</Text>
              <Text style={[styles.th, { width: 90, textAlign: isRTL ? 'right' : 'left' }]}>Date</Text>
              <Text style={[styles.th, { width: 105, textAlign: isRTL ? 'right' : 'left' }]}>Actions</Text>
            </View>
            {/* Rows */}
            {filtered.map((item, idx) => (
              <View key={item.id_fertilisation} style={[styles.tableRow, idx % 2 !== 0 && styles.tableRowAlt, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.td, { width: 130, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{item.produit}</Text>
                <Text style={[styles.td, { width: 90, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{getParcelleNom(item.secteur_id)}</Text>
                <Text style={[styles.td, { width: 90, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{getSecteurNom(item.secteur_id)}</Text>
                <Text style={[styles.td, { width: 60, textAlign: isRTL ? 'left' : 'right' }]}>{item.quantite}</Text>
                <Text style={[styles.td, { width: 75, textAlign: isRTL ? 'left' : 'right' }]}>{item.cout_unitaire} DT</Text>
                <Text style={[styles.td, { width: 90, textAlign: isRTL ? 'right' : 'left' }]}>{item.date}</Text>
                <View style={{ width: 105, justifyContent: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  {isAdmin ? (
                    <>
                      <Button icon="pencil" compact onPress={() => openEdit(item)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => setConfirmId(item.id_fertilisation)} textColor="#ff4d4f" />
                    </>
                  ) : (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <Button icon="pencil" compact onPress={() => openDemandeModif(item)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => { setDemandeSupprItem(item); setMotifSuppr(''); }} textColor="#ff4d4f" />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} fertilisation</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              {(() => {
                const secteursForForm = formParcelle
                  ? secteurs.filter(s => String(s.parcelle_id) === formParcelle)
                  : secteurs;
                return (
                  <>
                    <Text variant="labelMedium" style={{ marginBottom: 4 }}>Produit *</Text>
                    <View style={{ marginBottom: 12 }}>
                      <SelectFilter noAll
                        label="Choisir un produit"
                        value={form.produit}
                        onChange={v => setForm(f => ({ ...f, produit: v }))}
                        options={[
                          { value: 'Fumier de ferme', label: 'Fumier de ferme' },
                          { value: 'D.A.P', label: 'D.A.P' },
                          { value: 'Super 45', label: 'Super 45' },
                          { value: 'Urée', label: 'Urée' },
                          { value: 'NPK', label: 'NPK' },
                          { value: 'Compost', label: 'Compost' },
                          { value: 'Autre', label: 'Autre' },
                        ]}
                      />
                    </View>

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

                    <TextInput label="Quantité (kg)" value={form.quantite} onChangeText={v => setForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                    <TextInput label="Coût unitaire (DT/kg)" value={form.cout_unitaire} onChangeText={v => setForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
                    <DatePickerInput label="Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
                  </>
                );
              })()}
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
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              <TextInput label="Motif *" value={demandeForm.motif} onChangeText={v => setDemandeForm(f => ({ ...f, motif: v }))} multiline maxLength={200} style={{ marginBottom: 12 }} />
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>Produit</Text>
              <View style={{ marginBottom: 12 }}>
                <SelectFilter noAll label="Produit" value={demandeForm.produit} onChange={v => setDemandeForm(f => ({ ...f, produit: v }))} options={[{ value: 'Fumier de ferme', label: 'Fumier de ferme' }, { value: 'D.A.P', label: 'D.A.P' }, { value: 'Super 45', label: 'Super 45' }, { value: 'Urée', label: 'Urée' }, { value: 'NPK', label: 'NPK' }, { value: 'Compost', label: 'Compost' }, { value: 'Autre', label: 'Autre' }]} />
              </View>
              <TextInput label="Quantité (kg)" value={demandeForm.quantite} onChangeText={v => setDemandeForm(f => ({ ...f, quantite: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
              <TextInput label="Coût unitaire (DT/kg)" value={demandeForm.cout_unitaire} onChangeText={v => setDemandeForm(f => ({ ...f, cout_unitaire: v }))} keyboardType="numeric" style={{ marginBottom: 12 }} />
              <DatePickerInput label="Date" value={demandeForm.date} onChange={v => setDemandeForm(f => ({ ...f, date: v }))} />
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
