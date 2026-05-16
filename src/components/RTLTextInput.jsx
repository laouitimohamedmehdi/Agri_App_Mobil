import React from 'react';
import { TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

export default function RTLTextInput({ contentStyle, labelStyle, label, placeholder, ...props }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  return (
    <TextInput
      {...props}
      label={isRTL ? undefined : label}
      placeholder={isRTL ? (placeholder || label) : placeholder}
      contentStyle={[isRTL ? { textAlign: 'right' } : undefined, contentStyle]}
      labelStyle={labelStyle}
    />
  );
}
