import { describe, expect, it } from 'vitest';
import { processParsedActivity } from '../src/processor.js';

describe('processParsedActivity', () => {
  it('falls back to GPS distance and derives pace safely', () => {
    const result = processParsedActivity({
      records: [
        { timestamp: new Date('2026-01-01T00:00:00Z'), latitude: 0, longitude: 0, speedMps: 0 },
        { timestamp: new Date('2026-01-01T00:01:00Z'), latitude: 0, longitude: 0.01, speedMps: 2.5 },
      ],
    });
    expect(result.distanceMeters).toBeGreaterThan(1100);
    expect(result.distanceMeters).toBeLessThan(1120);
    expect(result.trackPoints[0].paceSecondsPerKm).toBeUndefined();
    expect(result.trackPoints[1].paceSecondsPerKm).toBe(400);
    expect(result.durationSeconds).toBe(60);
  });
});
