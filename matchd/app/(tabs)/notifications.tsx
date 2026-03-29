import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { theme } from '@/constants/theme';
import { formatTimeAgo } from '@/lib/helpers';
import { Notification } from '@/types';
import { Ionicons } from '@expo/vector-icons';

const NOTIFICATION_ICONS: Record<string, string> = {
  match_joined: 'person-add-outline',
  match_full: 'checkmark-circle-outline',
  rating_received: 'star-outline',
  friend_request: 'people-outline',
  match_cancelled: 'close-circle-outline',
  match_reminder: 'alarm-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user]);

  const handlePress = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    const data = notification.data as any;
    if (data?.match_id) router.push(`/match/${data.match_id}`);
    if (data?.player_id) router.push(`/player/${data.player_id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => user && markAllAsRead(user.id)}>
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const iconName = (NOTIFICATION_ICONS[item.type] ?? 'notifications-outline') as any;
            return (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: item.read ? 'transparent' : theme.colors.primary + '0a',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Ionicons
                    name={iconName}
                    size={18}
                    color={item.read ? theme.colors.textMuted : theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 14,
                      fontWeight: item.read ? '400' : '600',
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.body && (
                    <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                      {item.body}
                    </Text>
                  )}
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    {formatTimeAgo(item.created_at)}
                  </Text>
                </View>
                {!item.read && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.primary,
                      marginTop: 4,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 15 }}>
                No notifications yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
