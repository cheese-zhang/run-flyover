import { Decoder, Stream } from '@garmin/fitsdk';

export function semicirclesToDegrees(value: number): number {
  return value * (180 / 2147483648);
}

export interface ParsedRecord {
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  elevationMeters?: number;
  distanceMeters?: number;
  speedMps?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperatureCelsius?: number;
}

export interface ParsedLap {
  lapIndex: number;
  startTime?: Date;
  durationSeconds?: number;
  distanceMeters?: number;
  averageSpeedMps?: number;
  averageHeartRate?: number;
  maximumHeartRate?: number;
  averageCadence?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
}

export interface ParsedActivity {
  name?: string;
  startedAt?: Date;
  durationSeconds?: number;
  distanceMeters?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  calories?: number;
  averageSpeedMps?: number;
  maximumSpeedMps?: number;
  averageHeartRate?: number;
  maximumHeartRate?: number;
  averageCadence?: number;
  maximumCadence?: number;
  deviceName?: string;
  records: ParsedRecord[];
  laps: ParsedLap[];
}

export interface FitValidationResult {
  valid: boolean;
  reason?: string;
}

export interface FitParser {
  validate(buffer: Buffer): FitValidationResult;
  parse(buffer: Buffer): ParsedActivity;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function dateValue(value: unknown): Date | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return undefined;
}

function getMessages(decoded: unknown): Record<string, unknown[]> {
  if (!decoded || typeof decoded !== 'object') return {};
  const value = decoded as { messages?: Record<string, unknown[]> };
  return value.messages ?? {};
}

function first<T>(values: T[] | undefined): T | undefined {
  return values?.[0];
}

export class GarminFitParser implements FitParser {
  validate(buffer: Buffer): FitValidationResult {
    if (!Buffer.isBuffer(buffer) || buffer.length < 14) return { valid: false, reason: 'FIT file is too small' };
    const headerSize = buffer.readUInt8(0);
    if (headerSize !== 12 && headerSize !== 14) return { valid: false, reason: 'Invalid FIT header size' };
    if (buffer.length < headerSize + 2) return { valid: false, reason: 'FIT file is truncated' };
    if (buffer.subarray(8, 12).toString('ascii') !== '.FIT') return { valid: false, reason: 'Missing FIT signature' };
    try {
      const stream = Stream.fromBuffer(buffer);
      const decoder = new Decoder(stream);
      if (!decoder.isFIT() || !decoder.checkIntegrity()) return { valid: false, reason: 'FIT integrity check failed' };
    } catch (error) {
      return { valid: false, reason: error instanceof Error ? error.message : 'FIT integrity check failed' };
    }
    return { valid: true };
  }

  parse(buffer: Buffer): ParsedActivity {
    const validation = this.validate(buffer);
    if (!validation.valid) throw new Error(validation.reason ?? 'Invalid FIT file');

    const decoder = new Decoder(Stream.fromBuffer(buffer));
    const { messages, errors } = decoder.read();
    if (errors.length) throw new Error(`FIT decode failed: ${errors.map((error) => error.message).join('; ')}`);

    const records = (messages.recordMesgs ?? []).map((fields) => {
      const lat = numberValue(fields.positionLat);
      const lon = numberValue(fields.positionLong);
      return {
        timestamp: dateValue(fields.timestamp) ?? new Date(NaN),
        latitude: lat == null ? undefined : semicirclesToDegrees(lat),
        longitude: lon == null ? undefined : semicirclesToDegrees(lon),
        elevationMeters: numberValue(fields.altitude),
        distanceMeters: numberValue(fields.distance),
        speedMps: numberValue(fields.speed),
        heartRate: numberValue(fields.heartRate),
        cadence: numberValue(fields.cadence),
        power: numberValue(fields.power),
        temperatureCelsius: numberValue(fields.temperature),
      } satisfies ParsedRecord;
    }).filter((record) => Number.isFinite(record.timestamp.getTime()));

    const session = first(messages.sessionMesgs) as Record<string, unknown> | undefined;
    const laps = (messages.lapMesgs ?? []).map((fields, index) => ({
      lapIndex: index,
      startTime: dateValue(fields.startTime),
      durationSeconds: numberValue(fields.totalTimerTime),
      distanceMeters: numberValue(fields.totalDistance),
      averageSpeedMps: numberValue(fields.avgSpeed),
      averageHeartRate: numberValue(fields.avgHeartRate),
      maximumHeartRate: numberValue(fields.maxHeartRate),
      averageCadence: numberValue(fields.avgCadence),
      elevationGainMeters: numberValue(fields.totalAscent),
      elevationLossMeters: numberValue(fields.totalDescent),
    }));

    const deviceInfo = first(messages.deviceInfoMesgs) as Record<string, unknown> | undefined;
    return {
      name: typeof session?.sport === 'string' ? session.sport : undefined,
      startedAt: dateValue(session?.startTime) ?? records[0]?.timestamp,
      durationSeconds: numberValue(session?.totalTimerTime),
      distanceMeters: numberValue(session?.totalDistance),
      elevationGainMeters: numberValue(session?.totalAscent),
      elevationLossMeters: numberValue(session?.totalDescent),
      calories: numberValue(session?.totalCalories),
      averageSpeedMps: numberValue(session?.avgSpeed),
      maximumSpeedMps: numberValue(session?.maxSpeed),
      averageHeartRate: numberValue(session?.avgHeartRate),
      maximumHeartRate: numberValue(session?.maxHeartRate),
      averageCadence: numberValue(session?.avgCadence),
      maximumCadence: numberValue(session?.maxCadence),
      deviceName: typeof deviceInfo?.productName === 'string' ? deviceInfo.productName : undefined,
      records,
      laps,
    };
  }
}
