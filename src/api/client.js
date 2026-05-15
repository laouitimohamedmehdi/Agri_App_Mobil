import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { addToQueue } from '../utils/offlineQueue';

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
    const config = error.config;

    const isNetworkError = !error.response;
    const isWriteRequest = config && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());
    const isRetry = config?._isRetry;

    if (isNetworkError && isWriteRequest && !isRetry) {
      await addToQueue({
        method: config.method,
        url: config.url,
        data: config.data ? JSON.parse(config.data) : undefined,
        headers: { Authorization: config.headers?.Authorization },
      });
      const queuedError = new Error('QUEUED_OFFLINE');
      queuedError.isQueued = true;
      return Promise.reject(queuedError);
    }

    if (error.response?.status === 401 && _logoutFn) {
      _logoutFn();
    }
    return Promise.reject(error);
  }
);

export default client;
