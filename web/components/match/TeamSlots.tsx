import Link from 'next/link';
import { MatchTeam, MatchParticipant } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

interface TeamSlotsProps {
  teams: MatchTeam[];
  participants: MatchParticipant[];
  teamSize: number;
}

const TEAM_COLORS = {
  home: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Home' },
  away: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'Away' },
};

export function TeamSlots({ teams, participants, teamSize }: TeamSlotsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {teams.map((team) => {
        const config = TEAM_COLORS[team.side] ?? TEAM_COLORS.home;
        const members = participants.filter((p) => p.team_id === team.id);
        // Participants from the other team who reserved spots here
        const opponentHolders = participants.filter(
          (p) => p.team_id !== team.id && (p.extra_spots_opponent ?? 0) > 0
        );

        // Build a flat list of slot rows
        const slotRows: { key: string; participant: MatchParticipant; reserved: boolean }[] = [];
        members.forEach((p) => {
          slotRows.push({ key: p.id, participant: p, reserved: false });
          for (let i = 0; i < (p.extra_spots ?? 0); i++) {
            slotRows.push({ key: `${p.id}-extra-${i}`, participant: p, reserved: true });
          }
        });
        opponentHolders.forEach((p) => {
          for (let i = 0; i < (p.extra_spots_opponent ?? 0); i++) {
            slotRows.push({ key: `${p.id}-opp-${i}`, participant: p, reserved: true });
          }
        });

        const emptySlots = teamSize - slotRows.length;

        return (
          <div
            key={team.id}
            className="rounded-xl border-2 overflow-hidden"
            style={{ borderColor: config.color, background: config.bg }}
          >
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${config.color}33` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
              <span className="text-sm font-semibold" style={{ color: config.color }}>
                {team.name ?? config.label}
              </span>
              <span className="ml-auto text-xs text-text-muted">{slotRows.length}/{teamSize}</span>
            </div>

            <div className="p-2 flex flex-col gap-1.5">
              {slotRows.map(({ key, participant: p, reserved }) => (
                <Link
                  key={key}
                  href={`/players/${p.player_id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors ${reserved ? 'opacity-60' : ''}`}
                >
                  <Avatar
                    src={reserved ? null : p.profiles?.avatar_url}
                    name={p.profiles?.username}
                    size="xs"
                  />
                  <span className="text-xs text-text truncate flex-1">
                    {p.profiles?.username ?? 'Player'}
                  </span>
                  {reserved && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning/15 text-warning flex-shrink-0">
                      held
                    </span>
                  )}
                </Link>
              ))}
              {Array.from({ length: Math.max(0, emptySlots) }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="w-6 h-6 rounded-full border border-dashed border-border" />
                  <span className="text-xs text-text-muted">Open slot</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
