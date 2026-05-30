'use client';

import { useEffect, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, UserPlus, UserCheck, UserX, Clock, Flag } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { SPORTS } from '@/constants/sports';
import { getRatingColor } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MatchCard } from '@/components/match/MatchCard';
import type { ReportReason } from '@/types';

const REPORT_REASONS: Record<ReportReason, string> = {
  spam_scam: 'Spam / Scam',
  inappropriate_behavior: 'Inappropriate Behavior',
  fake_profile: 'Fake Profile',
  other: 'Other',
};

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile: myProfile } = useAuthStore();
  const { getRelation, fetchFriends, sendRequest, cancelRequest, acceptRequest, declineRequest, removeFriend, reportUser } = useFriendStore();
  const { profile, ratings, matchHistory, loading, fetchProfile } = useProfile();

  const [actingOn, setActingOn] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam_scam');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    fetchProfile(id);
    if (myProfile?.id) fetchFriends(myProfile.id);
  }, [id, fetchProfile, myProfile?.id, fetchFriends]);

  const isOwnProfile = myProfile?.id === id;
  const relation = isOwnProfile ? null : getRelation(id);

  const handleFriendAction = async () => {
    if (!myProfile || !relation) return;
    setActingOn(id);
    if (relation.kind === 'none') await sendRequest(myProfile.id, id, myProfile.username);
    else if (relation.kind === 'pending_sent') await cancelRequest(relation.friendshipId);
    else if (relation.kind === 'pending_received') await acceptRequest(relation.friendshipId, myProfile.username);
    else if (relation.kind === 'friends') await removeFriend(relation.friendshipId);
    setActingOn(null);
  };

  const handleReport = async () => {
    if (!myProfile) return;
    setReporting(true);
    await reportUser(myProfile.id, id, reportReason, reportDetails.trim() || undefined);
    setReporting(false);
    setReportOpen(false);
    setReportDetails('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-32">
        <p className="text-text-muted">Player not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-xl text-text">{profile.full_name ?? profile.username}</h1>
            <p className="text-text-muted text-sm">@{profile.username}</p>
            {profile.location && <p className="text-text-muted text-sm mt-1">📍 {profile.location}</p>}
            <Badge variant="brand" className="mt-2 capitalize">{profile.account_type}</Badge>
          </div>
        </div>
        {profile.bio && <p className="mt-4 text-text-muted text-sm leading-relaxed">{profile.bio}</p>}

        {!isOwnProfile && relation && (
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
            <Button
              variant={relation.kind === 'friends' ? 'secondary' : 'primary'}
              size="sm"
              loading={actingOn === id}
              onClick={handleFriendAction}
            >
              {relation.kind === 'none' && <><UserPlus className="w-4 h-4" /> Add Friend</>}
              {relation.kind === 'pending_sent' && <><Clock className="w-4 h-4" /> Pending</>}
              {relation.kind === 'pending_received' && <><UserCheck className="w-4 h-4" /> Accept</>}
              {relation.kind === 'friends' && <><UserX className="w-4 h-4" /> Remove Friend</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
              <Flag className="w-4 h-4" />
              Report
            </Button>
          </div>
        )}
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={e => { if (e.target === e.currentTarget) setReportOpen(false); }}
        >
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-heading font-bold text-lg text-text mb-4">Report User</h2>
            <div className="flex flex-col gap-3 mb-4">
              {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reportReason"
                    value={value}
                    checked={reportReason === value}
                    onChange={() => setReportReason(value)}
                    className="accent-brand"
                  />
                  <span className="text-sm text-text">{label}</span>
                </label>
              ))}
            </div>
            <textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button className="flex-1" loading={reporting} onClick={handleReport}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-lg text-text mb-4">Ratings</h2>
          <div className="flex flex-col gap-4">
            {ratings.map((r) => {
              const sport = SPORTS[r.sport];
              const color = getRatingColor(r.rating);
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-xl">{sport?.emoji ?? '🏅'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text">{sport?.label ?? r.sport}</span>
                      <span className="text-sm font-bold" style={{ color }}>{r.rating.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(r.rating / 10) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{r.total_matches} matches · {r.wins} wins</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matchHistory.length > 0 && (
        <div>
          <h2 className="font-heading font-bold text-lg text-text mb-4">Recent Matches</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchHistory.slice(0, 4).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
