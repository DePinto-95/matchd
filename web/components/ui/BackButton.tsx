'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/** The "< Back" link that sits above most detail pages. */
export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit"
    >
      <ChevronLeft className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
