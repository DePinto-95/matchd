'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Mail, ChevronLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Venue } from '@/types';
import { SPORTS } from '@/constants/sports';
import { Badge } from '@/components/ui/Badge';

export default function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('venues').select('*').eq('id', id).single().then(({ data }) => {
      setVenue(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!venue) return (
    <div className="text-center py-32"><p className="text-text-muted">Venue not found</p></div>
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {venue.cover_url && (
          <img src={venue.cover_url} alt={venue.name} className="w-full h-40 object-cover" />
        )}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {venue.logo_url ? (
              <img src={venue.logo_url} alt={venue.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-surface-alt flex items-center justify-center text-3xl">🏟️</div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-xl text-text">{venue.name}</h1>
                {venue.verified && <CheckCircle className="w-5 h-5 text-brand" />}
              </div>
              <div className="flex items-center gap-1.5 text-text-muted text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{venue.address}, {venue.city}</span>
              </div>
            </div>
          </div>

          {venue.description && (
            <p className="mt-4 text-text-muted text-sm leading-relaxed">{venue.description}</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {venue.phone && (
              <div className="flex items-center gap-2 text-sm text-text">
                <Phone className="w-4 h-4 text-text-muted" />
                <span>{venue.phone}</span>
              </div>
            )}
            {venue.email && (
              <div className="flex items-center gap-2 text-sm text-text">
                <Mail className="w-4 h-4 text-text-muted" />
                <span>{venue.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {venue.sports.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-lg text-text mb-4">Available Sports</h2>
          <div className="flex flex-wrap gap-2">
            {venue.sports.map((s) => {
              const sport = SPORTS[s];
              return (
                <Badge key={s} variant="brand">
                  {sport?.emoji} {sport?.label ?? s}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {venue.amenities && venue.amenities.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-lg text-text mb-4">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {venue.amenities.map((a) => (
              <Badge key={a} variant="default">{a}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
