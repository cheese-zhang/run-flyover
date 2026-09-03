import { describe, expect, it } from 'vitest';
import { semicirclesToDegrees } from '../src/parser.js';

describe('semicirclesToDegrees', () => {
  it('converts FIT semicircles to degrees', () => {
    expect(semicirclesToDegrees(2147483648)).toBe(180);
    expect(semicirclesToDegrees(-2147483648)).toBe(-180);
    expect(semicirclesToDegrees(0)).toBe(0);
  });
});
