import React, { useState, useEffect, useContext } from 'react';
import { Appbar, Badge } from 'react-native-paper';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import client from '../api/client';
import { DrawerContext } from '../navigation/AppNavigator';

export default function AppHeader({ title }) {
  const { openDrawer } = useContext(DrawerContext);
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    try {
      const res = await client.get('/notifications/count-unread');
      setUnreadCount(res.data.count ?? 0);
    } catch {}
  };

  return (
    <Appbar.Header>
      <Appbar.Action icon="menu" onPress={openDrawer} />
      <Appbar.Content title={title} />
      <View>
        <Appbar.Action
          icon="bell-outline"
          onPress={() => navigation.navigate('Extra', { screen: 'Notifications' })}
        />
        {unreadCount > 0 && (
          <Badge style={{ position: 'absolute', top: 4, right: 4 }} size={16}>
            {unreadCount}
          </Badge>
        )}
      </View>
    </Appbar.Header>
  );
}
