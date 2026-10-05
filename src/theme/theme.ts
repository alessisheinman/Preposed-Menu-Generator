import { contrast, fromOklch, toOklch } from './color';

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

  const washTop = tint(p, 0.93, 0.045);
  const washBottom = tint(s, 0.91, 0.045);
  // blend in OKLCH-ish space via the midpoint of the two tints
  const mid = toOklch(washTop), bot = toOklch(washBottom);
  const hueMid = Math.abs(mid.h - bot.h) > 180 ? ((mid.h + bot.h + 360) / 2) % 360 : (mid.h + bot.h) / 2;
  const washMid = fromOklch({ l: (mid.l + bot.l) / 2 + 0.01, c: (mid.c + bot.c) / 2, h: hueMid });

  const backgrounds = [washTop, washMid, washBottom];
  const ink = ensureContrast(fromOklch({ l: 0.36, c: Math.min(p.c, 0.07), h: p.h }), backgrounds, 7);
  const inkL = toOklch(ink);
  const softInk = ensureContrast(fromOklch({ ...inkL, l: Math.min(inkL.l + 0.14, 0.6) }), backgrounds, 4.5);
  const script = fromOklch({ l: 0.97, c: Math.min(p.c, 0.02), h: p.h });

  return { washTop, washMid, washBottom, ink, softInk, script };
}
