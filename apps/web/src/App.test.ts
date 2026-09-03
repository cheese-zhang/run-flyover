import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, formatPace } from './App';

describe('activity formatting', () => {
  it('formats values for the activity UI', () => {
    expect(formatDistance(4219.5)).toBe('4.22 km');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatPace(2.5)).toBe('6:40 /km');
  });
});
