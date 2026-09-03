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

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

/** Garmin FIT parser adapter. The SDK API is intentionally isolated here. */
export class GarminFitParser implements FitParser {
  validate(buffer: Buffer): FitValidationResult {
    if (buffer.length < 12) return { valid: false, reason: 'FIT file is too small' };
    const headerSize = buffer.readUInt8(0);
    if (headerSize < 12 || headerSize > buffer.length) return { valid: false, reason: 'Invalid FIT header' };
    const signature = buffer.subarray(8, 12).toString('ascii');
    if (signature !== '.FIT') return { valid: false, reason: 'Missing FIT signature' };
    return { valid: true };
  }

  parse(buffer: Buffer): ParsedActivity {
    const validation = this.validate(buffer);
    if (!validation.valid) throw new Error(validation.reason ?? 'Invalid FIT file');

    // Garmin's FIT SDK is loaded dynamically so this package can still be type-checked
    // in environments where the SDK's generated runtime is not available yet.
    // The concrete decode adapter can be extended without changing the domain contract.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdk = require('@garmin/fitsdk');
    const Decoder = sdk.Decoder;
    const Stream = sdk.Stream;
    const stream = Stream.fromBuffer(buffer);
    const decoder = new Decoder(stream);
    const decoded = decoder.read();
    const messages = decoded?.[1] ?? decoded?.messages ?? decoded;
    const records: ParsedRecord[] = [];
    let session: any;
    let deviceName: string | undefined;

    for (const message of Array.isArray(messages) ? messages : []) {
      const type = message?.name ?? message?.messageName ?? message?.type;
      const fields = message?.fields ?? message;
      if (type === 'record') {
        const lat = numberValue(fields.positionLat ?? fields.position_lat);
        const lon = numberValue(fields.positionLong ?? fields.position_long);
        records.push({
          timestamp: new Date(fields.timestamp),
          latitude: lat === undefined ? undefined : semicirclesToDegrees(lat),
          longitude: lon === undefined ? undefined : semicirclesToDegrees(lon),
          elevationMeters: numberValue(fields.altitude),
          distanceMeters: numberValue(fields.distance),
          speedMps: numberValue(fields.speed),
          heartRate: numberValue(fields.heartRate ?? fields.heart_rate),
          cadence: numberValue(fields.cadence),
          power: numberValue(fields.power),
          temperatureCelsius: numberValue(fields.temperature),
        });
      } else if (type === 'session') {
        session = fields;
      } else if (type === 'device_info') {
        deviceName = fields.productName ?? fields.product_name;
      }
    }

    return {
      name: session?.name,
      startedAt: session?.startTime ? new Date(session.startTime) : records[0]?.timestamp,
      durationSeconds: numberValue(session?.totalTimerTime ?? session?.total_timer_time),
      distanceMeters: numberValue(session?.totalDistance ?? session?.total_distance),
      elevationGainMeters: numberValue(session?.totalAscent ?? session?.total_ascent),
      elevationLossMeters: numberValue(session?.totalDescent ?? session?.total_descent),
      calories: numberValue(session?.totalCalories ?? session?.total_calories),
      averageSpeedMps: numberValue(session?.avgSpeed ?? session?.avg_speed),
      maximumSpeedMps: numberValue(session?.maxSpeed ?? session?.max_speed),
      averageHeartRate: numberValue(session?.avgHeartRate ?? session?.avg_heart_rate),
      maximumHeartRate: numberValue(session?.maxHeartRate ?? session?.max_heart_rate),
      averageCadence: numberValue(session?.avgCadence ?? session?.avg_cadence),
      deviceName,
      records: records.filter((record) => Number.isFinite(record.timestamp.getTime())),
    };
  }
}
