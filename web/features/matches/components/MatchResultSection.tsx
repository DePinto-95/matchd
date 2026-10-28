'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Trophy } from 'lucide-react';
import { Match, MatchResult } from '@matchd/shared/types';
import {
  MatchResultStatus,
  MatchWinnerSide,
  NotificationType,
  TeamSide,
} from '@matchd/shared/enums';
import { notificationService } from '@/services';
import { Button } from '@/components/ui/Button';
import { useMatchResult } from '@/hooks/useMatchResult';
import { ScoreInput } from './ScoreInput';

interface MatchResultSectionProps {
  match: Match;
  userId: string;
  myTeamSide: TeamSide | null;
  result: ReturnType<typeof useMatchResult>;
}

const winnerLabel = (side: MatchWinnerSide | null) =>
  side === MatchWinnerSide.Draw
    ? 'Draw'
    : `${side === MatchWinnerSide.Home ? 'Home' : 'Away'} team wins`;

/** A short "waiting for the other team" card with the score already sent. */
function WaitingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-surface-alt border border-border rounded-xl">
      <div className="w-2 h-2 rounded-full bg-warning animate-pulse flex-shrink-0" />
      <div>
        <p className="text-sm text-text">Waiting for the other team</p>
        <p className="text-xs text-text-muted mt-0.5">{children}</p>
      </div>
    </div>
  );
}

/**
 * The whole result flow for a past match: report a score, accept or dispute the
 * other team's, then accept or reject their counter.
 */
export function MatchResultSection({
  match,
  userId,
  myTeamSide,
  result: resultApi,
}: MatchResultSectionProps) {
  const {
    result,
    loading,
    submitting,
    submitResult,
    acceptResult,
    disputeResult,
    acceptCounter,
    rejectCounter,
  } = resultApi;

  const [reportOpen, setReportOpen] = useState(false);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeHome, setDisputeHome] = useState('');
  const [disputeAway, setDisputeAway] = useState('');

  const isMyTurnToRespond =
    (result?.status === MatchResultStatus.Submitted && result.submitter_team !== myTeamSide) ||
    (result?.status === MatchResultStatus.Disputed && result.submitter_team === myTeamSide);
  const isWaitingForOther =
    (result?.status === MatchResultStatus.Submitted && result.submitter_team === myTeamSide) ||
    (result?.status === MatchResultStatus.Disputed && result.submitter_team !== myTeamSide);

  const deriveWinner = (home: string, away: string): MatchWinnerSide => {
    const h = parseInt(home), a = parseInt(away);
    if (h > a) return MatchWinnerSide.Home;
    if (a > h) return MatchWinnerSide.Away;
    return MatchWinnerSide.Draw;
  };

  const handleSubmit = async () => {
    if (!myTeamSide) return;
    const h = parseInt(homeScore), a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a)) { toast.error('Enter valid scores'); return; }
    const { ok, error } = await submitResult(userId, myTeamSide, h, a, deriveWinner(homeScore, awayScore));
    if (!ok) toast.error(error ?? 'Failed to submit result');
    else { toast.success('Result submitted — waiting for other team'); setReportOpen(false); }
  };

  const handleAccept = async () => {
    if (!result) return;
    const { ok, error } = await acceptResult(result.id);
    if (!ok) toast.error(error ?? 'Failed to accept'); else toast.success('Result confirmed!');
  };

  const handleDispute = async () => {
    if (!result) return;
    const h = parseInt(disputeHome), a = parseInt(disputeAway);
    if (isNaN(h) || isNaN(a)) { toast.error('Enter valid scores'); return; }
    const { ok, error } = await disputeResult(result.id, userId, h, a, deriveWinner(disputeHome, disputeAway));
    if (!ok) { toast.error(error ?? 'Failed to dispute'); return; }

    await notificationService.create({
      user_id: result.submitted_by,
      type: NotificationType.ResultDisputed,
      title: 'Your result was disputed',
      body: `Your reported score for "${match.title}" was disputed. Review and respond.`,
      data: { match_id: match.id, sport: match.sport },
    });
    toast.success('Counter-result submitted');
    setDisputeOpen(false);
  };

  const handleAcceptCounter = async () => {
    if (!result) return;
    const { ok, error } = await acceptCounter(result.id);
    if (!ok) toast.error(error ?? 'Failed'); else toast.success('Result confirmed!');
  };

  const handleRejectCounter = async () => {
    if (!result) return;
    const { ok, error } = await rejectCounter(result.id);
    if (!ok) toast.error(error ?? 'Failed');
    else toast.success('Ratings will be based on player reviews only.');
  };

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-text-muted" />
          <h2 className="font-heading font-bold text-lg text-text">Match Result</h2>
        </div>
        {loading && (
          <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        )}
      </div>

      <div className="px-6 pb-5 flex flex-col gap-4">
        {result?.status === MatchResultStatus.Confirmed && <ConfirmedCard result={result} />}

        {result?.status === MatchResultStatus.Abandoned && (
          <div className="flex items-center gap-3 p-4 bg-warning/5 border border-warning/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-semibold text-warning text-sm">Result disputed</p>
              <p className="text-text-muted text-xs mt-0.5">
                Ratings will be based on player reviews only
              </p>
            </div>
          </div>
        )}

        {/* No result yet — this user can report one */}
        {!result && !loading && (
          !reportOpen ? (
            <Button variant="secondary" onClick={() => setReportOpen(true)}>
              Report Result
            </Button>
          ) : (
            <div className="flex flex-col gap-4 p-4 bg-surface-alt rounded-xl border border-border">
              <p className="text-sm text-text-muted">Enter the final score</p>
              <ScoreInput
                homeScore={homeScore}
                awayScore={awayScore}
                onHomeChange={setHomeScore}
                onAwayChange={setAwayScore}
              />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setReportOpen(false)}>Cancel</Button>
                <Button className="flex-1" loading={submitting} onClick={handleSubmit}>Submit</Button>
              </div>
            </div>
          )
        )}

        {/* A score was submitted — accept it or counter it */}
        {result?.status === MatchResultStatus.Submitted && (
          <>
            {isWaitingForOther && (
              <WaitingCard>
                You submitted: Home {result.home_score} – {result.away_score} Away
              </WaitingCard>
            )}
            {isMyTurnToRespond && (
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-surface-alt border border-border rounded-xl">
                  <p className="text-sm text-text font-medium">Other team reported</p>
                  <p className="text-2xl font-bold text-text my-2">
                    {result.home_score} – {result.away_score}
                  </p>
                  <p className="text-xs text-text-muted">{winnerLabel(result.winner_side)}</p>
                </div>
                {!disputeOpen ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" loading={submitting} onClick={() => setDisputeOpen(true)}>Dispute</Button>
                    <Button className="flex-1" loading={submitting} onClick={handleAccept}>Accept</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-4 bg-surface-alt rounded-xl border border-border">
                    <p className="text-sm text-text-muted">Enter the actual score</p>
                    <ScoreInput
                      homeScore={disputeHome}
                      awayScore={disputeAway}
                      onHomeChange={setDisputeHome}
                      onAwayChange={setDisputeAway}
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setDisputeOpen(false)}>Cancel</Button>
                      <Button className="flex-1" loading={submitting} onClick={handleDispute}>Submit Counter</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* A counter was submitted — accept it or walk away */}
        {result?.status === MatchResultStatus.Disputed && (
          <>
            {isWaitingForOther && (
              <WaitingCard>
                Counter submitted: Home {result.counter_home_score} – {result.counter_away_score} Away
              </WaitingCard>
            )}
            {isMyTurnToRespond && (
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-surface-alt border border-border rounded-xl">
                  <p className="text-sm text-text font-medium">Other team disputes — their score</p>
                  <p className="text-2xl font-bold text-text my-2">
                    {result.counter_home_score} – {result.counter_away_score}
                  </p>
                  <p className="text-xs text-text-muted">{winnerLabel(result.counter_winner_side)}</p>
                </div>
                <p className="text-xs text-text-muted px-1">
                  If you reject, no result is recorded — ratings will be based on player reviews only.
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1" loading={submitting} onClick={handleRejectCounter}>Reject</Button>
                  <Button className="flex-1" loading={submitting} onClick={handleAcceptCounter}>Accept</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Once confirmed, the counter score wins if there was one. */
function ConfirmedCard({ result }: { result: MatchResult }) {
  const countered = Boolean(result.counter_submitted_by);
  const home = countered ? result.counter_home_score : result.home_score;
  const away = countered ? result.counter_away_score : result.away_score;
  const winner = countered ? result.counter_winner_side : result.winner_side;

  return (
    <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/30 rounded-xl">
      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
      <div>
        <p className="font-semibold text-success text-sm">Result confirmed</p>
        <p className="text-text-muted text-xs mt-0.5">
          Home {home} – {away} Away · {winnerLabel(winner)}
        </p>
      </div>
    </div>
  );
}
