import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import { SportType } from '@/types';
import { SPORTS } from '@/constants/sports';
import { generateInviteCode } from '@/lib/helpers';
import { SportSelector } from '@/components/SportSelector';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

const schema = z.object({
  title: z.string().min(3, 'Title too short').max(60),
  location_name: z.string().min(3, 'Location required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEP_LABELS = ['Sport', 'Location', 'Details', 'Settings'];

export default function CreateMatchScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<SportType | null>(null);
  const [teamSize, setTeamSize] = useState<number>(5);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [minRating, setMinRating] = useState(1);
  const [maxRating, setMaxRating] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const teamSizes = sport ? SPORTS[sport].teamSizes : [5];

  const handleNext = () => {
    if (step === 0 && !sport) {
      Alert.alert('Please select a sport');
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: FormData) => {
    if (!user || !sport) return;

    // Parse date/time
    const scheduledAt = date && time ? new Date(`${date}T${time}`).toISOString() : new Date(Date.now() + 3600000).toISOString();

    setLoading(true);
    const maxPlayers = teamSize * 2;
    const inviteCode = isPrivate ? generateInviteCode() : null;

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        creator_id: user.id,
        sport,
        title: data.title,
        description: data.description ?? null,
        location_name: data.location_name,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        max_players: maxPlayers,
        team_size: teamSize,
        min_rating: minRating,
        max_rating: maxRating,
        is_private: isPrivate,
        invite_code: inviteCode,
        status: 'open',
      })
      .select()
      .single();

    if (error || !match) {
      setLoading(false);
      Alert.alert('Error', 'Could not create match. Please try again.');
      return;
    }

    // Create home/away teams
    await supabase.from('match_teams').insert([
      { match_id: match.id, side: 'home', name: 'Home' },
      { match_id: match.id, side: 'away', name: 'Away' },
    ]);

    // Get home team id and add creator
    const { data: teams } = await supabase
      .from('match_teams')
      .select('id, side')
      .eq('match_id', match.id);

    const homeTeam = teams?.find((t) => t.side === 'home');
    if (homeTeam) {
      await supabase.from('match_participants').insert({
        match_id: match.id,
        player_id: user.id,
        team_id: homeTeam.id,
        status: 'confirmed',
      });
    }

    setLoading(false);
    router.replace(`/match/${match.id}`);
  };

  const sportConfig = sport ? SPORTS[sport] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        {step > 0 ? (
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>
            Create Match
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Step {step + 1} of 4 — {STEP_LABELS[step]}
          </Text>
        </View>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEP_LABELS.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i <= step ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 0: Sport */}
        {step === 0 && (
          <View style={{ gap: 20 }}>
            <SportSelector selected={sport} onSelect={setSport} />
            {sport && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
                  Team Size
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {teamSizes.map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => setTeamSize(size)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: theme.radius.md,
                        backgroundColor:
                          teamSize === size ? theme.colors.primary + '22' : theme.colors.surface,
                        borderWidth: 1.5,
                        borderColor:
                          teamSize === size ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: teamSize === size ? theme.colors.primary : theme.colors.textMuted,
                          fontWeight: '600',
                        }}
                      >
                        {size}v{size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 1: Location & Title */}
        {step === 1 && (
          <View style={{ gap: 16 }}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Match Title"
                  value={value}
                  onChangeText={onChange}
                  placeholder={`${sportConfig?.label ?? 'Match'} at the park`}
                  leftIcon="football-outline"
                  error={errors.title?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="location_name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Location"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Stadium, park, court name..."
                  leftIcon="location-outline"
                  error={errors.location_name?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
                    Description (optional)
                  </Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Add details about the match..."
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                      padding: 12,
                      color: theme.colors.text,
                      fontSize: 15,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <View style={{ gap: 16 }}>
            <Input
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder={new Date().toISOString().split('T')[0]}
              leftIcon="calendar-outline"
            />
            <Input
              label="Time (HH:MM)"
              value={time}
              onChangeText={setTime}
              placeholder="18:00"
              leftIcon="time-outline"
            />

            {/* Duration */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
                Duration
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[45, 60, 75, 90, 120].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDuration(d)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      borderRadius: theme.radius.md,
                      backgroundColor:
                        duration === d ? theme.colors.primary + '22' : theme.colors.surface,
                      borderWidth: 1.5,
                      borderColor: duration === d ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: duration === d ? theme.colors.primary : theme.colors.textMuted,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {d}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <View style={{ gap: 20 }}>
            {/* Rating Range */}
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>
                Rating Range
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                Only players with a rating between {minRating}.0 and {maxRating}.0 can join.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Min Rating"
                    value={String(minRating)}
                    onChangeText={(v) => setMinRating(Math.min(Number(v) || 1, maxRating))}
                    keyboardType="numeric"
                    leftIcon="star-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Max Rating"
                    value={String(maxRating)}
                    onChangeText={(v) => setMaxRating(Math.max(Number(v) || 10, minRating))}
                    keyboardType="numeric"
                    leftIcon="star"
                  />
                </View>
              </View>
            </View>

            {/* Private match */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.colors.surface,
                padding: 16,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>
                  Private Match
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  Only joinable via invite link
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ true: theme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Summary */}
            {sport && (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceAlt,
                  padding: 16,
                  borderRadius: theme.radius.md,
                  gap: 8,
                }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                  MATCH SUMMARY
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  {SPORTS[sport].emoji} {SPORTS[sport].label} · {teamSize}v{teamSize} ·{' '}
                  {teamSize * 2} players max
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  📍 {getValues('location_name') || '—'}
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  ⏱ {duration} minutes
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  ⭐ Rating {minRating}–{maxRating}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={{ padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        {step < 3 ? (
          <Button label="Continue →" onPress={handleNext} fullWidth size="lg" />
        ) : (
          <Button
            label="Create Match"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
          />
        )}
      </View>
    </SafeAreaView>
  );
}
