import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

export const formatMatchDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'HH:mm')}`;
  return format(date, 'EEE, MMM d · HH:mm');
};

export const formatTimeAgo = (dateStr: string): string => {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
};

export const isMatchPast = (scheduledAt: string, durationMinutes: number): boolean => {
  const end = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60000);
  return isPast(end);
};

export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

export const getSlotsText = (current: number, max: number): string => {
  return `${current}/${max}`;
};

export const formatPrice = (price: number, currency: string): string => {
  if (price === 0) return 'Free';
  return `${price} ${currency}`;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
