/**
 * Reserved for re-enabling GPS-based arrival verification.
 *
 * When turning geolocation back on:
 * 1. Call this from `ArrivalVerificationModal` before POST `/api/bookings/[id]/arrive`.
 * 2. In `app/api/bookings/[bookingId]/arrive/route.ts`, require finite `lat`/`lng` again
 *    (reject 400 when missing) and keep `location_verified` haversine logic.
 * 3. Restore location copy in the modal (see git history or mirror this file’s JSDoc).
 *
 * @returns WGS84 coordinates from the browser Geolocation API
 */
export function captureArrivalGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Location unavailable')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
