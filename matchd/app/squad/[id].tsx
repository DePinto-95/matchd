import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import { SquadMember } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function SquadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [creatorId, setCreatorId] = useState('');

  const load = async () => {
    const { data: squad } = await supabase
      .from('squads')
      .select('*, squad_members(*, profiles(id, username, full_name, avatar_url))')
      .eq('id', id)
      .single();
    if (squad) {
      setName(squad.name);
      setCreatorId(squad.creator_id);
      setMembers((squad.squad_members as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', inviteUsername.trim())
      .single();
    if (!profile) {
      Alert.alert('User not found', `No user with username @${inviteUsername}`);
      setInviting(false);
      return;
    }
    const { error } = await supabase
      .from('squad_members')
      .insert({ squad_id: id, player_id: profile.id });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setShowInvite(false);
      setInviteUsername('');
      load();
    }
    setInviting(false);
  };

  const handleRemove = (memberId: string) => {
    Alert.alert('Remove Member', 'Remove this player from the squad?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('squad_members').delete().eq('squad_id', id).eq('player_id', memberId);
          load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          padding: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>{name}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{members.length} members</Text>
        </View>
        {creatorId === user?.id && (
          <TouchableOpacity
            onPress={() => setShowInvite(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
            }}
          >
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.player_id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const profile = (item as any).profiles;
          if (!profile) return null;
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: theme.colors.surface,
                padding: 12,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Avatar uri={profile.avatar_url} name={profile.full_name ?? profile.username} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                  {profile.full_name ?? profile.username}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>@{profile.username}</Text>
              </View>
              {creatorId === user?.id && profile.id !== user?.id && (
                <TouchableOpacity onPress={() => handleRemove(profile.id)}>
                  <Ionicons name="remove-circle-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <Modal visible={showInvite} onClose={() => setShowInvite(false)} title="Invite Player">
        <View style={{ gap: 14 }}>
          <TextInput
            value={inviteUsername}
            onChangeText={setInviteUsername}
            placeholder="Enter username..."
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            style={{
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.md,
              padding: 14,
              color: theme.colors.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          />
          <Button label="Add to Squad" onPress={handleInvite} loading={inviting} fullWidth />
        </View>
      </Modal>
    </View>
  );
}
