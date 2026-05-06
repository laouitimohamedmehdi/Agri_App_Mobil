import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Text, Divider, Snackbar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';

export default function Recoltes({ navigation }) {
  const { secteurs } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [recoltes, setRecoltes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ campagne: '', production: '', secteur_id: '', huile: '', prix: '', frais: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [expandedCampagne, setExpandedCampagne] = useState(null);
  const [demandeItem, setDemandeItem] = useState(null);
  const [motif, setMotif] = useState('');
  const [snack, setSnack] = useState('');

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

  const byCampagne = recoltes.reduce((acc, r) => {
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

  const openCreate = () => { setEditing(null); setForm({ campagne: '', production: '', secteur_id: '', huile: '', prix: '', frais: '' }); setDialogVisible(true); };
  const openEdit = (r) => {
    const a = getAnalyse(r.id_recolte);
    setEditing(r);
    setForm({ campagne: r.campagne, production: String(r.production ?? ''), secteur_id: String(r.secteur_id ?? ''), huile: String(a?.huile ?? ''), prix: String(a?.prix ?? ''), frais: String(a?.frais ?? '') });
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { campagne: form.campagne, production: parseFloat(form.production) || 0, secteur_id: parseInt(form.secteur_id) || null };
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

  const envoyerDemande = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'recolte', entity_id: demandeItem.id_recolte, motif });
      setSnack('Demande envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeItem(null); setMotif('');
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title="Récoltes" navigation={navigation} />
      {recoltes.length === 0 ? <EmptyState message="Aucune récolte enregistrée" /> : (
        <ScrollView style={{ backgroundColor: '#f0f4f0' }}>
          {Object.entries(byCampagne).map(([campagne, items]) => {
            const stats = campagneStats(items);
            return (
              <List.Accordion
                key={campagne}
                title={campagne}
                description={`${stats.production.toLocaleString()} kg • Marge : ${stats.marge.toFixed(0)} DH`}
                expanded={expandedCampagne === campagne}
                onPress={() => setExpandedCampagne(expandedCampagne === campagne ? null : campagne)}
                left={props => <List.Icon {...props} icon="basket" />}
                style={{ backgroundColor: '#f6faf3', marginBottom: 8, borderRadius: 8 }}
                titleStyle={{ color: '#2d7a4a', fontWeight: 'bold' }}
              >
                <View style={styles.financeRow}>
                  <StatBadge label="Production" value={`${stats.production.toLocaleString()} kg`} />
                  <StatBadge label="Huile" value={`${stats.huile.toLocaleString()} L`} />
                  <StatBadge label="Revenu brut" value={`${stats.revenu.toFixed(0)} DH`} />
                  <StatBadge label="Frais" value={`${stats.frais.toFixed(0)} DH`} color="#c0392b" />
                  <StatBadge label="Marge nette" value={`${stats.marge.toFixed(0)} DH`} color={stats.marge >= 0 ? '#2d7a4a' : '#c0392b'} />
                </View>
                <Divider />
                {items.map(r => {
                  const a = getAnalyse(r.id_recolte);
                  return (
                    <View key={r.id_recolte} style={styles.recolteRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">{getSecteurNom(r.secteur_id)}</Text>
                        <Text variant="bodySmall" style={{ color: '#666' }}>
                          {r.production?.toLocaleString()} kg
                          {a ? ` • Huile : ${a.huile} L • Prix : ${a.prix} DH/L` : ''}
                        </Text>
                      </View>
                      {isAdmin ? (
                        <View style={{ flexDirection: 'row' }}>
                          <Button icon="pencil" compact onPress={() => openEdit(r)} />
                          <Button icon="delete" compact onPress={() => setConfirmId(r.id_recolte)} />
                        </View>
                      ) : (
                        <Button compact icon="file-send" onPress={() => { setDemandeItem(r); setMotif(''); }}>
                          Demande
                        </Button>
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
            <TextInput label="Campagne (ex: 24/25)" value={form.campagne} onChangeText={v => setForm(f => ({ ...f, campagne: v }))} style={{ marginBottom: 8 }} />
            <TextInput label="Production (kg)" value={form.production} onChangeText={v => setForm(f => ({ ...f, production: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Secteur</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {secteurs.map(s => (
                <Chip key={s.id_secteur} selected={form.secteur_id === String(s.id_secteur)} onPress={() => setForm(f => ({ ...f, secteur_id: String(s.id_secteur) }))} style={{ marginRight: 6 }}>{s.nom}</Chip>
              ))}
            </ScrollView>
            <Divider style={{ marginVertical: 8 }} />
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>Analyse</Text>
            <TextInput label="Huile (L)" value={form.huile} onChangeText={v => setForm(f => ({ ...f, huile: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Prix (DH/L)" value={form.prix} onChangeText={v => setForm(f => ({ ...f, prix: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} />
            <TextInput label="Frais de traitement (DH)" value={form.frais} onChangeText={v => setForm(f => ({ ...f, frais: v }))} keyboardType="numeric" />
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
