import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';

export default function EmptyState({ message = 'Aucune donnée disponible' }) {
  return (
    <View style={styles.container}>
      <Icon source="inbox-outline" size={48} color="#aaa" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { marginTop: 12, color: '#888', textAlign: 'center' },
});
