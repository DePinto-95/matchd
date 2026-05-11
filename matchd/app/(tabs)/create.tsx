import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  BackHandler,
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
  title: z.string().min(3, 'Title must be at least 3 characters').max(60),
  location_name: z.string().min(3, 'Please enter the match location'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEP_LABELS = ['Sport', 'Details', 'Date & Time', 'Settings'];

export default function CreateMatchScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<SportType | null>(null);
  const [teamSize, setTeamSize] = useState<number>(5);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [minRating, setMinRating] = useState('1');
  const [maxRating, setMaxRating] = useState('10');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors }, getValues, trigger, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const teamSizes = sport ? SPORTS[sport].teamSizes : [5];

  const formatDate = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatTime = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const validateDate = (d: string): string | null => {
    const parts = d.split('/');
    if (parts.length !== 3 || parts[2].length < 2) return 'Please enter a complete date (DD/MM/YY).';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = 2000 + parseInt(parts[2], 10);
    if (month < 1 || month > 12) return 'Month must be between 01 and 12.';
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return `Day must be between 01 and ${daysInMonth} for that month.`;
    const parsed = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed < today) return 'The match date cannot be in the past.';
    return null;
  };

  const validateTime = (t: string): string | null => {
    const parts = t.split(':');
    if (parts.length !== 2 || parts[1].length < 2) return 'Please enter a complete time (HH:MM).';
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (hours < 0 || hours > 23) return 'Hours must be between 00 and 23.';
    if (minutes < 0 || minutes > 59) return 'Minutes must be between 00 and 59.';
    return null;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!sport) {
        Alert.alert('Select a sport', 'Please choose a sport before continuing.');
        return;
      }
      // Pre-fill title with sport name if still empty
      if (!getValues('title')) {
        setValue('title', `${SPORTS[sport].label} Match`);
      }
    }

    if (step === 1) {
      const valid = await trigger(['title', 'location_name']);
      if (!valid) return;
    }

    if (step === 2) {
      if (!date || !time) {
        Alert.alert('Required', 'Please enter both a date and a time for the match.');
        return;
      }
      const dateError = validateDate(date);
      if (dateError) {
        Alert.alert('Invalid Date', dateError);
        return;
      }
      const timeError = validateTime(time);
      if (timeError) {
        Alert.alert('Invalid Time', timeError);
        return;
      }
    }

    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleCancel = () => router.replace('/(tabs)');

  useEffect(() => {
    const onBackPress = () => {
      if (step > 0) {
        handleBack();
      } else {
        router.replace('/(tabs)');
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [step]);

  const onSubmit = async (data: FormData) => {
    if (!user || !sport) return;

    const minR = parseFloat(minRating);
    const maxR = parseFloat(maxRating);
    if (!minRating || !maxRating || isNaN(minR) || isNaN(maxR)) {
      Alert.alert('Rating Required', 'Please enter both a minimum and maximum rating (1 to 10).');
      return;
    }
    if (minR < 1 || minR > 10 || maxR < 1 || maxR > 10) {
      Alert.alert('Invalid Rating', 'Ratings must be between 1 and 10.');
      return;
    }
    if (minR > maxR) {
      Alert.alert('Invalid Rating', 'The minimum rating cannot be higher than the maximum rating.');
      return;
    }

    const [dd, mm, yy] = date.split('/');
    const scheduledAt = new Date(`20${yy}-${mm}-${dd}T${time}:00`).toISOString();

    setLoading(true);
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
        min_rating: minR,
        max_rating: maxR,
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

    await supabase.from('match_teams').insert([
      { match_id: match.id, side: 'home', name: 'Home' },
      { match_id: match.id, side: 'away', name: 'Away' },
    ]);

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
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>
            Create Match
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Step {step + 1} of 4 — {STEP_LABELS[step]}
          </Text>
        </View>
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
              <View style={{ gap: 16 }}>
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
                    Team Size
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {teamSizes.map((size) => (
                      <TouchableOpacity
                        key={size}
                        onPress={() => { setTeamSize(size); setMaxPlayers(size * 2); }}
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

                {/* Max Players */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
                    Max Players
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity onPress={() => setMaxPlayers((p) => Math.max(2, p - 1))}>
                      <Ionicons name="remove-circle-outline" size={30} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700', minWidth: 32, textAlign: 'center' }}>
                      {maxPlayers}
                    </Text>
                    <TouchableOpacity onPress={() => setMaxPlayers((p) => p + 1)}>
                      <Ionicons name="add-circle-outline" size={30} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 1: Title, Location, Description */}
        {step === 1 && (
          <View style={{ gap: 16 }}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Match Title *"
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
                  label="Location *"
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
              label="Date * (DD/MM/YY)"
              value={date}
              onChangeText={(t) => setDate(formatDate(t))}
              placeholder="30/03/26"
              keyboardType="numeric"
              leftIcon="calendar-outline"
            />
            <Input
              label="Time * (HH:MM)"
              value={time}
              onChangeText={(t) => setTime(formatTime(t))}
              placeholder="18:00"
              keyboardType="numeric"
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
                Only players with a rating between {minRating || '?'} and {maxRating || '?'} can join.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Min Rating *"
                    value={minRating}
                    onChangeText={(v) => setMinRating(v.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    placeholder="1"
                    leftIcon="star-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Max Rating *"
                    value={maxRating}
                    onChangeText={(v) => setMaxRating(v.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    placeholder="10"
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
                  Invite Only
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                  Random players cannot join — share the invite link with your squad
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
                  MATCH SUMMARY{isPrivate ? '  ·  🔒 INVITE ONLY' : ''}
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  {SPORTS[sport].emoji} {SPORTS[sport].label} · {teamSize}v{teamSize} · {maxPlayers} players max
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  📍 {getValues('location_name') || '—'}
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                  📅 {date} at {time}
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
