import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import { Booking, Venue } from '@/types';
import { formatMatchDate } from '@/lib/helpers';
import { Ionicons } from '@expo/vector-icons';

export default function VenueDashboardScreen() {
  const { user } = useAuthStore();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: venueData } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      setVenue(venueData ?? null);

      if (venueData) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*, matches(id, title, sport, scheduled_at, current_players, max_players), profiles:booked_by(id, username, avatar_url)')
          .eq('venue_id', venueData.id)
          .order('starts_at', { ascending: true });
        setBookings(bookingsData ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    await supabase.from('bookings').update({ status }).eq('id', bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    );
  };

  const filtered = bookings.filter((b) => b.status === activeTab);

  const stats = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    thisWeek: bookings.filter((b) => {
      const start = new Date(b.starts_at);
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 86400000);
      return start >= now && start <= weekEnd && b.status === 'confirmed';
    }).length,
    total: bookings.filter((b) => b.status === 'confirmed').length,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 60 }}>
          No venue found for your account. Create a venue profile to get started.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} showsVerticalScrollIndicator={false}>
        {/* Venue Info */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            gap: 4,
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>
            {venue.name}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            {venue.address}, {venue.city}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Pending', value: stats.pending, color: theme.colors.warning },
            { label: 'This Week', value: stats.thisWeek, color: theme.colors.primary },
            { label: 'Total Confirmed', value: stats.total, color: theme.colors.success },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.md,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ color: stat.color, fontSize: 22, fontWeight: '800' }}>
                {stat.value}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 0, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 4 }}>
          {(['pending', 'confirmed', 'cancelled'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: 'center',
                borderRadius: theme.radius.sm,
                backgroundColor: activeTab === tab ? theme.colors.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? '#fff' : theme.colors.textMuted,
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bookings list */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 32, gap: 8 }}>
            <Ionicons name="calendar-outline" size={36} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
              No {activeTab} bookings
            </Text>
          </View>
        ) : (
          filtered.map((booking) => {
            const match = booking.matches as any;
            return (
              <View
                key={booking.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>
                      {booking.field_name ?? 'Field Booking'}
                    </Text>
                    {match && (
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                        {match.title} · {match.current_players}/{match.max_players} players
                      </Text>
                    )}
                    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                      {formatMatchDate(booking.starts_at)}
                    </Text>
                  </View>
                </View>

                {booking.notes && (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{booking.notes}</Text>
                )}

                {activeTab === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => updateBookingStatus(booking.id, 'confirmed')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        backgroundColor: theme.colors.success + '22',
                        borderRadius: theme.radius.sm,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.success,
                      }}
                    >
                      <Text style={{ color: theme.colors.success, fontWeight: '600', fontSize: 13 }}>
                        Confirm
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateBookingStatus(booking.id, 'cancelled')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        backgroundColor: theme.colors.error + '22',
                        borderRadius: theme.radius.sm,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.error,
                      }}
                    >
                      <Text style={{ color: theme.colors.error, fontWeight: '600', fontSize: 13 }}>
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
