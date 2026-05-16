import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
const SCREEN_H = Dimensions.get('window').height;
import { List, FAB, Portal, Dialog, TextInput, Button, Text, Chip, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../components/AppHeader';
import SelectFilter from '../../components/SelectFilter';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';

const STATUT_COLORS = { actif: '#388e3c', jeune: '#1976d2', inactif: '#757575' };

export default function ParcellesSecteurs({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { secteurs, parcelles, varietes, refreshSecteurs, refreshParcelles } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dialogType, setDialogType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: '' });
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmType, setConfirmType] = useState(null);
  const [snack, setSnack] = useState('');
  const [expandedParcelle, setExpandedParcelle] = useState(null);
  const [filterParcelle, setFilterParcelle] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshSecteurs(), refreshParcelles()]);
    setRefreshing(false);
  };

  const secteursOfParcelle = (parcelleId) => secteurs.filter(s => s.parcelle_id === parcelleId);
  const getVarieteNom = (id) => varietes.find(v => v.id_variete === id)?.nom || '-';
  const tStatut = (s) => ({ actif: t('sectors.en_production'), jeune: t('sectors.jeune'), inactif: t('rh.status_inactive') }[s] || s);

  const openCreateSecteur = (parcelleId) => {
    setEditing(null);
    setForm({ nom: '', surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: String(parcelleId) });
    setDialogType('secteur');
  };
  const openEditSecteur = (s) => {
    setEditing(s);
    setForm({ nom: s.nom, surface: String(s.surface ?? ''), nb_arbre: String(s.nb_arbre ?? ''), age_moy: String(s.age_moy ?? ''), statut: s.statut || 'actif', variete_id: String(s.variete_id ?? ''), parcelle_id: String(s.parcelle_id ?? '') });
    setDialogType('secteur');
  };
  const openCreateParcelle = () => {
    setEditing(null);
    setForm({ nom: '', surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: '' });
    setDialogType('parcelle');
  };
  const openEditParcelle = (p) => {
    setEditing(p);
    setForm({ nom: p.nom, surface: '', nb_arbre: '', age_moy: '', statut: 'actif', variete_id: '', parcelle_id: '' });
    setDialogType('parcelle');
  };

  const save = async () => {
    setLoading(true);
    try {
      if (dialogType === 'parcelle') {
        const payload = { nom: form.nom };
        if (editing) await client.put(`/parcelles/${editing.id_parcelle}`, payload);
        else await client.post('/parcelles/', payload);
        await refreshParcelles();
      } else {
        const payload = { nom: form.nom, surface: parseFloat(form.surface) || 0, nb_arbre: parseInt(form.nb_arbre) || 0, age_moy: parseInt(form.age_moy) || 0, statut: form.statut, variete_id: parseInt(form.variete_id) || null, parcelle_id: parseInt(form.parcelle_id) || null };
        if (editing) await client.put(`/secteurs/${editing.id_secteur}`, payload);
        else await client.post('/secteurs/', payload);
        await refreshSecteurs();
      }
      setDialogType(null);
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
        setDialogType(null);
      } else {
        setSnack(t('mobile.error_save'));
      }
    }
    finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    try {
      if (confirmType === 'parcelle') { await client.delete(`/parcelles/${confirmId}`); await refreshParcelles(); await refreshSecteurs(); }
      else { await client.delete(`/secteurs/${confirmId}`); await refreshSecteurs(); }
    } catch (e) {
      if (e?.isQueued) {
        setSnack(t('mobile.offline_queued'));
      } else {
        setSnack(t('mobile.error_delete'));
      }
    }
    setConfirmId(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f0' }}>
      <AppHeader title={t('fields.page_title')} navigation={navigation} />

      {/* Filtres */}
      <View style={{ backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderColor: '#e0ece0', flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
        <SelectFilter
          label={t('mobile.plot')}
          value={filterParcelle}
          onChange={v => { setFilterParcelle(v); setFilterSecteur(''); }}
          options={parcelles.map(p => ({ value: String(p.id_parcelle), label: p.nom }))}
        />
        <SelectFilter
          label={t('mobile.sector')}
          value={filterSecteur}
          onChange={setFilterSecteur}
          options={secteurs
            .filter(s => !filterParcelle || String(s.parcelle_id) === filterParcelle)
            .map(s => ({ value: String(s.id_secteur), label: s.nom }))}
        />
      </View>

      <ScrollView style={{ backgroundColor: '#f0f4f0' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d7a4a']} />}>
        {parcelles.length === 0 && <EmptyState message={t('mobile.no_plot')} />}
        {parcelles
          .filter(p => !filterParcelle || String(p.id_parcelle) === filterParcelle)
          .map(p => (
            <View key={p.id_parcelle} style={{ backgroundColor: '#f6faf3' }}>
            <List.Accordion
              title={p.nom}
              description={`${t('fields.nb_sectors_col')}: ${secteursOfParcelle(p.id_parcelle).length}`}
              left={props => <List.Icon {...props} icon="map-marker-multiple" />}
              expanded={expandedParcelle === p.id_parcelle}
              onPress={() => setExpandedParcelle(expandedParcelle === p.id_parcelle ? null : p.id_parcelle)}
              titleStyle={{ color: '#2d7a4a', fontWeight: 'bold' }}
            >
              {isAdmin && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', padding: 8, gap: 8 }}>
                  <Button icon="pencil" mode="outlined" compact onPress={() => openEditParcelle(p)}>{t('fields.edit_field')}</Button>
                  <Button icon="delete" mode="outlined" compact textColor="#d32f2f" onPress={() => { setConfirmType('parcelle'); setConfirmId(p.id_parcelle); }}>{t('mobile.delete')}</Button>
                </View>
              )}
              {secteursOfParcelle(p.id_parcelle)
                .filter(s => !filterSecteur || String(s.id_secteur) === filterSecteur)
                .map(s => (
                  <View key={s.id_secteur} style={[styles.secteurCard, isRTL && { borderLeftWidth: 0, borderRightWidth: 3, borderRightColor: '#2d7a4a' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="titleSmall" style={{ color: '#2d7a4a', textAlign: isRTL ? 'right' : 'left' }}>{s.nom}</Text>
                      <Chip style={{ backgroundColor: (STATUT_COLORS[s.statut] || '#888') + '22' }}>{tStatut(s.statut)}</Chip>
                    </View>
                    <View style={[styles.secteurDetails, isRTL && { flexDirection: 'row-reverse' }]}>
                      <Text variant="bodySmall" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('sectors.area_ha')} {s.surface} {t('common.ha_short')}</Text>
                      <Text variant="bodySmall" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('sectors.nb_arbres_col')} {s.nb_arbre}</Text>
                      <Text variant="bodySmall" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('sectors.age_moy_col')} {s.age_moy} {t('sectors.years')}</Text>
                      <Text variant="bodySmall" style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('sectors.variete_col')} {getVarieteNom(s.variete_id)}</Text>
                    </View>
                    {isAdmin && (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 4 }}>
                        <Button icon="pencil" compact mode="text" onPress={() => openEditSecteur(s)}>{t('mobile.edit')}</Button>
                        <Button icon="delete" compact mode="text" textColor="#d32f2f" onPress={() => { setConfirmType('secteur'); setConfirmId(s.id_secteur); }}>{t('mobile.delete')}</Button>
                      </View>
                    )}
                  </View>
                ))}
              {isAdmin && (
                <List.Item
                  title={t('mobile.add')}
                  left={isRTL ? undefined : props => <List.Icon {...props} icon="plus-circle" />}
                  right={isRTL ? props => <List.Icon {...props} icon="plus-circle" /> : undefined}
                  titleStyle={{ color: '#2d7a4a', textAlign: isRTL ? 'right' : 'left' }}
                  onPress={() => openCreateSecteur(p.id_parcelle)}
                />
              )}
            </List.Accordion>
            </View>
          ))}
        <View style={{ height: 80 }} />
      </ScrollView>
      {isAdmin && <FAB icon="plus" style={styles.fab} onPress={openCreateParcelle} />}
      <Portal>
        <Dialog visible={!!dialogType} onDismiss={() => setDialogType(null)}>
          <Dialog.Title style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {dialogType === 'parcelle'
              ? (editing ? t('fields.edit_field') : t('fields.new_field'))
              : (editing ? t('sectors.edit_sector') : t('sectors.new_sector'))}
          </Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: SCREEN_H * 0.45 }}>
              <TextInput label={t('mobile.name')} value={form.nom} onChangeText={v => setForm(f => ({ ...f, nom: v }))} maxLength={20} style={{ marginBottom: 8 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} labelStyle={isRTL ? { textAlign: 'right' } : undefined} />
              {dialogType === 'secteur' && (
                <>
                  <TextInput label={t('sectors.area_ha')} value={form.surface} onChangeText={v => setForm(f => ({ ...f, surface: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} labelStyle={isRTL ? { textAlign: 'right' } : undefined} />
                  <TextInput label={t('sectors.nb_arbres_col')} value={form.nb_arbre} onChangeText={v => setForm(f => ({ ...f, nb_arbre: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} labelStyle={isRTL ? { textAlign: 'right' } : undefined} />
                  <TextInput label={t('sectors.age_moyen_label')} value={form.age_moy} onChangeText={v => setForm(f => ({ ...f, age_moy: v }))} keyboardType="numeric" style={{ marginBottom: 8 }} contentStyle={isRTL ? { textAlign: 'right' } : undefined} labelStyle={isRTL ? { textAlign: 'right' } : undefined} />
                  <Text variant="labelMedium" style={{ marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t('sectors.variete_col')} *</Text>
                  <View style={{ marginBottom: 12 }}>
                    <SelectFilter noAll
                      label={t('sectors.select_species')}
                      value={form.variete_id}
                      onChange={v => setForm(f => ({ ...f, variete_id: v }))}
                      options={varietes.map(v => ({ value: String(v.id_variete), label: v.nom }))}
                    />
                  </View>
                  <Text variant="labelMedium" style={{ marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t('mobile.status')}</Text>
                  <View style={{ marginBottom: 8 }}>
                    <SelectFilter noAll
                      label={t('mobile.status')}
                      value={form.statut}
                      onChange={v => setForm(f => ({ ...f, statut: v }))}
                      options={[
                        { value: 'actif', label: t('sectors.en_production') },
                        { value: 'jeune', label: t('sectors.jeune') },
                        { value: 'inactif', label: t('rh.status_inactive') },
                      ]}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogType(null)}>{t('mobile.cancel')}</Button>
            <Button onPress={save} loading={loading}>{t('mobile.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ConfirmDialog
        visible={!!confirmId}
        title={t('mobile.confirm_delete')}
        message={confirmType === 'parcelle' ? t('fields.delete_warning') : t('sectors.delete_warning')}
        onConfirm={confirmDelete}
        onDismiss={() => setConfirmId(null)}
        confirmLabel={t('mobile.delete')}
      />
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}
const styles = StyleSheet.create({
  secteurCard: { margin: 8, padding: 12, backgroundColor: '#fff', borderRadius: 8, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#2d7a4a' },
  secteurDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4, backgroundColor: '#f9fbe7', borderRadius: 6, padding: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2d7a4a' },
});
