import { describe, expect, it } from 'vitest';
import { MIN_SCALE_ONE_COLUMN, MIN_SCALE_TWO_COLUMNS, chooseFit, type Fit } from './fit';

/** Fake page: n items, each `per` px tall at scale 1; two columns halve the rows. */
const measureFor = (n: number, per = 50) => (f: Fit) => Math.ceil(n / f.columns) * per * f.scale;

describe('chooseFit', () => {
  it('keeps full size in one column when it fits', () => {
    expect(chooseFit(measureFor(8), 500)).toEqual({ columns: 1, scale: 1 });
  });
  it('shrinks a little before switching to two columns', () => {
    const fit = chooseFit(measureFor(11), 500); // 550px at full size
    expect(fit.columns).toBe(1);
    expect(fit.scale).toBeGreaterThanOrEqual(MIN_SCALE_ONE_COLUMN);
    expect(fit.scale).toBeLessThan(1);
  });
  it('switches to two columns rather than tiny text', () => {
    expect(chooseFit(measureFor(16), 500)).toEqual({ columns: 2, scale: 1 });
  });
  it('never goes below the two-column minimum', () => {
    expect(chooseFit(measureFor(80), 500)).toEqual({ columns: 2, scale: MIN_SCALE_TWO_COLUMNS });
  });
});
