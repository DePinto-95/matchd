import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { theme } from '@/constants/theme';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}) => {
  const bg = {
    primary: theme.colors.primary,
    secondary: theme.colors.surfaceAlt,
    ghost: 'transparent',
    danger: theme.colors.error,
  }[variant];

  const textColor = variant === 'ghost' ? theme.colors.primary : theme.colors.text;
  const borderColor = variant === 'ghost' ? theme.colors.primary : 'transparent';

  const py = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const px = size === 'sm' ? 12 : size === 'lg' ? 24 : 16;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: bg,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor,
        borderRadius: theme.radius.md,
        paddingVertical: py,
        paddingHorizontal: px,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: disabled || loading ? 0.5 : 1,
        alignSelf: fullWidth ? 'stretch' : 'auto',
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.text} />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          <Text style={{ color: textColor, fontSize, fontWeight: '600' }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
