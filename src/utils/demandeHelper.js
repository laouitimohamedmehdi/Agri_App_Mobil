import client from '../api/client';

export async function soumettreDemande({ type_action, entity_type, entity_id, travail_id, motif, nouvelles_donnees }) {
  await client.post('/demandes/', {
    type_action,
    entity_type: entity_type || 'travail',
    entity_id: entity_id || null,
    travail_id: travail_id || null,
    motif: motif || '',
    nouvelles_donnees: nouvelles_donnees ? JSON.stringify(nouvelles_donnees) : '',
  });
}
