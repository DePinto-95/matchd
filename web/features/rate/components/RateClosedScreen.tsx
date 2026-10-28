'use client';

import { useRouter } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';

interface RateClosedScreenProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  children: React.ReactNode;
}

/** Full-page state for when rating is over: window closed, or already done. */
export function RateClosedScreen({
  icon: Icon,
  iconClassName = 'text-text-muted',
  title,
  children,
}: RateClosedScreenProps) {
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <BackButton />
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Icon className={`w-12 h-12 ${iconClassName}`} />
        <h2 className="font-heading font-bold text-xl text-text">{title}</h2>
        <p className="text-text-muted text-sm">{children}</p>
        <Button onClick={() => router.push('/')}>Back to home</Button>
      </div>
    </div>
  );
}
