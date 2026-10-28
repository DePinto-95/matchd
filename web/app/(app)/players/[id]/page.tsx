'use client';

import { use, useEffect, useState } from 'react';
import { ReportReason } from '@matchd/shared/enums';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { useFriendActions } from '@/features/friends/hooks/useFriendActions';
import { PlayerProfileCard, ReportPlayerModal } from '@/features/players/components';
import { RatingsCard, RecentMatches } from '@/features/profile/components';
import { PageLoading } from '@/components/ui/PageLoading';
import { FriendRelationKind } from '@matchd/shared/enums';
import { BackButton } from '@/components/ui/BackButton';

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile: myProfile } = useAuthStore();
  const { getRelation, fetchFriends, reportUser } = useFriendStore();
  const { profile, ratings, matchHistory, playedCounts, loading, fetchProfile } = useProfile();

  const actions = useFriendActions();
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    fetchProfile(id);
    if (myProfile?.id) fetchFriends(myProfile.id);
  }, [id, fetchProfile, myProfile?.id, fetchFriends]);

  const isOwnProfile = myProfile?.id === id;
  const relation = isOwnProfile ? null : getRelation(id);

  /** One button cycles through the relationship states. */
  const handleFriendAction = async () => {
    if (!relation) return;
    if (relation.kind === FriendRelationKind.None) await actions.send(id);
    else if (relation.kind === FriendRelationKind.PendingSent) await actions.cancel(relation.friendshipId);
    else if (relation.kind === FriendRelationKind.PendingReceived) await actions.accept(relation.friendshipId);
    else if (relation.kind === FriendRelationKind.Friends) await actions.remove(relation.friendshipId);
  };

  const handleReport = async (reason: ReportReason, details?: string) => {
    if (!myProfile) return;
    setReporting(true);
    await reportUser(myProfile.id, id, reason, details);
    setReporting(false);
  };

  if (loading) return <PageLoading />;

  if (!profile) {
    return (
      <div className="text-center py-32">
        <p className="text-text-muted">Player not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <BackButton />

      <PlayerProfileCard
        profile={profile}
        relation={relation}
        acting={actions.actingOn !== null}
        onFriendAction={handleFriendAction}
        onReport={() => setReportOpen(true)}
      />

      {reportOpen && (
        <ReportPlayerModal
          submitting={reporting}
          onSubmit={handleReport}
          onClose={() => setReportOpen(false)}
        />
      )}

      <RatingsCard ratings={ratings} playedCounts={playedCounts} />

      <RecentMatches matches={matchHistory} />
    </div>
  );
}
