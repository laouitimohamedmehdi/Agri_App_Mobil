import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Snackbar, Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import { soumettreDemande } from '../../utils/demandeHelper';

export default function Varietes({ navigation }) {
  const { varietes, refreshVarietes } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [demandeId, setDemandeId] = useState(null);
  const [motif, setMotif] = useState('');
  const [snack, setSnack] = useState('');

  const openCreate = () => { setEditing(null); setForm({ nom: '' }); setDialogVisible(true); };
  const openEdit = (v) => { setEditing(v); setForm({ nom: v.nom }); setDialogVisible(true); };

  const save = async () => {
    if (!form.nom.trim()) { setSnack('Le nom est requis'); return; }
    setSaving(true);
    try {
      if (editing) await client.put(`/varietes/${editing.id_variete}`, { nom: form.nom });
      else await client.post('/varietes/', { nom: form.nom });
      await refreshVarietes(); setDialogVisible(false);
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await client.delete(`/varietes/${confirmId}`); await refreshVarietes(); }
    catch { setSnack('Erreur lors de la suppression'); }
    setConfirmId(null);
  };

  const envoyerDemandeSuppr = async () => {
    try {
      await soumettreDemande({ type_action: 'suppression', entity_type: 'variete', entity_id: demandeId, motif });
      setSnack('Demande envoyée');
    } catch { setSnack("Erreur lors de l'envoi"); }
    setDemandeId(null); setMotif('');
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Variétés" navigation={navigation} />
      <ScrollView style={styles.container}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="leaf" size={18} color="#2d7a4a" style={{ marginRight: 6 }} />
          <Text variant="titleSmall" style={styles.sectionTitle}>Liste des variétés ({varietes.length})</Text>
        </View>
        {varietes.length === 0 ? <EmptyState message="Aucune variété enregistrée" /> : (
          <Card style={{ elevation: 2, overflow: 'hidden' }}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Nom de la variété</Text>
              <Text style={[styles.th, { width: 120 }]}>Actions</Text>
            </View>
            {/* Rows */}
            {varietes.map((v, i) => (
              <View key={v.id_variete} style={[styles.tableRow, i % 2 !== 0 && styles.tableRowAlt]}>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.dot} />
                  <Text style={styles.td}>{v.nom}</Text>
                </View>
                <View style={{ width: 120, flexDirection: 'row' }}>
                  {isAdmin ? (
                    <>
                      <Button icon="pencil" compact onPress={() => openEdit(v)} textColor="#1677ff" />
                      <Button icon="delete" compact onPress={() => setConfirmId(v.id_variete)} textColor="#ff4d4f" />
                    </>
                  ) : (
                    <Button compact icon="file-send" onPress={() => { setDemandeId(v.id_variete); setMotif(''); }} textColor="#fa8c16">
                      Demander
                    </Button>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
      <FAB icon="plus" style={styles.fab} onPress={openCreate} />
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? 'Modifier' : 'Ajouter'} une variété</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Nom" value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Annuler</Button>
            <Button onPress={save} loading={saving}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={!!demandeId} onDismiss={() => setDemandeId(null)}>
          <Dialog.Title>Demander la suppression</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Motif" value={motif} onChangeText={setMotif} multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDemandeId(null)}>Annuler</Button>
            <Button onPress={envoyerDemandeSuppr}>Envoyer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog visible={!!confirmId} title="Supprimer" message="Supprimer cette variété ?" onConfirm={confirmDelete} onDismiss={() => setConfirmId(null)} confirmLabel="Supprimer" />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f0' },
  container: { flex: 1, padding: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  sectionTitle: { color: '#2d7a4a', fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8f5e9', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderColor: '#2d7a4a' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e0ece0' },
  tableRowAlt: { backgroundColor: '#f0f7f0' },
  th: { fontSize: 12, fontWeight: 'bold', color: '#2d7a4a' },
  td: { fontSize: 12, color: '#333' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2d7a4a' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
