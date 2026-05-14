import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'bypass-tunnel-reminder': 'true' },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('olivipro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let _logoutFn = null;
export const setLogoutHandler = (fn) => { _logoutFn = fn; };

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && _logoutFn) {
      _logoutFn();
    }
    return Promise.reject(error);
  }
);

export default client;
