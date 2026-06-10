import { MatchParticipant } from '@/types';

/**
 * Review assignment.
 *
 * Each player is assigned a set of people to review: half teammates, half
 * opponents, randomly chosen but BALANCED so everyone receives a similar
 * number of reviews. Required reviews per side are capped at 2 (≤ 4 total);
 * a player may optionally review more from the "extra" lists.
 *
 * Balance is achieved with a deterministic circular assignment over lists
 * that are seeded-shuffled from the match id — so the choice is effectively
 * random per match yet identical on every client, which keeps each player's
 * received-review count even.
 */

const MAX_PER_SIDE = 2;

// Required reviews for a side given how many candidates are available:
// half (rounded), capped at MAX_PER_SIDE.
export function reviewSideCount(available: number): number {
  if (available <= 0) return 0;
  return Math.min(MAX_PER_SIDE, Math.round(available / 2));
}

// xmur3 string hash → 32-bit seed
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

// mulberry32 PRNG
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ReviewAssignment {
  assignedTeammates: MatchParticipant[];
  assignedOpponents: MatchParticipant[];
  extraTeammates: MatchParticipant[]; // remaining, for optional "review more"
  extraOpponents: MatchParticipant[];
}

/**
 * Compute who `myId` should review for a given match. Deterministic for a
 * fixed (participants, match) so every client produces a globally balanced
 * assignment.
 */
export function getReviewAssignment(
  participants: MatchParticipant[],
  myId: string,
  myTeamId: string | null | undefined,
  matchId: string,
): ReviewAssignment {
  const confirmed = participants.filter((p) => p.status === 'confirmed');

  // My team (including me) and the opponent team, canonically ordered then
  // seeded-shuffled so the same order is produced on every client.
  const myTeamAll = seededShuffle(
    confirmed
      .filter((p) => p.team_id === myTeamId)
      .sort((a, b) => a.player_id.localeCompare(b.player_id)),
    matchId + ':team',
  );
  const oppAll = seededShuffle(
    confirmed
      .filter((p) => p.team_id !== myTeamId)
      .sort((a, b) => a.player_id.localeCompare(b.player_id)),
    matchId + ':opp',
  );

  const n = myTeamAll.length; // includes me
  const m = oppAll.length;
  const myPos = Math.max(0, myTeamAll.findIndex((p) => p.player_id === myId));

  // Teammates available excludes me.
  const kTeam = reviewSideCount(n - 1);
  const kOpp = reviewSideCount(m);

  // Circular pick of the next kTeam teammates after me (skipping me).
  const assignedTeammates: MatchParticipant[] = [];
  for (let step = 1; assignedTeammates.length < kTeam && step < n; step++) {
    assignedTeammates.push(myTeamAll[(myPos + step) % n]);
  }

  // Circular pick of kOpp opponents starting at my position (balances in-degree).
  const assignedOpponents: MatchParticipant[] = [];
  for (let step = 0; assignedOpponents.length < kOpp && step < m; step++) {
    assignedOpponents.push(oppAll[(myPos + step) % m]);
  }

  const assignedTeamIds = new Set(assignedTeammates.map((p) => p.player_id));
  const assignedOppIds = new Set(assignedOpponents.map((p) => p.player_id));

  const extraTeammates = myTeamAll.filter(
    (p) => p.player_id !== myId && !assignedTeamIds.has(p.player_id),
  );
  const extraOpponents = oppAll.filter((p) => !assignedOppIds.has(p.player_id));

  return { assignedTeammates, assignedOpponents, extraTeammates, extraOpponents };
}
