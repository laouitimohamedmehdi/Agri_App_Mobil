import React, { useState } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Champ date avec calendrier natif.
 * @param {string} label   Label du champ
 * @param {string} value   Valeur au format YYYY-MM-DD
 * @param {function} onChange  Callback appelé avec la nouvelle valeur YYYY-MM-DD
 * @param {object} style   Style optionnel sur le conteneur
 */
export default function DatePickerInput({ label, value, onChange, style }) {
  const [show, setShow] = useState(false);

  const toDate = (str) => {
    if (!str) return new Date();
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') { setShow(false); return; }
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
    if (Platform.OS === 'ios') setShow(false);
  };

  return (
    <View style={style}>
      <TouchableOpacity onPress={() => setShow(true)} activeOpacity={0.8}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={value || ''}
            editable={false}
            mode="outlined"
            right={<TextInput.Icon icon="calendar" color="#2d7a4a" />}
            style={{ backgroundColor: '#fff' }}
          />
        </View>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          locale="fr-FR"
        />
      )}
    </View>
  );
}
