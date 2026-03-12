/**
 * Geocoding: address string -> { lat, lng }
 * Uses Nominatim (OpenStreetMap) - free, no API key.
 * Rate limit: 1 req/sec for Nominatim public instance.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address?.trim();
  if (!trimmed || trimmed.length < 5) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FlyersUp/1.0 (local-services)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as { lat?: string; lon?: string };
    const lat = parseFloat(first?.lat ?? '');
    const lng = parseFloat(first?.lon ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
