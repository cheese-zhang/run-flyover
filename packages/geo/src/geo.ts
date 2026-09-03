export interface Coordinate {
  latitude: number;
  longitude: number;
}

export function haversineDistanceMeters(a: Coordinate, b: Coordinate): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function boundsOf(points: Coordinate[]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  let minLon = points[0].longitude;
  let minLat = points[0].latitude;
  let maxLon = minLon;
  let maxLat = minLat;
  for (const point of points.slice(1)) {
    minLon = Math.min(minLon, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLon = Math.max(maxLon, point.longitude);
    maxLat = Math.max(maxLat, point.latitude);
  }
  return [[minLon, minLat], [maxLon, maxLat]];
}
