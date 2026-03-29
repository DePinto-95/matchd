import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.primary
    : theme.colors.border;

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor,
          borderRadius: theme.radius.md,
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        {leftIcon && (
          <Ionicons name={leftIcon} size={18} color={theme.colors.textMuted} />
        )}
        <TextInput
          {...props}
          secureTextEntry={isSecure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: theme.colors.text,
            fontSize: 15,
            paddingVertical: 14,
          }}
          placeholderTextColor={theme.colors.textMuted}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)}>
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={{ color: theme.colors.error, fontSize: 12 }}>{error}</Text>
      )}
    </View>
  );
};
