import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Chip, Snackbar, ActivityIndicator } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const DAYS_IN_MONTH = (mois) => {
  const [y, m] = mois.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

export default function Presences({ navigation }) {
  const { user } = useAuth();
  const { employes } = useData();
  const isAdmin = user?.role === 'admin';
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [feuille, setFeuille] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => { fetchFeuille(); }, [mois]);

  const fetchFeuille = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/feuilles/?mois=${mois}`);
      setFeuille(res.data);
      setLignes(initLignes(res.data.lignes || []));
    } catch { setSnack('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const initLignes = (rawLignes) => rawLignes.map(l => ({
    ...l,
    jours: parseJours(l.jours_json),
  }));

  const parseJours = (jsonStr) => {
    try { return JSON.parse(jsonStr || '{}'); } catch { return {}; }
  };

  const toggleJour = (ligneIdx, jour) => {
    if (!isAdmin || feuille?.statut === 'validee') return;
    setLignes(prev => prev.map((l, i) => {
      if (i !== ligneIdx) return l;
      const newJours = { ...l.jours, [jour]: l.jours[jour] === 1 ? 0 : 1 };
      return { ...l, jours: newJours };
    }));
  };

  const saveChanges = async () => {
    if (!feuille) return;
    setSaving(true);
    try {
      const payload = {
        lignes: lignes.map(l => ({
          employe_id: l.employe_id || null,
          nom_temp: l.nom_temp || null,
          tarif_temp: l.tarif_temp || null,
          jours_json: JSON.stringify(l.jours),
          remarque: l.remarque || '',
        })),
      };
      await client.put(`/feuilles/${feuille.id}`, payload);
      await fetchFeuille();
      setSnack('Sauvegardé');
    } catch { setSnack('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const valider = async () => {
    try { await client.put(`/feuilles/${feuille.id}/valider`); await fetchFeuille(); setSnack('Feuille validée'); }
    catch { setSnack('Erreur lors de la validation'); }
  };

  const deverrouiller = async () => {
    try { await client.put(`/feuilles/${feuille.id}/deverrouiller`); await fetchFeuille(); setSnack('Feuille déverrouillée'); }
    catch { setSnack('Erreur'); }
  };

  const changeMonth = (delta) => {
    const d = new Date(mois + '-01');
    d.setMonth(d.getMonth() + delta);
    setMois(d.toISOString().slice(0, 7));
  };

  const exportPDF = async () => {
    const nbJours = DAYS_IN_MONTH(mois);
    const joursHeader = Array.from({ length: nbJours }, (_, i) => `<th>${i + 1}</th>`).join('');
    const rows = lignes.map(l => {
      const emp = employes.find(e => e.id_employe === l.employe_id);
      const nom = l.nom_temp || (emp ? `${emp.nom} ${emp.prenom ?? ''}` : `Emp ${l.employe_id}`);
      const cells = Array.from({ length: nbJours }, (_, i) => `<td>${l.jours[String(i + 1)] === 1 ? '1' : ''}</td>`).join('');
      const total = Object.values(l.jours).filter(v => v === 1).length;
      return `<tr><td>${nom}</td>${cells}<td><b>${total}</b></td></tr>`;
    }).join('');
    const html = `<html><head><style>table{border-collapse:collapse;font-size:10px}td,th{border:1px solid #ccc;padding:2px 4px}th{background:#2d7a4a;color:#fff}</style></head><body><h2>Présences — ${mois}</h2><table><tr><th>Employé</th>${joursHeader}<th>Total</th></tr>${rows}</table></body></html>`;
    const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  };

  const nbJours = DAYS_IN_MONTH(mois);
  const days = Array.from({ length: nbJours }, (_, i) => i + 1);

  const getEmployeNom = (l) => {
    if (l.nom_temp) return l.nom_temp;
    const emp = employes.find(e => e.id_employe === l.employe_id);
    return emp ? `${emp.nom} ${emp.prenom ?? ''}` : `Emp ${l.employe_id}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Présences" navigation={navigation} />

      <View style={styles.header}>
        <Button icon="chevron-left" onPress={() => changeMonth(-1)} compact />
        <Text variant="titleMedium" style={{ flex: 1, textAlign: 'center' }}>{mois}</Text>
        <Button icon="chevron-right" onPress={() => changeMonth(1)} compact />
        <Button icon="file-pdf-box" onPress={exportPDF} compact>PDF</Button>
      </View>

      {feuille && (
        <View style={styles.statusBar}>
          <Chip compact style={{ backgroundColor: feuille.statut === 'validee' ? '#e8f5e9' : '#fff8e1' }}>
            {feuille.statut === 'validee' ? 'Validée ✓' : 'Brouillon'}
          </Chip>
          {isAdmin && feuille.statut !== 'validee' && (
            <>
              <Button mode="contained" compact buttonColor="#2d7a4a" onPress={saveChanges} loading={saving}>Sauvegarder</Button>
              <Button mode="outlined" compact onPress={valider}>Valider</Button>
            </>
          )}
          {isAdmin && feuille.statut === 'validee' && (
            <Button mode="outlined" compact onPress={deverrouiller}>Déverrouiller</Button>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : lignes.length === 0 ? (
        <EmptyState message="Aucune présence ce mois" />
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={[styles.gridRow, { backgroundColor: '#2d7a4a' }]}>
              <View style={styles.nameCell}>
                <Text style={[styles.headerText, { color: '#fff' }]}>Employé</Text>
              </View>
              {days.map(d => (
                <View key={d} style={styles.dayCell}>
                  <Text style={[styles.headerText, { color: '#fff' }]}>{d}</Text>
                </View>
              ))}
              <View style={styles.totalCell}>
                <Text style={[styles.headerText, { color: '#fff' }]}>Total</Text>
              </View>
            </View>
            <ScrollView>
              {lignes.map((l, idx) => {
                const total = Object.values(l.jours).filter(v => v === 1).length;
                return (
                  <View key={idx} style={[styles.gridRow, idx % 2 === 0 ? {} : { backgroundColor: '#f5f5f5' }]}>
                    <View style={styles.nameCell}>
                      <Text numberOfLines={1} style={{ fontSize: 12 }}>{getEmployeNom(l)}</Text>
                    </View>
                    {days.map(d => {
                      const val = l.jours[String(d)] === 1;
                      const canEdit = isAdmin && feuille?.statut !== 'validee';
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayCell, val ? styles.present : styles.absent]}
                          onPress={() => canEdit && toggleJour(idx, String(d))}
                          activeOpacity={canEdit ? 0.6 : 1}
                        >
                          <Text style={{ color: val ? '#fff' : '#ccc', fontSize: 11 }}>{val ? '1' : '·'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={styles.totalCell}>
                      <Text style={{ fontWeight: 'bold', color: '#2d7a4a' }}>{total}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#fafafa', borderBottomWidth: 1, borderColor: '#eee' },
  gridRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  nameCell: { width: 120, padding: 6, backgroundColor: '#fff' },
  dayCell: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderColor: '#eee' },
  totalCell: { width: 40, padding: 6, alignItems: 'center', backgroundColor: '#f9f9f9' },
  headerText: { fontSize: 11, fontWeight: 'bold' },
  present: { backgroundColor: '#2d7a4a' },
  absent: { backgroundColor: '#fff' },
});
