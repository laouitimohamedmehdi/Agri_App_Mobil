import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueue, removeFromQueue, getQueueCount } from '../utils/offlineQueue';
import client from '../api/client';

const NetworkContext = createContext({ isOnline: true, pendingCount: 0, syncNow: () => {} });

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const wasOnline = useRef(true);

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  const syncNow = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return 0;

    let successCount = 0;
    for (const item of queue) {
      try {
        await client.request({
          method: item.method,
          url: item.url,
          data: item.data,
          headers: item.headers || {},
          _isRetry: true,
        });
        await removeFromQueue(item.id);
        successCount++;
      } catch {
        // Garder en queue si encore offline
      }
    }
    await refreshPendingCount();
    return successCount;
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      if (online && !wasOnline.current) {
        syncNow();
      }
      wasOnline.current = online;
    });

    return () => unsubscribe();
  }, [syncNow, refreshPendingCount]);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingCount, syncNow, refreshPendingCount }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
