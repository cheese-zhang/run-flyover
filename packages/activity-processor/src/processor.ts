import type { ParsedActivity, ParsedRecord } from '@run-flyover/fit-parser';
import type { ActivityType, TrackPoint } from '@run-flyover/domain';

export interface ProcessedActivity {
  type: ActivityType;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  averageSpeedMps?: number;
  maximumSpeedMps?: number;
  averageHeartRate?: number;
  maximumHeartRate?: number;
  averageCadence?: number;
  maximumCadence?: number;
  calories?: number;
  name?: string;
  deviceName?: string;
  trackPoints: TrackPoint[];
}

function haversineMeters(a: ParsedRecord, b: ParsedRecord): number {
  const lat1 = (a.latitude! * Math.PI) / 180;
  const lat2 = (b.latitude! * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude! - a.longitude!) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function calculateFallbackDistance(records: ParsedRecord[]): number {
  let total = 0;
  for (let i = 1; i < records.length; i += 1) {
    const previous = records[i - 1];
    const current = records[i];
    if (previous.latitude == null || previous.longitude == null || current.latitude == null || current.longitude == null) continue;
    total += haversineMeters(previous, current);
  }
  return total;
}

function deriveElevation(records: ParsedRecord[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < records.length; i += 1) {
    const previous = records[i - 1].elevationMeters;
    const current = records[i].elevationMeters;
    if (previous == null || current == null) continue;
    const delta = current - previous;
    if (delta > 0) gain += delta;
    if (delta < 0) loss += Math.abs(delta);
  }
  return { gain, loss };
}

function average(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : undefined;
}

function maximum(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  return valid.length ? Math.max(...valid) : undefined;
}

export function processParsedActivity(parsed: ParsedActivity): ProcessedActivity {
  const records = [...parsed.records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const startedAt = parsed.startedAt ?? records[0]?.timestamp;
  if (!startedAt || !Number.isFinite(startedAt.getTime())) throw new Error('FIT activity has no valid start time');

  const lastTimestamp = records.at(-1)?.timestamp;
  const durationSeconds = parsed.durationSeconds ?? (lastTimestamp ? Math.max(0, (lastTimestamp.getTime() - startedAt.getTime()) / 1000) : 0);
  const distanceMeters = parsed.distanceMeters ?? calculateFallbackDistance(records);
  const elevation = deriveElevation(records);

  const trackPoints: TrackPoint[] = records
    .filter((record) => record.latitude != null && record.longitude != null && Number.isFinite(record.latitude) && Number.isFinite(record.longitude))
    .map((record, sequence) => ({
      sequence,
      timestamp: record.timestamp,
      latitude: record.latitude!,
      longitude: record.longitude!,
      elevationMeters: record.elevationMeters,
      distanceMeters: record.distanceMeters,
      speedMps: record.speedMps,
      paceSecondsPerKm: record.speedMps && record.speedMps > 0 ? 1000 / record.speedMps : undefined,
      heartRate: record.heartRate,
      cadence: record.cadence,
      power: record.power,
      temperatureCelsius: record.temperatureCelsius,
    }));

  return {
    type: 'RUNNING',
    startedAt,
    endedAt: lastTimestamp,
    durationSeconds,
    distanceMeters,
    elevationGainMeters: parsed.elevationGainMeters ?? elevation.gain,
    elevationLossMeters: parsed.elevationLossMeters ?? elevation.loss,
    averageSpeedMps: parsed.averageSpeedMps ?? average(records.map((record) => record.speedMps)),
    maximumSpeedMps: parsed.maximumSpeedMps ?? maximum(records.map((record) => record.speedMps)),
    averageHeartRate: parsed.averageHeartRate ?? average(records.map((record) => record.heartRate)),
    maximumHeartRate: parsed.maximumHeartRate ?? maximum(records.map((record) => record.heartRate)),
    averageCadence: parsed.averageCadence ?? average(records.map((record) => record.cadence)),
    maximumCadence: parsed.maximumCadence ?? maximum(records.map((record) => record.cadence)),
    calories: parsed.calories,
    name: parsed.name,
    deviceName: parsed.deviceName,
    trackPoints,
  };
}
