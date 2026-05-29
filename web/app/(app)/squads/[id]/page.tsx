'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Squad } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';

export default function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('squads')
      .select('*, squad_members(*, profiles(*))')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setSquad(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!squad) return (
    <div className="text-center py-32"><p className="text-text-muted">Squad not found</p></div>
  );

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center">
            <Users className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-text">{squad.name}</h1>
            <p className="text-text-muted text-sm">{squad.squad_members?.length ?? 0} members</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {(squad.squad_members ?? []).map((m) => (
            <Link
              key={m.player_id}
              href={`/players/${m.player_id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-alt transition-colors"
            >
              <Avatar src={m.profiles?.avatar_url} name={m.profiles?.username} size="sm" />
              <span className="text-sm font-medium text-text">{m.profiles?.username ?? 'Player'}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
