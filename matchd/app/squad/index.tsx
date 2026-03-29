import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import { Squad } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function SquadsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSquads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('squad_members')
      .select('squads(*, squad_members(player_id))')
      .eq('player_id', user.id);
    const s = (data ?? []).map((d: any) => d.squads).filter(Boolean) as Squad[];
    setSquads(s);
    setLoading(false);
  };

  useEffect(() => {
    loadSquads();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data: squad } = await supabase
      .from('squads')
      .insert({ name: newName.trim(), creator_id: user.id })
      .select()
      .single();
    if (squad) {
      await supabase.from('squad_members').insert({ squad_id: squad.id, player_id: user.id });
      setShowCreate(false);
      setNewName('');
      loadSquads();
    }
    setCreating(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
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
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New Squad</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={squads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/squad/${item.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                marginHorizontal: 16,
                marginBottom: 10,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.colors.primary + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="people" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>
                  {item.name}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  {(item.squad_members as any)?.length ?? 0} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 15 }}>No squads yet</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
                Create a squad to play matches with your regular crew
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="Create Squad">
        <View style={{ gap: 16 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Squad name..."
            placeholderTextColor={theme.colors.textMuted}
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
          <Button label="Create" onPress={handleCreate} loading={creating} fullWidth />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
