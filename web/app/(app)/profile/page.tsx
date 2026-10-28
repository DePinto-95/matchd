'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { useProfile } from '@/hooks/useProfile';
import { useProfileActions } from '@/features/profile/hooks/useProfileActions';
import {
  EditProfileModal,
  ProfileHeaderCard,
  RatingsCard,
  RecentMatches,
} from '@/features/profile/components';
import { PageLoading } from '@/components/ui/PageLoading';

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const { friends, fetchFriends } = useFriendStore();
  const {
    profile,
    ratings,
    matchHistory,
    playedCounts,
    loading,
    fetchProfile: fetchDetailedProfile,
  } = useProfile();

  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDetailedProfile(user.id);
      fetchFriends(user.id);
    }
  }, [user?.id, fetchDetailedProfile, fetchFriends]);

  // The auth store drives the navbar; the detailed hook drives this page.
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await Promise.all([fetchProfile(user.id), fetchDetailedProfile(user.id)]);
  }, [user?.id, fetchProfile, fetchDetailedProfile]);

  const actions = useProfileActions({ userId: user?.id, onChanged: refreshProfile });

  if (loading || !profile) return <PageLoading />;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <ProfileHeaderCard
        profile={profile}
        friendCount={friends.length}
        uploading={actions.uploading}
        onAvatarSelected={actions.uploadAvatar}
        onRemoveAvatar={actions.removeAvatar}
        onEdit={() => setEditOpen(true)}
      />

      <RatingsCard ratings={ratings} playedCounts={playedCounts} />

      <RecentMatches matches={matchHistory} />

      {editOpen && (
        <EditProfileModal
          profile={profile}
          saving={actions.saving}
          onSave={actions.saveProfile}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
