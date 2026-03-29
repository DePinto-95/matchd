import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.text }} />
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700' }}>
          Page not found
        </Text>
        <Link href="/">
          <Text style={{ color: theme.colors.primary, fontSize: 15 }}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
