import Link from 'next/link';
import { Share2, Users } from 'lucide-react';
import { Match } from '@matchd/shared/types';
import { MatchStatus, TeamSide } from '@matchd/shared/enums';
import { isReviewWindowClosed } from '@matchd/shared/lib/helpers';
import { Button } from '@/components/ui/Button';

interface MatchActionBarProps {
  match: Match;
  isCreator: boolean;
  isParticipant: boolean;
  isPast: boolean;
  isFull: boolean;
  codeVerified: boolean;
  ratingSubmitted: boolean;

  joinPanelOpen: boolean;
  selectedSide: TeamSide | null;
  joining: boolean;
  onOpenJoin: () => void;
  onCancelJoin: () => void;
  onJoin: () => void;

  onToggleCodePanel: () => void;
  onToggleSquadPanel: () => void;
  onToggleSharePanel: () => void;
  onShare: () => void;
  onLeave: () => void;
  onCancelMatch: () => void;
}

/** The sticky row of actions at the bottom of the match page. */
export function MatchActionBar({
  match,
  isCreator,
  isParticipant,
  isPast,
  isFull,
  codeVerified,
  ratingSubmitted,
  joinPanelOpen,
  selectedSide,
  joining,
  onOpenJoin,
  onCancelJoin,
  onJoin,
  onToggleCodePanel,
  onToggleSquadPanel,
  onToggleSharePanel,
  onShare,
  onLeave,
  onCancelMatch,
}: MatchActionBarProps) {
  const iconButton = 'w-12 h-12 rounded-xl border border-border flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-alt transition-colors flex-shrink-0';

  const canJoin =
    !isPast &&
    !isParticipant &&
    !isFull &&
    match.status === MatchStatus.Open &&
    (!match.is_private || codeVerified);

  const canRate =
    isPast && isParticipant && !ratingSubmitted && !isReviewWindowClosed(match.scheduled_at);

  return (
    <div className="flex gap-3">
      <button onClick={onShare} className={iconButton}>
        <Share2 className="w-5 h-5" />
      </button>
      <button onClick={onToggleSharePanel} className={iconButton} title="Send to friends">
        <Users className="w-5 h-5" />
      </button>

      {canRate && (
        <Link href={`/matches/${match.id}/rate`} className="flex-1">
          <Button size="lg" className="w-full">Rate Players</Button>
        </Link>
      )}

      {canJoin &&
        (joinPanelOpen ? (
          <>
            <Button variant="secondary" onClick={onCancelJoin} className="flex-1">
              Cancel
            </Button>
            <Button onClick={onJoin} loading={joining} disabled={!selectedSide} className="flex-1">
              Join {selectedSide === TeamSide.Home ? 'Home' : selectedSide === TeamSide.Away ? 'Away' : '...'}
            </Button>
          </>
        ) : (
          <Button size="lg" className="flex-1" onClick={onOpenJoin}>
            Join Match
          </Button>
        ))}

      {!isPast && !isParticipant && match.is_private && !isFull && !codeVerified && (
        <Button variant="secondary" size="lg" className="flex-1" onClick={onToggleCodePanel}>
          Enter Invite Code
        </Button>
      )}

      {!isPast && isParticipant && !isCreator && (
        <>
          <Button variant="secondary" size="lg" onClick={onToggleSquadPanel}>
            + Squad
          </Button>
          <Button variant="danger" size="lg" className="flex-1" onClick={onLeave}>
            Leave Match
          </Button>
        </>
      )}

      {isCreator && match.status !== MatchStatus.Cancelled && !isPast && (
        <>
          <Button variant="secondary" size="lg" onClick={onToggleSquadPanel}>
            + Squad
          </Button>
          <Button variant="danger" size="lg" className="flex-1" onClick={onCancelMatch}>
            Cancel Match
          </Button>
        </>
      )}

      {isFull && !isParticipant && <Button disabled className="flex-1">Match Full</Button>}
    </div>
  );
}
