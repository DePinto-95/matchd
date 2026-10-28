import { MatchParticipant } from '@matchd/shared/types';

/**
 * How many places a match actually has taken.
 *
 * Every participant row counts as themselves plus any spots they are holding —
 * `matches.current_players` and `matches.status` can lag behind these holds,
 * so fullness is always computed from the rows rather than read off the match.
 */
export const getActualOccupancy = (participants: MatchParticipant[] = []): number =>
  participants.reduce(
    (sum, p) => sum + 1 + (p.extra_spots ?? 0) + (p.extra_spots_opponent ?? 0),
    0
  );

/**
 * How many places one team has taken: its own members and their `extra_spots`,
 * plus any `extra_spots_opponent` the *other* team's members are holding on it.
 */
export const getTeamOccupancy = (
  participants: MatchParticipant[] = [],
  teamId?: string | null,
  otherTeamId?: string | null
): number => {
  const teamMembers = participants.filter((p) => p.team_id === teamId);
  const otherMembers = participants.filter((p) => p.team_id === otherTeamId);

  return (
    teamMembers.reduce((sum, p) => sum + 1 + (p.extra_spots ?? 0), 0) +
    otherMembers.reduce((sum, p) => sum + (p.extra_spots_opponent ?? 0), 0)
  );
};
