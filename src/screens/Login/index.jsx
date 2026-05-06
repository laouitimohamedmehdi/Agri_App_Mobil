import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Snackbar } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Email et mot de passe requis'); return; }
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
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text variant="headlineMedium" style={styles.title}>AgriPro</Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={50}
          style={styles.input}
        />
        <TextInput
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          maxLength={50}
          right={<TextInput.Icon icon={secure ? 'eye' : 'eye-off'} onPress={() => setSecure(!secure)} />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!error}>{error}</HelperText>
        <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.button}>
          Connexion
        </Button>
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={4000}>
        {snack === 'network'
          ? 'Impossible de contacter le serveur — vérifiez votre connexion'
          : 'Email ou mot de passe incorrect'}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5f5f5' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16 },
  title: { textAlign: 'center', marginBottom: 32, color: '#2d7a4a' },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
});
