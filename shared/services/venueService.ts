import type { SupabaseClient } from '@supabase/supabase-js';
import { BookingStatus } from '../enums';
import { Booking, Venue } from '../types';
import { MutationResult } from './types';

export const createVenueService = (supabase: SupabaseClient) => ({
  getById: async (id: string): Promise<Venue | null> => {
    const { data } = await supabase.from('venues').select('*').eq('id', id).single();
    return data ?? null;
  },

  getIdByOwner: async (ownerId: string): Promise<string | null> => {
    const { data } = await supabase.from('venues').select('id').eq('owner_id', ownerId).single();
    return data?.id ?? null;
  },

  listBookings: async (venueId: string): Promise<Booking[]> => {
    const { data } = await supabase
      .from('bookings')
      .select('*, matches(*), profiles:booked_by(*)')
      .eq('venue_id', venueId)
      .order('starts_at', { ascending: true });
    return data ?? [];
  },

  updateBookingStatus: async (
    bookingId: string,
    status: BookingStatus
  ): Promise<MutationResult> => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    return { error };
  },
});

export type VenueService = ReturnType<typeof createVenueService>;
