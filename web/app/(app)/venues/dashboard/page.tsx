'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { Booking } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function VenueDashboardPage() {
  const { user, profile } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    const { data: venue } = await supabase.from('venues').select('id').eq('owner_id', user.id).single();
    if (!venue) { setLoading(false); return; }

    const { data } = await supabase
      .from('bookings')
      .select('*, matches(*), profiles:booked_by(*)')
      .eq('venue_id', venue.id)
      .order('starts_at', { ascending: true });
    setBookings(data ?? []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) { toast.error('Failed to update booking'); return; }
    toast.success(`Booking ${status}`);
    fetchBookings();
  };

  if (profile?.account_type !== 'venue') {
    return (
      <div className="text-center py-32">
        <p className="text-text-muted">This page is only accessible to venue accounts.</p>
      </div>
    );
  }

  const statusVariant = (s: string) =>
    s === 'confirmed' ? 'success' : s === 'cancelled' ? 'error' : 'warning';

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Venue Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">Manage your bookings</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-4xl">📋</span>
          <p className="text-text-muted mt-3 text-sm">No bookings yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text text-sm">{b.field_name ?? 'Field'}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  {format(new Date(b.starts_at), 'EEE, MMM d · HH:mm')} — {format(new Date(b.ends_at), 'HH:mm')}
                </p>
                {b.profiles && (
                  <p className="text-text-muted text-xs mt-0.5">
                    Booked by {(b.profiles as { username?: string }).username ?? 'player'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                {b.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(b.id, 'confirmed')}>Confirm</Button>
                    <Button size="sm" variant="danger" onClick={() => updateStatus(b.id, 'cancelled')}>Decline</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
