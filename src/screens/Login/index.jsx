import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, HelperText, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { changeLanguage } from '../../i18n';

const LANGS = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'ع' },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError(t('auth.error_message')); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 400) {
        setSnack('auth');
      } else {
        setSnack('network');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Sélecteur de langue */}
        <View style={styles.langRow}>
          {LANGS.map(lang => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => changeLanguage(lang.code)}
              style={[styles.langBtn, i18n.language === lang.code && styles.langBtnActive]}
            >
              <Text style={[styles.langLabel, i18n.language === lang.code && styles.langLabelActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text variant="headlineMedium" style={styles.title}>AgriPro</Text>

        <TextInput
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={50}
          style={styles.input}
        />
        <TextInput
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          maxLength={50}
          right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure(!secure)} />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!error}>{error}</HelperText>
        <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.button}>
          {t('auth.login')}
        </Button>
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={4000}>
        {snack === 'network' ? t('auth.server_error') : t('auth.login_failed')}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 16 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e8f5e9' },
  langBtnActive: { backgroundColor: '#2d7a4a' },
  langLabel: { fontSize: 12, fontWeight: '700', color: '#2d7a4a' },
  langLabelActive: { color: '#fff' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16 },
  title: { textAlign: 'center', marginBottom: 32, color: '#2d7a4a' },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
});
