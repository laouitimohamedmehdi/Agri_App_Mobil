import React, { useState, useEffect, useContext } from 'react';
import { Appbar, Badge } from 'react-native-paper';
import { View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { DrawerContext } from '../contexts/DrawerContext';

export default function AppHeader({ title }) {
  const { openDrawer } = useContext(DrawerContext);
  const navigation = useNavigation();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
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
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: 32, height: 32, resizeMode: 'contain', marginRight: 8 }}
      />
      {isAr ? <View style={{ flex: 1 }} /> : <Appbar.Content title={title} />}
      {isAr && (
        <Appbar.Content title={title} style={{ flex: 0 }} titleStyle={{ textAlign: 'right' }} />
      )}
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
