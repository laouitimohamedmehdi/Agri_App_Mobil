import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

export default function ConfirmDialog({ visible, title, message, onConfirm, onDismiss, confirmLabel = 'Confirmer' }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Annuler</Button>
          <Button onPress={onConfirm} textColor="#d32f2f">{confirmLabel}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
