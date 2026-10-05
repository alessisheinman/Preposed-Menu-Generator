import { contrast, fromOklch, hexToRgb, oklabToRgb, rgbToHex, rgbToOklab, toOklch } from './color';

export interface PageTheme {
  /** Watercolor wash: pale tints of the primary (top) and secondary (bottom) colors. */
  washTop: string;
  washMid: string;
  washBottom: string;
  /** Dish names, heading and date — a deep shade of the primary. */
  ink: string;
  /** Descriptions — softer than the ink but still comfortably readable. */
  softInk: string;
  /** The "Menu" script over the cover photo. */
  script: string;
}

/** Darken (or lighten) `hex` in OKLCH until it reaches `target` contrast against every background. */
function ensureContrast(hex: string, backgrounds: string[], target: number): string {
  const base = toOklch(hex);
  for (let l = base.l; l >= 0; l -= 0.01) {
    const candidate = fromOklch({ ...base, l });
    if (backgrounds.every((bg) => contrast(candidate, bg) >= target)) return candidate;
  }
  return '#000000';
}

export function deriveTheme(primary: string, secondary: string): PageTheme {
  const p = toOklch(primary);
  const s = toOklch(secondary);
  const tint = (c: { c: number; h: number }, l: number, maxChroma: number) => fromOklch({ l, c: Math.min(c.c, maxChroma), h: c.h });

  const washTop = tint(p, 0.925, 0.052);
  const washBottom = tint(s, 0.905, 0.03); // soft, slightly grey cool tone (the ENHYPEN bottom teal)
  // Blend straight across in OKLab (not around the hue wheel): peach → teal passes through a soft
  // neutral cream, as on the ENHYPEN page, instead of detouring through green.
  const [t, b] = [rgbToOklab(hexToRgb(washTop)), rgbToOklab(hexToRgb(washBottom))];
  const washMid = rgbToHex(oklabToRgb([(t[0] + b[0]) / 2 + 0.01, (t[1] + b[1]) / 2, (t[2] + b[2]) / 2]));

  const backgrounds = [washTop, washMid, washBottom];
  const ink = ensureContrast(fromOklch({ l: 0.36, c: Math.min(p.c, 0.07), h: p.h }), backgrounds, 7);
  const inkL = toOklch(ink);
  const softInk = ensureContrast(fromOklch({ ...inkL, l: Math.min(inkL.l + 0.14, 0.6) }), backgrounds, 4.5);
  const script = fromOklch({ l: 0.97, c: Math.min(p.c, 0.02), h: p.h });

  return { washTop, washMid, washBottom, ink, softInk, script };
}
