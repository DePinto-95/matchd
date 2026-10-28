/**
 * State of a venue booking request.
 * DB: `bookings.status` (TEXT + CHECK).
 */
export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}
