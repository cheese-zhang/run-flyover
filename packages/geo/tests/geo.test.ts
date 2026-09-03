import { describe, expect, it } from 'vitest';
import { boundsOf, haversineDistanceMeters } from '../src/geo.js';

describe('geo', () => {
  it('calculates geographic distance', () => {
    expect(haversineDistanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 })).toBeGreaterThan(1100);
  });

  it('calculates bounds', () => {
    expect(boundsOf([
      { latitude: 1, longitude: 2 },
      { latitude: -1, longitude: 5 },
    ])).toEqual([[-0 + 2, -1], [5, 1]]);
  });
});
