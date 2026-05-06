import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Menu, Button } from 'react-native-paper';

/**
 * Combobox dropdown filter — remplace les Pickers natifs.
 * @param {string} label     Texte affiché quand aucune sélection
 * @param {string} value     Valeur sélectionnée (chaîne vide = aucun filtre)
 * @param {function} onChange Callback appelé avec la nouvelle valeur ('' pour réinitialiser)
 * @param {Array} options    [{value, label}]
 * @param {object} style     Style optionnel sur le bouton
 */
export default function SelectFilter({ label, value, onChange, options, style }) {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => String(o.value) === String(value));
  const isActive = value !== '' && value !== null && value !== undefined;

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Button
          mode={isActive ? 'contained' : 'outlined'}
          compact
          onPress={() => setVisible(true)}
          icon="chevron-down"
          contentStyle={{ flexDirection: 'row-reverse' }}
          buttonColor={isActive ? '#2d7a4a' : undefined}
          style={[styles.btn, style]}
        >
          {selected?.label || label}
        </Button>
      }
    >
      <Menu.Item
        onPress={() => { onChange(''); setVisible(false); }}
        title={`Tous — ${label}`}
        leadingIcon={!isActive ? 'check' : undefined}
      />
      {options.map(o => (
        <Menu.Item
          key={String(o.value)}
          onPress={() => { onChange(String(o.value)); setVisible(false); }}
          title={o.label}
          leadingIcon={String(value) === String(o.value) ? 'check' : undefined}
        />
      ))}
    </Menu>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 6 },
});
