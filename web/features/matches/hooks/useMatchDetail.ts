import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { SPORTS } from '@matchd/shared/constants/sports';
import { isMatchPast } from '@matchd/shared/lib/helpers';
import { Match } from '@matchd/shared/types';
import { MatchStatus, TeamSide } from '@matchd/shared/enums';
import { matchService, participantService, ratingService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useFriendStore } from '@/stores/friendStore';
import { useMatchRealtime } from '@/hooks/useRealtime';
import { getActualOccupancy, getTeamOccupancy } from '../lib/occupancy';

export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Everything the match detail page needs: the match itself, the derived values
 * that depend on it, and the actions that change it.
 *
 * Panel-local state (score inputs, invite code text, squad steppers, friend
 * selection) deliberately lives in the panel components instead of here.
 */
export const useMatchDetail = (id: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { fetchMatchById, notifyMatchCompletion } = useMatchStore();
  const { fetchFriends } = useFriendStore();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [updatingSquad, setUpdatingSquad] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // Destructive actions ask first. The page renders whatever is pending here
  // as a ConfirmDialog, replacing the native confirm() (MD-23).
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);

  const loadMatch = useCallback(async () => {
    setMatch(await fetchMatchById(id));
    setLoading(false);
  }, [id, fetchMatchById]);

  useEffect(() => {
    loadMatch();
    if (user?.id) fetchFriends(user.id);
  }, [loadMatch, user?.id, fetchFriends]);

  useMatchRealtime(id, loadMatch);

  const participants = match?.match_participants ?? [];
  const isParticipant = participants.some((p) => p.player_id === user?.id);
  const isCreator = match?.creator_id === user?.id;
  const isPast = match ? isMatchPast(match.scheduled_at, match.duration_minutes) : false;

  const actualOccupancy = getActualOccupancy(participants);
  const isFull = match ? actualOccupancy >= match.max_players : false;

  // Auto-unlock when arriving via a match_invite notification's ?code= link.
  useEffect(() => {
    if (!match?.is_private || !match.invite_code || codeVerified) return;
    const code = searchParams.get('code');
    if (code && code.toUpperCase() === match.invite_code.toUpperCase()) {
      setCodeVerified(true);
    }
  }, [match, searchParams, codeVerified]);

  // Ask the DB to notify participants once the match is over.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current) return;
    if (!match || !isParticipant || match.rating_notifications_sent) return;
    if (!isMatchPast(match.scheduled_at, match.duration_minutes)) return;
    notifiedRef.current = true;
    notifyMatchCompletion(match.id);
  }, [match, isParticipant, notifyMatchCompletion]);

  const myRow = participants.find((p) => p.player_id === user?.id);
  const myCurrentExtraSpots = myRow?.extra_spots ?? 0;
  const myCurrentExtraSpotOpponent = myRow?.extra_spots_opponent ?? 0;
  const opponentTeamId = match?.match_teams?.find((t) => t.id !== myRow?.team_id)?.id;

  const myTeamOpenSlots =
    (match?.team_size ?? 0) - getTeamOccupancy(participants, myRow?.team_id, opponentTeamId);
  const opponentOpenSlots =
    (match?.team_size ?? 0) - getTeamOccupancy(participants, opponentTeamId, myRow?.team_id);

  const homeTeam = match?.match_teams?.find((t) => t.side === TeamSide.Home);
  const awayTeam = match?.match_teams?.find((t) => t.side === TeamSide.Away);
  const homeCount = getTeamOccupancy(participants, homeTeam?.id, awayTeam?.id);
  const awayCount = getTeamOccupancy(participants, awayTeam?.id, homeTeam?.id);
  const homeOpen = (match?.team_size ?? 0) - homeCount;
  const awayOpen = (match?.team_size ?? 0) - awayCount;

  const myTeamSide = match?.match_teams?.find((t) => t.id === myRow?.team_id)?.side ?? null;

  const join = async (side: TeamSide, squadSpots: number) => {
    if (!match || !user) return;
    setJoining(true);

    const rating = await ratingService.getForSport(user.id, match.sport);
    if (rating < match.min_rating || rating > match.max_rating) {
      toast.error(
        `This match requires a rating between ${match.min_rating} and ${match.max_rating}. Yours: ${rating.toFixed(1)}`
      );
      setJoining(false);
      return;
    }

    const targetTeam = match.match_teams?.find((t) => t.side === side);
    const otherTeam = match.match_teams?.find((t) => t.side !== side);
    const currentOnTeam = getTeamOccupancy(participants, targetTeam?.id, otherTeam?.id);

    if (currentOnTeam + squadSpots > match.team_size) {
      toast.error(`Only ${match.team_size - currentOnTeam} spot(s) left on that team.`);
      setJoining(false);
      return;
    }

    const extraSpots = squadSpots - 1;
    const { error } = await participantService.join({
      matchId: match.id,
      playerId: user.id,
      teamId: targetTeam?.id ?? null,
      extraSpots,
    });

    if (error) { toast.error(error.message); setJoining(false); return; }

    toast.success(
      extraSpots > 0
        ? `Joined and reserved ${extraSpots} extra spot(s) for your squad!`
        : 'You joined the match!'
    );
    setJoining(false);
    loadMatch();
  };

  const leave = () =>
    setConfirmation({
      title: 'Leave this match?',
      message: 'Your place and any spots you reserved will be released for others to take.',
      confirmLabel: 'Leave match',
      onConfirm: async () => {
        if (!match || !user) return;
        const heldSpots = myCurrentExtraSpots + myCurrentExtraSpotOpponent;
        await participantService.leave(match.id, user.id, heldSpots);
        toast.success('You left the match — all your reserved spots were released');
        loadMatch();
      },
    });

  const updateSquadSpots = async (totalOwnSpots: number, opponentSpots: number) => {
    if (!match || !user || !myRow) return;
    setUpdatingSquad(true);

    const newExtraSpots = totalOwnSpots - 1;
    const myDelta = newExtraSpots - myCurrentExtraSpots;
    const oppDelta = opponentSpots - myCurrentExtraSpotOpponent;

    if (myDelta > myTeamOpenSlots) {
      toast.error(`Only ${myTeamOpenSlots} more spot(s) available on your team.`);
      setUpdatingSquad(false);
      return false;
    }
    if (oppDelta > opponentOpenSlots) {
      toast.error(`Only ${opponentOpenSlots} more spot(s) available on the opponent team.`);
      setUpdatingSquad(false);
      return false;
    }

    const { error } = await participantService.updateHeldSpots(
      match.id,
      user.id,
      newExtraSpots,
      opponentSpots,
      myDelta + oppDelta
    );
    if (error) { toast.error(error.message); setUpdatingSquad(false); return false; }

    const parts = [
      newExtraSpots > 0 ? `${newExtraSpots} on your team` : '',
      opponentSpots > 0 ? `${opponentSpots} on opponent team` : '',
    ].filter(Boolean);
    toast.success(parts.length ? `Reserved: ${parts.join(', ')}` : 'Squad spots updated.');

    setUpdatingSquad(false);
    loadMatch();
    return true;
  };

  const cancelMatch = () =>
    setConfirmation({
      title: 'Cancel this match?',
      message: 'This cancels the match for everyone who joined. It cannot be undone.',
      confirmLabel: 'Cancel match',
      onConfirm: async () => {
        if (!match) return;
        await matchService.updateStatus(match.id, MatchStatus.Cancelled);
        toast.success('Match cancelled');
        router.push('/');
      },
    });

  const confirmMatchHappened = async () => {
    if (!match) return;
    await matchService.updateStatus(match.id, MatchStatus.Completed);
    await matchService.notifyCompletion(match.id);
    toast.success('Match confirmed! Players will be notified to rate and report the result.');
    loadMatch();
  };

  const confirmMatchDidntHappen = () =>
    setConfirmation({
      title: 'Mark as not played?',
      message: 'This cancels the match for everyone. No ratings or result will be recorded.',
      confirmLabel: "It didn't happen",
      onConfirm: async () => {
        if (!match) return;
        await matchService.updateStatus(match.id, MatchStatus.Cancelled);
        toast.success('Match marked as not happened.');
        router.push('/');
      },
    });

  const share = () => {
    if (!match) return;
    const text =
      match.is_private && match.invite_code
        ? `Join my ${SPORTS[match.sport].label} match on MatchD! Code: ${match.invite_code}`
        : `Check out this match: ${match.title}`;
    if (navigator.share) {
      navigator.share({ title: match.title, text });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  /** Returns true when the code matched, so the panel can close itself. */
  const verifyCode = (input: string) => {
    if (!match?.invite_code) return false;
    if (input.trim().toUpperCase() === match.invite_code.toUpperCase()) {
      setCodeVerified(true);
      toast.success('Code verified — you can now join!');
      return true;
    }
    toast.error('Invalid invite code.');
    return false;
  };

  return {
    match,
    loading,
    user,
    myRow,
    myTeamSide,

    isCreator,
    isParticipant,
    isPast,
    isFull,
    actualOccupancy,
    codeVerified,

    homeTeam,
    awayTeam,
    homeCount,
    awayCount,
    homeOpen,
    awayOpen,
    myCurrentExtraSpots,
    myCurrentExtraSpotOpponent,
    myTeamOpenSlots,
    opponentOpenSlots,

    joining,
    updatingSquad,
    confirmation,
    dismissConfirmation: () => setConfirmation(null),

    join,
    leave,
    updateSquadSpots,
    cancelMatch,
    confirmMatchHappened,
    confirmMatchDidntHappen,
    share,
    verifyCode,
    reload: loadMatch,
  };
};

export type MatchDetail = ReturnType<typeof useMatchDetail>;
