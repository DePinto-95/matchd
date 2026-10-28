import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
}

export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Icon className="w-12 h-12 text-border mb-4" />
      <h2 className="font-heading font-bold text-lg text-text mb-2">{title}</h2>
      <p className="text-text-muted text-sm">{message}</p>
    </div>
  );
}
