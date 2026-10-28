'use client';

import { use, useState } from 'react';
import { CheckCircle, Clock, Star } from 'lucide-react';
import { isReviewWindowClosed, REVIEW_WINDOW_DAYS } from '@matchd/shared/lib/helpers';
import { useRateMatch } from '@/features/rate/hooks/useRateMatch';
import { RateClosedScreen, RateSection } from '@/features/rate/components';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/PageLoading';

export default function RatePlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const rating = useRateMatch(id);
  const { match, assignment, assignedAll, extraAll } = rating;

  const [showExtra, setShowExtra] = useState(false);

  if (!match) return <PageLoading />;

  if (isReviewWindowClosed(match.scheduled_at)) {
    return (
      <RateClosedScreen icon={Clock} title="Review period ended">
        Reviews close {REVIEW_WINDOW_DAYS} days after the match. Skipped reviews
        don&apos;t affect anyone&apos;s rating.
      </RateClosedScreen>
    );
  }

  if (rating.myRow?.rating_submitted) {
    return (
      <RateClosedScreen icon={CheckCircle} iconClassName="text-success" title="Ratings submitted">
        You&apos;ve already rated your players for this match.
      </RateClosedScreen>
    );
  }

  const nTeam = assignment?.assignedTeammates.length ?? 0;
  const nOpp = assignment?.assignedOpponents.length ?? 0;

  // Props every RateSection needs, so each call site stays readable.
  const sectionProps = {
    scores: rating.scores,
    rated: rating.rated,
    submitting: rating.submitting,
    onScoreChange: rating.setScore,
    onRate: rating.rate,
    onSkip: rating.skip,
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <BackButton />

      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Rate Players</h1>
        <p className="text-text-muted text-sm mt-1">{match.title}</p>
        {assignedAll.length > 0 && (
          <p className="text-text-muted text-xs mt-1">
            Review {nTeam > 0 ? `${nTeam} teammate${nTeam !== 1 ? 's' : ''}` : ''}
            {nTeam > 0 && nOpp > 0 ? ' and ' : ''}
            {nOpp > 0 ? `${nOpp} opponent${nOpp !== 1 ? 's' : ''}` : ''}
          </p>
        )}
      </div>

      {assignedAll.length === 0 ? (
        <div className="text-center py-20">
          <Star className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-text-muted text-sm">No players to rate</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <RateSection
            label="Your team"
            players={assignment?.assignedTeammates ?? []}
            showSkip
            {...sectionProps}
          />
          <RateSection
            label="Opponents"
            players={assignment?.assignedOpponents ?? []}
            showSkip
            {...sectionProps}
          />

          {!showExtra && extraAll.length > 0 && (
            <button
              onClick={() => setShowExtra(true)}
              className="text-sm text-brand hover:text-brand/80 transition-colors text-center py-2"
            >
              + Review more players ({extraAll.length})
            </button>
          )}

          {showExtra && (
            <div className="flex flex-col gap-6 border-t border-border pt-6">
              <p className="text-xs text-text-muted px-1">
                Optional — review anyone else from the match.
              </p>
              <RateSection
                label="More teammates"
                players={assignment?.extraTeammates ?? []}
                showSkip={false}
                {...sectionProps}
              />
              <RateSection
                label="More opponents"
                players={assignment?.extraOpponents ?? []}
                showSkip={false}
                {...sectionProps}
              />
            </div>
          )}

          {rating.canFinish && (
            <Button loading={rating.submittingDone} onClick={rating.finish} className="w-full mt-2">
              Done
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
