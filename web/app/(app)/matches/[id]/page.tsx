'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { MatchStatus, TeamSide } from '@matchd/shared/enums';
import { useMatchResult } from '@/hooks/useMatchResult';
import { useMatchDetail } from '@/features/matches/hooks/useMatchDetail';
import {
  InviteCodePanel,
  JoinPanel,
  MatchActionBar,
  MatchCreatorCard,
  MatchHappenedPrompt,
  MatchHero,
  MatchResultSection,
  MatchTeamsCard,
  ShareWithFriendsPanel,
  SquadSpotsPanel,
} from '@/features/matches/components';
import { PageLoading } from '@/components/ui/PageLoading';
import { BackButton } from '@/components/ui/BackButton';

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const detail = useMatchDetail(id);
  const { match, loading, user, isPast, isParticipant } = detail;

  // Which panel is expanded. The panels own their own inner state.
  const [joinPanelOpen, setJoinPanelOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<TeamSide | null>(null);
  const [squadSpots, setSquadSpots] = useState(1);
  const [squadPanelOpen, setSquadPanelOpen] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [codePanelOpen, setCodePanelOpen] = useState(false);

  const resultApi = useMatchResult(id);
  const { fetchResult } = resultApi;
  useEffect(() => {
    if (isPast && isParticipant) fetchResult();
  }, [isPast, isParticipant, fetchResult]);

  const closeJoinPanel = () => {
    setJoinPanelOpen(false);
    setSelectedSide(null);
    setSquadSpots(1);
  };

  if (loading) return <PageLoading />;

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-text-muted">Match not found.</p>
        <Link href="/" className="mt-4 text-brand hover:underline text-sm">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <BackButton />

      <MatchHero match={match} occupancy={detail.actualOccupancy} isFull={detail.isFull} />

      <MatchTeamsCard match={match} />

      {isPast && detail.isCreator && match.status === MatchStatus.Open && (
        <MatchHappenedPrompt
          onConfirm={detail.confirmMatchHappened}
          onDeny={detail.confirmMatchDidntHappen}
        />
      )}

      {isPast && isParticipant && user && (
        <MatchResultSection
          match={match}
          userId={user.id}
          myTeamSide={detail.myTeamSide}
          result={resultApi}
        />
      )}

      <MatchCreatorCard match={match} />

      {joinPanelOpen && !isPast && !isParticipant && (
        <JoinPanel
          teamSize={match.team_size}
          homeLabel={detail.homeTeam?.name ?? 'Home'}
          awayLabel={detail.awayTeam?.name ?? 'Away'}
          homeCount={detail.homeCount}
          awayCount={detail.awayCount}
          homeOpen={detail.homeOpen}
          awayOpen={detail.awayOpen}
          selectedSide={selectedSide}
          onSelectSide={(side) => { setSelectedSide(side); setSquadSpots(1); }}
          squadSpots={squadSpots}
          onSquadSpotsChange={setSquadSpots}
        />
      )}

      {codePanelOpen && match.is_private && !isParticipant && !isPast && !detail.codeVerified && (
        <InviteCodePanel onVerify={detail.verifyCode} onClose={() => setCodePanelOpen(false)} />
      )}

      {squadPanelOpen && isParticipant && !isPast && (
        <SquadSpotsPanel
          currentOwnSpots={detail.myCurrentExtraSpots}
          currentOpponentSpots={detail.myCurrentExtraSpotOpponent}
          ownOpenSlots={detail.myTeamOpenSlots}
          opponentOpenSlots={detail.opponentOpenSlots}
          saving={detail.updatingSquad}
          onConfirm={detail.updateSquadSpots}
          onClose={() => setSquadPanelOpen(false)}
        />
      )}

      {sharePanelOpen && (
        <ShareWithFriendsPanel match={match} onClose={() => setSharePanelOpen(false)} />
      )}

      <MatchActionBar
        match={match}
        isCreator={detail.isCreator}
        isParticipant={Boolean(isParticipant)}
        isPast={isPast}
        isFull={detail.isFull}
        codeVerified={detail.codeVerified}
        ratingSubmitted={Boolean(detail.myRow?.rating_submitted)}
        joinPanelOpen={joinPanelOpen}
        selectedSide={selectedSide}
        joining={detail.joining}
        onOpenJoin={() => setJoinPanelOpen(true)}
        onCancelJoin={closeJoinPanel}
        onJoin={async () => {
          if (!selectedSide) return;
          await detail.join(selectedSide, squadSpots);
          closeJoinPanel();
        }}
        onToggleCodePanel={() => setCodePanelOpen((o) => !o)}
        onToggleSquadPanel={() => setSquadPanelOpen((o) => !o)}
        onToggleSharePanel={() => setSharePanelOpen((o) => !o)}
        onShare={detail.share}
        onLeave={detail.leave}
        onCancelMatch={detail.cancelMatch}
      />
    </div>
  );
}
