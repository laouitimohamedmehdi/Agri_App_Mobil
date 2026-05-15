import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function ConfirmDialog({ visible, title, message, onConfirm, onDismiss, confirmLabel = 'Confirmer' }) {
  const { t } = useTranslation();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('mobile.cancel')}</Button>
          <Button onPress={onConfirm} textColor="#d32f2f">{confirmLabel}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
