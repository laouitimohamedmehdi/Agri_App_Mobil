import React, { useState } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DatePickerInput({ label, value, onChange, style }) {
  const [show, setShow] = useState(false);
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

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
            label={isRTL ? undefined : label}
            placeholder={isRTL ? label : undefined}
            value={value || ''}
            editable={false}
            mode="outlined"
            left={isRTL ? <TextInput.Icon icon="calendar" color="#2d7a4a" /> : undefined}
            right={isRTL ? undefined : <TextInput.Icon icon="calendar" color="#2d7a4a" />}
            style={{ backgroundColor: '#fff' }}
            contentStyle={isRTL ? { textAlign: 'right' } : undefined}
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
