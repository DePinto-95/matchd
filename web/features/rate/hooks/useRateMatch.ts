import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { isReviewWindowClosed, REVIEW_WINDOW_DAYS } from '@matchd/shared/lib/helpers';
import { Match, MatchParticipant } from '@matchd/shared/types';
import { participantService, ratingService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useRatings } from '@/hooks/useRatings';
import { getReviewAssignment } from '@/lib/reviewAssignment';

/**
 * The post-match rating flow: who this player has been asked to review, the
 * scores they have entered, and submitting them.
 */
export const useRateMatch = (matchId: string) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchMatchById } = useMatchStore();

  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [rated, setRated] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [submittingDone, setSubmittingDone] = useState(false);

  const loadMatch = useCallback(async () => {
    setMatch(await fetchMatchById(matchId));
  }, [matchId, fetchMatchById]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  const { submitRating, submitting } = useRatings(matchId, match?.sport);

  const myRow = match?.match_participants?.find((p) => p.player_id === user?.id);

  // Balanced assignment: half teammates, half opponents, capped per side.
  const assignment = useMemo(() => {
    if (!match || !user) return null;
    return getReviewAssignment(match.match_participants ?? [], user.id, myRow?.team_id, match.id);
  }, [match, user, myRow?.team_id]);

  const assignedAll = useMemo<MatchParticipant[]>(
    () => (assignment ? [...assignment.assignedTeammates, ...assignment.assignedOpponents] : []),
    [assignment]
  );
  const extraAll = useMemo<MatchParticipant[]>(
    () => (assignment ? [...assignment.extraTeammates, ...assignment.extraOpponents] : []),
    [assignment]
  );

  // Resume: load any scores this user already submitted for this match.
  useEffect(() => {
    if (!user?.id) return;
    ratingService.listSubmittedScores(matchId, user.id).then((rows) => {
      if (!rows.length) return;
      setScores((prev) => {
        const loaded: Record<string, number> = {};
        rows.forEach((r) => { loaded[r.rated_player_id] = r.score; });
        // Anything typed since the fetch started wins.
        return { ...loaded, ...prev };
      });
      setRated(new Set(rows.map((r) => r.rated_player_id)));
    });
  }, [user?.id, matchId]);

  /** Done unlocks once every assigned player is either rated or skipped. */
  const canFinish =
    assignedAll.length === 0 ||
    assignedAll.every((p) => rated.has(p.player_id) || skipped.has(p.player_id));

  const setScore = (playerId: string, score: number) =>
    setScores((prev) => ({ ...prev, [playerId]: score }));

  const skip = (playerId: string) => setSkipped((prev) => new Set([...prev, playerId]));

  const rate = async (participant: MatchParticipant) => {
    if (!user) return;
    if (match && isReviewWindowClosed(match.scheduled_at)) {
      toast.error(`Reviews close ${REVIEW_WINDOW_DAYS} days after the match`);
      return;
    }

    const score = scores[participant.player_id];
    if (!score || score < 1 || score > 10) {
      toast.error('Please enter a score between 1 and 10');
      return;
    }

    const ok = await submitRating(user.id, participant.player_id, score);
    if (!ok) { toast.error('Failed to submit rating'); return; }

    setRated((prev) => new Set([...prev, participant.player_id]));
    setSkipped((prev) => {
      const next = new Set(prev);
      next.delete(participant.player_id);
      return next;
    });
  };

  const finish = async () => {
    if (!user) return;
    setSubmittingDone(true);
    await participantService.markRatingSubmitted(matchId, user.id);
    setSubmittingDone(false);
    router.push('/');
  };

  return {
    match,
    myRow,
    assignment,
    assignedAll,
    extraAll,
    scores,
    rated,
    submitting,
    submittingDone,
    canFinish,
    setScore,
    skip,
    rate,
    finish,
  };
};
