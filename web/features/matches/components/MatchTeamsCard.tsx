import { Match } from '@matchd/shared/types';
import { TeamSlots } from './TeamSlots';

export function MatchTeamsCard({ match }: { match: Match }) {
  if (!match.match_teams?.length) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h2 className="font-heading font-bold text-lg text-text mb-4">Teams</h2>
      <TeamSlots
        teams={match.match_teams}
        participants={match.match_participants ?? []}
        teamSize={match.team_size}
      />
    </div>
  );
}
