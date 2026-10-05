export interface Fit { columns: 1 | 2; scale: number; }

/** Text smaller than this (relative to the design size) is too small for a printed proposal. */
export const MIN_SCALE_ONE_COLUMN = 0.78;
export const MIN_SCALE_TWO_COLUMNS = 0.55;

/**
 * Choose the largest text scale that fits: one column first (like the original design),
 * then two columns once one column would need text smaller than MIN_SCALE_ONE_COLUMN.
 * `measure` returns the content height for a given layout; `available` is the space on the page.
 */
export function chooseFit(measure: (fit: Fit) => number, available: number): Fit {
  const fits = (f: Fit) => measure(f) <= available + 0.5;
  const largest = (columns: 1 | 2, min: number): Fit | null => {
    if (!fits({ columns, scale: min })) return null;
    let lo = min, hi = 1;
    if (fits({ columns, scale: hi })) return { columns, scale: 1 };
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (fits({ columns, scale: mid })) lo = mid; else hi = mid;
    }
    return { columns, scale: Math.floor(lo * 1000) / 1000 };
  };
  return largest(1, MIN_SCALE_ONE_COLUMN) ?? largest(2, MIN_SCALE_TWO_COLUMNS) ?? { columns: 2, scale: MIN_SCALE_TWO_COLUMNS };
}
