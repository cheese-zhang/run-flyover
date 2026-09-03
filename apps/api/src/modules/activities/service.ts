import { eq, desc } from 'drizzle-orm';
import { db } from '../../infrastructure/db/index.js';
import { activities, activityTrackPoints } from '../../infrastructure/db/schema.js';
import type { ParsedActivity } from '@run-flyover/fit-parser';

export async function createActivity(parsed: ParsedActivity) {
  if (!parsed.startedAt) throw new Error('FIT activity has no start time');
  const [activity] = await db.insert(activities).values({
    source: 'UPLOAD', activityType: 'RUNNING', activityName: parsed.name,
    deviceName: parsed.deviceName, startedAt: parsed.startedAt,
    durationSeconds: parsed.durationSeconds == null ? null : Math.round(parsed.durationSeconds),
    distanceMeters: parsed.distanceMeters, elevationGainMeters: parsed.elevationGainMeters,
    elevationLossMeters: parsed.elevationLossMeters, calories: parsed.calories,
    avgSpeedMps: parsed.averageSpeedMps, maxSpeedMps: parsed.maximumSpeedMps,
    avgHeartRate: parsed.averageHeartRate, maxHeartRate: parsed.maximumHeartRate,
    avgCadence: parsed.averageCadence,
  }).returning();

  const points = parsed.records
    .filter((r) => r.latitude !== undefined && r.longitude !== undefined)
    .map((r, sequence) => ({
      activityId: activity.id, sequence, timestamp: r.timestamp,
      latitude: r.latitude!, longitude: r.longitude!, elevationMeters: r.elevationMeters,
      distanceMeters: r.distanceMeters, speedMps: r.speedMps,
      paceSecondsPerKm: r.speedMps && r.speedMps > 0 ? 1000 / r.speedMps : undefined,
      heartRate: r.heartRate, cadence: r.cadence, power: r.power,
      temperatureCelsius: r.temperatureCelsius,
    }));
  if (points.length) await db.insert(activityTrackPoints).values(points);
  return activity;
}

export async function listActivities(limit = 20) {
  return db.select().from(activities).orderBy(desc(activities.startedAt)).limit(Math.min(limit, 100));
}

export async function getActivity(id: string) {
  const [activity] = await db.select().from(activities).where(eq(activities.id, id));
  return activity;
}

export async function getTrack(id: string) {
  return db.select().from(activityTrackPoints).where(eq(activityTrackPoints.activityId, id)).orderBy(activityTrackPoints.sequence);
}
