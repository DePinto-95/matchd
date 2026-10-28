'use client';

import { useEffect, useState, use } from 'react';
import { Users } from 'lucide-react';
import { squadService } from '@/services';
import { Squad } from '@matchd/shared/types';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import { BackButton } from '@/components/ui/BackButton';
import { PageLoading } from '@/components/ui/PageLoading';

export default function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    squadService.getById(id).then((data) => {
      setSquad(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <PageLoading />;
  }

  if (!squad) return (
    <div className="text-center py-32"><p className="text-text-muted">Squad not found</p></div>
  );

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <BackButton />

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
