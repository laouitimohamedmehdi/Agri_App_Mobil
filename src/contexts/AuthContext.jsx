import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import client, { setLogoutHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync('olivipro_token');
      if (stored) {
        setToken(stored);
        try {
          const res = await client.get('/auth/me');
          setUser(res.data);
        } catch {
          await SecureStore.deleteItemAsync('olivipro_token');
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const res = await client.post('/auth/login', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token } = res.data;
    await SecureStore.setItemAsync('olivipro_token', access_token);
    setToken(access_token);
    const me = await client.get('/auth/me');
    setUser(me.data);
  };

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('olivipro_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
