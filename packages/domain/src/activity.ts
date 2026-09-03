export type ActivitySource = 'GARMIN' | 'UPLOAD' | 'STRAVA' | 'COROS' | 'SUUNTO';

export type ActivityType = 'RUNNING' | 'TRAIL_RUNNING' | 'WALKING' | 'HIKING' | 'CYCLING' | 'OTHER';

export type ActivityStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface Activity {
  id: string;
  source: ActivitySource;
  sourceActivityId?: string;
  type: ActivityType;
  name?: string;
  deviceName?: string;
  startedAt: Date;
  endedAt?: Date;
  timezone?: string;
  durationSeconds: number;
  movingSeconds?: number;
  distanceMeters: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  calories?: number;
  averageSpeedMps?: number;
  maximumSpeedMps?: number;
  averageHeartRate?: number;
  maximumHeartRate?: number;
  averageCadence?: number;
  maximumCadence?: number;
  averagePower?: number;
  maximumPower?: number;
}

export interface TrackPoint {
  sequence: number;
  timestamp: Date;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  distanceMeters?: number;
  speedMps?: number;
  paceSecondsPerKm?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperatureCelsius?: number;
}
