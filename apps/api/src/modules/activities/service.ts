import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../../infrastructure/db/index.js';
import { activities, activityLaps, activityTrackPoints } from '../../infrastructure/db/schema.js';
import type { ParsedActivity } from '@run-flyover/fit-parser';
import { processParsedActivity } from '@run-flyover/activity-processor';

export async function createActivity(parsed: ParsedActivity) {
  const processed = processParsedActivity(parsed);
  const [activity] = await db.insert(activities).values({
    source: 'UPLOAD',
    sourceActivityId: crypto.randomUUID(),
    activityType: processed.type,
    activityName: processed.name,
    deviceName: processed.deviceName,
    startedAt: processed.startedAt,
    endedAt: processed.endedAt,
    durationSeconds: Math.round(processed.durationSeconds),
    distanceMeters: processed.distanceMeters,
    elevationGainMeters: processed.elevationGainMeters,
    elevationLossMeters: processed.elevationLossMeters,
    calories: processed.calories,
    avgSpeedMps: processed.averageSpeedMps,
    maxSpeedMps: processed.maximumSpeedMps,
    avgHeartRate: processed.averageHeartRate == null ? undefined : Math.round(processed.averageHeartRate),
    maxHeartRate: processed.maximumHeartRate == null ? undefined : Math.round(processed.maximumHeartRate),
    avgCadence: processed.averageCadence,
    maxCadence: processed.maximumCadence,
    status: 'READY',
  }).returning();

  if (processed.trackPoints.length) await db.insert(activityTrackPoints).values(processed.trackPoints.map((point) => ({
    activityId: activity.id,
    sequence: point.sequence,
    timestamp: point.timestamp,
    latitude: point.latitude,
    longitude: point.longitude,
    elevationMeters: point.elevationMeters,
    distanceMeters: point.distanceMeters,
    speedMps: point.speedMps,
    paceSecondsPerKm: point.paceSecondsPerKm,
    heartRate: point.heartRate,
    cadence: point.cadence,
    power: point.power,
    temperatureCelsius: point.temperatureCelsius,
  })));

  if (parsed.laps.length) await db.insert(activityLaps).values(parsed.laps.map((lap) => ({
    activityId: activity.id,
    lapIndex: lap.lapIndex,
    startTime: lap.startTime,
    durationSeconds: lap.durationSeconds == null ? undefined : Math.round(lap.durationSeconds),
    distanceMeters: lap.distanceMeters,
    avgSpeedMps: lap.averageSpeedMps,
    avgHeartRate: lap.averageHeartRate == null ? undefined : Math.round(lap.averageHeartRate),
    maxHeartRate: lap.maximumHeartRate == null ? undefined : Math.round(lap.maximumHeartRate),
    avgCadence: lap.averageCadence,
    elevationGainMeters: lap.elevationGainMeters,
    elevationLossMeters: lap.elevationLossMeters,
  })));

  return activity;
}

export async function listActivities(page = 1, pageSize = 20) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  return db.select().from(activities).orderBy(desc(activities.startedAt)).limit(safePageSize).offset((safePage - 1) * safePageSize);
}

export async function getActivity(id: string) {
  const [activity] = await db.select().from(activities).where(eq(activities.id, id));
  return activity;
}

export async function getTrack(id: string) {
  return db.select({
    sequence: activityTrackPoints.sequence,
    timestamp: activityTrackPoints.timestamp,
    latitude: activityTrackPoints.latitude,
    longitude: activityTrackPoints.longitude,
    elevationMeters: activityTrackPoints.elevationMeters,
    distanceMeters: activityTrackPoints.distanceMeters,
    speedMps: activityTrackPoints.speedMps,
    paceSecondsPerKm: activityTrackPoints.paceSecondsPerKm,
    heartRate: activityTrackPoints.heartRate,
    cadence: activityTrackPoints.cadence,
    power: activityTrackPoints.power,
    temperatureCelsius: activityTrackPoints.temperatureCelsius,
  }).from(activityTrackPoints).where(eq(activityTrackPoints.activityId, id)).orderBy(asc(activityTrackPoints.sequence));
}

export async function getLaps(id: string) {
  return db.select().from(activityLaps).where(eq(activityLaps.activityId, id)).orderBy(asc(activityLaps.lapIndex));
}
