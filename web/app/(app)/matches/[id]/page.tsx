'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MapPin, Clock, Users, Share2, ChevronLeft, Star, Lock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useFriendStore } from '@/stores/friendStore';
import { useMatchRealtime } from '@/hooks/useRealtime';
import { SPORTS } from '@/constants/sports';
import { formatMatchDate, formatPrice, isMatchPast } from '@/lib/helpers';
import { Match } from '@/types';
import { TeamSlots } from '@/components/match/TeamSlots';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { fetchMatchById } = useMatchStore();
  const { friends, fetchFriends, sendMatchInvites } = useFriendStore();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinPanelOpen, setJoinPanelOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'home' | 'away' | null>(null);
  const [squadSpots, setSquadSpots] = useState(1);
  const [squadPanelOpen, setSquadPanelOpen] = useState(false);
  const [newTotalSpots, setNewTotalSpots] = useState(1);
  const [newOpponentSpots, setNewOpponentSpots] = useState(0);
  const [updatingSquad, setUpdatingSquad] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);

  const loadMatch = useCallback(async () => {
    const data = await fetchMatchById(id);
    setMatch(data);
    setLoading(false);
  }, [id, fetchMatchById]);

  useEffect(() => {
    loadMatch();
    if (user?.id) fetchFriends(user.id);
  }, [loadMatch, user?.id, fetchFriends]);
  useMatchRealtime(id, loadMatch);

  const isParticipant = match?.match_participants?.some((p) => p.player_id === user?.id);
  const isCreator = match?.creator_id === user?.id;
  const isFull = match?.status === 'full';
  const isPast = match ? isMatchPast(match.scheduled_at, match.duration_minutes) : false;

  const myRow = match?.match_participants?.find((p) => p.player_id === user?.id);
  const myCurrentExtraSpots = myRow?.extra_spots ?? 0;
  const myCurrentExtraSpotOpponent = myRow?.extra_spots_opponent ?? 0;
  const opponentTeamId = match?.match_teams?.find((t) => t.id !== myRow?.team_id)?.id;
  const myTeamMembers = match?.match_participants?.filter((p) => p.team_id === myRow?.team_id) ?? [];
  const opponentMembers = match?.match_participants?.filter((p) => p.team_id === opponentTeamId) ?? [];
  const myTeamOccupied = myTeamMembers.reduce((sum, p) => sum + 1 + (p.extra_spots ?? 0), 0)
    + opponentMembers.reduce((sum, p) => sum + (p.extra_spots_opponent ?? 0), 0);
  const opponentOccupied = opponentMembers.reduce((sum, p) => sum + 1 + (p.extra_spots ?? 0), 0)
    + myTeamMembers.reduce((sum, p) => sum + (p.extra_spots_opponent ?? 0), 0);
  const myTeamOpenSlots = (match?.team_size ?? 0) - myTeamOccupied;
  const opponentOpenSlots = (match?.team_size ?? 0) - opponentOccupied;

  const handleUpdateSquadSpots = async () => {
    if (!match || !user || !myRow) return;
    setUpdatingSquad(true);
    const newExtraSpots = newTotalSpots - 1;
    const myDelta = newExtraSpots - myCurrentExtraSpots;
    const oppDelta = newOpponentSpots - myCurrentExtraSpotOpponent;
    if (myDelta > myTeamOpenSlots) {
      toast.error(`Only ${myTeamOpenSlots} more spot(s) available on your team.`);
      setUpdatingSquad(false);
      return;
    }
    if (oppDelta > opponentOpenSlots) {
      toast.error(`Only ${opponentOpenSlots} more spot(s) available on the opponent team.`);
      setUpdatingSquad(false);
      return;
    }
    const { error } = await supabase
      .from('match_participants')
      .update({ extra_spots: newExtraSpots, extra_spots_opponent: newOpponentSpots })
      .eq('match_id', match.id)
      .eq('player_id', user.id);
    if (error) { toast.error(error.message); setUpdatingSquad(false); return; }
    const totalDelta = myDelta + oppDelta;
    if (totalDelta !== 0) {
      await supabase.rpc('adjust_match_player_count', { p_match_id: match.id, p_delta: totalDelta });
    }
    const parts = [
      newExtraSpots > 0 ? `${newExtraSpots} on your team` : '',
      newOpponentSpots > 0 ? `${newOpponentSpots} on opponent team` : '',
    ].filter(Boolean);
    toast.success(parts.length ? `Reserved: ${parts.join(', ')}` : 'Squad spots updated.');
    setSquadPanelOpen(false);
    setUpdatingSquad(false);
    loadMatch();
  };

  const handleJoin = async () => {
    if (!match || !user || !selectedSide) return;
    setJoining(true);

    const { data: userRating } = await supabase
      .from('player_ratings')
      .select('rating')
      .eq('player_id', user.id)
      .eq('sport', match.sport)
      .single();

    const rating = userRating?.rating ?? 5.0;
    if (rating < match.min_rating || rating > match.max_rating) {
      toast.error(`This match requires a rating between ${match.min_rating} and ${match.max_rating}. Yours: ${rating.toFixed(1)}`);
      setJoining(false);
      return;
    }

    const targetTeam = match.match_teams?.find((t) => t.side === selectedSide);
    const currentOnTeam = match.match_participants?.filter((p) => p.team_id === targetTeam?.id).length ?? 0;

    if (currentOnTeam + squadSpots > match.team_size) {
      toast.error(`Only ${match.team_size - currentOnTeam} spot(s) left on that team.`);
      setJoining(false);
      return;
    }

    const extraSpots = squadSpots - 1;

    const { error } = await supabase.from('match_participants').insert({
      match_id: match.id,
      player_id: user.id,
      team_id: targetTeam?.id ?? null,
      status: 'confirmed',
      extra_spots: extraSpots,
    });

    if (error) { toast.error(error.message); setJoining(false); return; }

    // The DB trigger already added 1 to current_players for the INSERT.
    // Call the RPC to add the extra reserved spots to the count.
    if (extraSpots > 0) {
      await supabase.rpc('adjust_match_player_count', {
        p_match_id: match.id,
        p_delta: extraSpots,
      });
      toast.success(`Joined and reserved ${extraSpots} extra spot(s) for your squad!`);
    } else {
      toast.success('You joined the match!');
    }

    setJoinPanelOpen(false);
    setSelectedSide(null);
    setSquadSpots(1);
    setJoining(false);
    loadMatch();
  };

  const handleLeave = async () => {
    if (!match || !user) return;
    if (!confirm('Are you sure you want to leave this match?')) return;

    // Find the participant row to know how many extra spots to release
    const participantRow = match.match_participants?.find((p) => p.player_id === user.id);
    const extraSpots = (participantRow as { extra_spots?: number })?.extra_spots ?? 0;

    await supabase
      .from('match_participants')
      .delete()
      .eq('match_id', match.id)
      .eq('player_id', user.id);

    // The trigger subtracts 1 for the DELETE; subtract extra spots too
    if (extraSpots > 0) {
      await supabase.rpc('adjust_match_player_count', {
        p_match_id: match.id,
        p_delta: -extraSpots,
      });
    }

    toast.success('You left the match — all your reserved spots were released');
    loadMatch();
  };

  const handleCancelMatch = async () => {
    if (!match) return;
    if (!confirm('This will cancel the match for all participants. Continue?')) return;
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', match.id);
    toast.success('Match cancelled');
    router.push('/');
  };

  const handleShare = () => {
    if (!match) return;
    const text = match.is_private && match.invite_code
      ? `Join my ${SPORTS[match.sport].label} match on MatchD! Code: ${match.invite_code}`
      : `Check out this match: ${match.title}`;
    if (navigator.share) {
      navigator.share({ title: match.title, text });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleSendToFriends = async () => {
    if (!match || !profile || selectedFriendIds.size === 0) return;
    setSendingInvites(true);
    await sendMatchInvites(profile.username, [...selectedFriendIds], {
      id: match.id,
      sport: match.sport,
      title: match.title,
    });
    setSendingInvites(false);
    setSharePanelOpen(false);
    setSelectedFriendIds(new Set());
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => {
      const next = new Set(prev);
      next.has(friendId) ? next.delete(friendId) : next.add(friendId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-text-muted">Match not found</p>
        <Link href="/" className="mt-4 text-brand hover:underline text-sm">Back to home</Link>
      </div>
    );
  }

  const sport = SPORTS[match.sport];
  const homeTeam = match.match_teams?.find((t) => t.side === 'home');
  const awayTeam = match.match_teams?.find((t) => t.side === 'away');
  const homeCount = match.match_participants?.filter((p) => p.team_id === homeTeam?.id).length ?? 0;
  const awayCount = match.match_participants?.filter((p) => p.team_id === awayTeam?.id).length ?? 0;
  const homeOpen = match.team_size - homeCount;
  const awayOpen = match.team_size - awayCount;
  const selectedTeamOpen = selectedSide === 'home' ? homeOpen : selectedSide === 'away' ? awayOpen : 0;

  const statusVariant = match.status === 'open' ? 'success' : match.status === 'full' ? 'warning' : 'error';

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      {/* Hero card */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: sport.color }} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{sport.emoji}</span>
              <div>
                <h1 className="font-heading font-bold text-xl text-text">{match.title}</h1>
                <p className="text-text-muted text-sm">{sport.label}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={statusVariant}>{match.status.replace('_', ' ').toUpperCase()}</Badge>
              {match.is_private && (
                <div className="flex items-center gap-1 text-text-muted text-xs">
                  <Lock className="w-3 h-3" />
                  <span>Invite only</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-text">
              <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span>{formatMatchDate(match.scheduled_at)} · {match.duration_minutes}min</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text">
              <MapPin className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span>{match.venues?.name ?? match.location_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text">
              <Users className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span>{match.current_players}/{match.max_players} players · {match.team_size}v{match.team_size}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text">
              <Star className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span>Rating {match.min_rating}–{match.max_rating}</span>
              <span className="ml-auto font-semibold" style={{ color: match.price_per_player > 0 ? '#f59e0b' : '#22c55e' }}>
                {formatPrice(match.price_per_player, match.currency)}
              </span>
            </div>
          </div>

          {match.description && (
            <p className="mt-4 text-text-muted text-sm leading-relaxed border-t border-border pt-4">{match.description}</p>
          )}
        </div>
      </div>

      {/* Teams */}
      {match.match_teams && match.match_teams.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-lg text-text mb-4">Teams</h2>
          <TeamSlots
            teams={match.match_teams}
            participants={match.match_participants ?? []}
            teamSize={match.team_size}
          />
        </div>
      )}

      {/* Creator & Venue */}
      <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {match.profiles && (
          <Link href={`/players/${match.profiles.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-alt transition-colors">
            <Avatar src={match.profiles.avatar_url} name={match.profiles.username} size="sm" />
            <div>
              <p className="text-xs text-text-muted">Created by</p>
              <p className="text-sm font-medium text-text">{match.profiles.full_name ?? match.profiles.username}</p>
            </div>
          </Link>
        )}
        {match.venues && (
          <Link href={`/venues/${match.venues.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-alt transition-colors">
            <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-lg">🏟️</div>
            <div>
              <p className="text-xs text-text-muted">Venue</p>
              <p className="text-sm font-medium text-text">{match.venues.name}</p>
            </div>
          </Link>
        )}
      </div>

      {/* Join panel */}
      {joinPanelOpen && !isPast && !isParticipant && (
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-text">Choose your side</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { side: 'home' as const, label: homeTeam?.name ?? 'Home', count: homeCount, open: homeOpen, color: '#3b82f6' },
              { side: 'away' as const, label: awayTeam?.name ?? 'Away', count: awayCount, open: awayOpen, color: '#f97316' },
            ].map(({ side, label, count, open, color }) => {
              const selected = selectedSide === side;
              const full = open === 0;
              return (
                <button
                  key={side}
                  onClick={() => { if (!full) { setSelectedSide(side); setSquadSpots(1); } }}
                  disabled={full}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${full ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    borderColor: selected ? color : '#2a2a3d',
                    background: selected ? `${color}15` : '#13131a',
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-sm" style={{ color: selected ? color : '#f0f0ff' }}>{label}</span>
                  <span className="text-xs text-text-muted">{count}/{match.team_size} · {open} open</span>
                  {full && <span className="text-xs text-error">Full</span>}
                </button>
              );
            })}
          </div>

          {selectedSide && selectedTeamOpen > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <span className="text-sm text-text">Total spots to reserve</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    1 for you{squadSpots > 1 ? ` + ${squadSpots - 1} held for your squad` : ''} · max {selectedTeamOpen}
                  </p>
                </div>
                <button onClick={() => setSquadSpots((n) => Math.max(1, n - 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt">−</button>
                <span className="text-lg font-bold text-text w-6 text-center">{squadSpots}</span>
                <button onClick={() => setSquadSpots((n) => Math.min(selectedTeamOpen, n + 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt">+</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Squad spots panel (for participants) */}
      {squadPanelOpen && isParticipant && !isPast && (
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5">
          <h3 className="font-semibold text-text">Reserve squad spots</h3>

          {/* Own team */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="text-sm font-medium text-text">Your team</span>
              <p className="text-xs text-text-muted mt-0.5">
                {newTotalSpots === 1 ? 'Just you' : `You + ${newTotalSpots - 1} held`}
                {` · max ${myCurrentExtraSpots + myTeamOpenSlots + 1}`}
              </p>
            </div>
            <button onClick={() => setNewTotalSpots((n) => Math.max(1, n - 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt">−</button>
            <span className="text-lg font-bold text-text w-6 text-center">{newTotalSpots}</span>
            <button onClick={() => setNewTotalSpots((n) => Math.min(myCurrentExtraSpots + myTeamOpenSlots + 1, n + 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt">+</button>
          </div>

          {/* Opponent team */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <span className="text-sm font-medium text-text">Opponent team</span>
              <p className="text-xs text-text-muted mt-0.5">
                {newOpponentSpots === 0 ? 'No reservation' : `${newOpponentSpots} held`}
                {` · max ${myCurrentExtraSpotOpponent + opponentOpenSlots}`}
              </p>
            </div>
            <button onClick={() => setNewOpponentSpots((n) => Math.max(0, n - 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt">−</button>
            <span className="text-lg font-bold text-text w-6 text-center">{newOpponentSpots}</span>
            <button onClick={() => setNewOpponentSpots((n) => Math.min(myCurrentExtraSpotOpponent + opponentOpenSlots, n + 1))} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt">+</button>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setSquadPanelOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={updatingSquad} onClick={handleUpdateSquadSpots}>Confirm</Button>
          </div>
        </div>
      )}

      {/* Send to friends panel */}
      {sharePanelOpen && (
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text">Send to Friends</h3>
            <button onClick={() => { setSharePanelOpen(false); setSelectedFriendIds(new Set()); }} className="text-text-muted hover:text-text">
              <X className="w-4 h-4" />
            </button>
          </div>
          {friends.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-4">Add some friends first to share matches with them.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {friends.map(f => {
                const selected = selectedFriendIds.has(f.profiles!.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFriend(f.profiles!.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left
                      ${selected ? 'bg-brand/10' : 'hover:bg-surface-alt'}`}
                  >
                    <input type="checkbox" checked={selected} readOnly className="accent-brand flex-shrink-0" />
                    <Avatar src={f.profiles!.avatar_url} name={f.profiles!.full_name ?? f.profiles!.username} size="sm" />
                    <span className="text-sm text-text">{f.profiles!.full_name ?? f.profiles!.username}</span>
                  </button>
                );
              })}
            </div>
          )}
          {friends.length > 0 && (
            <Button
              loading={sendingInvites}
              disabled={selectedFriendIds.size === 0}
              onClick={handleSendToFriends}
            >
              Send{selectedFriendIds.size > 0 ? ` (${selectedFriendIds.size})` : ''}
            </Button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-alt transition-colors flex-shrink-0"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setSharePanelOpen(o => !o)}
          className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-alt transition-colors flex-shrink-0"
          title="Send to friends"
        >
          <Users className="w-5 h-5" />
        </button>

        {isPast && isParticipant && (
          <Link href={`/matches/${id}/rate`} className="flex-1">
            <Button size="lg" className="w-full">Rate Players</Button>
          </Link>
        )}

        {!isPast && !isParticipant && !isFull && match.status === 'open' && !match.is_private && (
          joinPanelOpen ? (
            <>
              <Button variant="secondary" onClick={() => { setJoinPanelOpen(false); setSelectedSide(null); setSquadSpots(1); }} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleJoin}
                loading={joining}
                disabled={!selectedSide}
                className="flex-1"
              >
                Join {selectedSide === 'home' ? 'Home' : selectedSide === 'away' ? 'Away' : '...'}
              </Button>
            </>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => setJoinPanelOpen(true)}>
              Join Match
            </Button>
          )
        )}

        {!isPast && !isParticipant && match.is_private && !isFull && (
          <Button disabled className="flex-1">Invite Only</Button>
        )}

        {!isPast && isParticipant && !isCreator && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => { setNewTotalSpots(myCurrentExtraSpots + 1); setNewOpponentSpots(myCurrentExtraSpotOpponent); setSquadPanelOpen((o) => !o); }}
            >
              + Squad
            </Button>
            <Button variant="danger" size="lg" className="flex-1" onClick={handleLeave}>
              Leave Match
            </Button>
          </>
        )}

        {isCreator && match.status !== 'cancelled' && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => { setNewTotalSpots(myCurrentExtraSpots + 1); setNewOpponentSpots(myCurrentExtraSpotOpponent); setSquadPanelOpen((o) => !o); }}
            >
              + Squad
            </Button>
            <Button variant="danger" size="lg" className="flex-1" onClick={handleCancelMatch}>
              Cancel Match
            </Button>
          </>
        )}

        {isFull && !isParticipant && (
          <Button disabled className="flex-1">Match Full</Button>
        )}
      </div>
    </div>
  );
}
