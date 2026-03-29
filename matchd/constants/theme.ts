export const theme = {
  colors: {
    background: '#0a0a0f',
    surface: '#13131a',
    surfaceAlt: '#1c1c27',
    border: '#2a2a3d',
    text: '#f0f0ff',
    textMuted: '#8888aa',
    primary: '#6c63ff',
    primaryDark: '#5a52e0',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    rating: {
      low: '#ef4444',
      mid: '#f59e0b',
      good: '#22c55e',
      elite: '#eab308',
    },
    sports: {
      football: '#22c55e',
      mini_football_5v5: '#3b82f6',
      mini_football_8v8: '#8b5cf6',
      padel: '#f59e0b',
      tennis: '#ef4444',
      basketball: '#f97316',
      volleyball: '#06b6d4',
      other: '#6b7280',
    },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
};

export const getRatingColor = (rating: number): string => {
  if (rating < 4) return theme.colors.rating.low;
  if (rating < 6) return theme.colors.rating.mid;
  if (rating < 8) return theme.colors.rating.good;
  return theme.colors.rating.elite;
};
