import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';

export const getQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addToQueue = async (item) => {
  try {
    const queue = await getQueue();
    queue.push({ ...item, id: Date.now().toString(), timestamp: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

export const removeFromQueue = async (id) => {
  try {
    const queue = await getQueue();
    const updated = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  } catch {}
};

export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {}
};

export const getQueueCount = async () => {
  const queue = await getQueue();
  return queue.length;
};
