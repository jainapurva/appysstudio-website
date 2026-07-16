import { getDB } from './orders';
import { WORKSHOP } from './workshop';
import type { WorkshopRegistration } from './orders';

/**
 * A seat is only counted against capacity once payment is confirmed.
 * Abandoned checkouts (status 'pending_payment') must not hold seats hostage.
 */
export function seatsTaken(): number {
  const db = getDB();
  return (db.registrations as WorkshopRegistration[])
    .filter(r => r.workshopId === WORKSHOP.id && r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.seats || 0), 0);
}

export function seatsRemaining(): number {
  return Math.max(0, WORKSHOP.capacity - seatsTaken());
}
