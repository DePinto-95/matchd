interface SkeletonRowsProps {
  count?: number;
  /** Tailwind height class — list rows are taller than search results. */
  height?: string;
}

export function SkeletonRows({ count = 3, height = 'h-14' }: SkeletonRowsProps) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} bg-surface rounded-xl border border-border animate-pulse`} />
      ))}
    </div>
  );
}
