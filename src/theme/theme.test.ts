import { describe, expect, it } from 'vitest';
import { contrast, fromOklch, hexToRgb, rgbToHex, toOklch } from './color';
import { extractPalette } from './palette';
import { deriveTheme } from './theme';

/** Build RGBA pixels from [hex, count] pairs. */
function pixels(parts: [string, number][]): number[] {
  return parts.flatMap(([hex, n]) => Array.from({ length: n }, () => [...hexToRgb(hex), 255]).flat());
}

describe('color utils', () => {
  it('round-trips hex through OKLCH', () => {
    for (const hex of ['#c9a46a', '#504129', '#7fb7b2', '#000000', '#ffffff']) {
      expect(fromOklch(toOklch(hex))).toBe(hex);
    }
  });
  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });
  it('rgbToHex clamps', () => {
    expect(rgbToHex([300, -5, 128])).toBe('#ff0080');
  });
});

describe('extractPalette', () => {
  it('prefers a prominent colorful area over a larger dark one', () => {
    // like the ENHYPEN cover: lots of near-black suits, a big golden wall, a little white
    const { primary, secondary } = extractPalette(pixels([['#151210', 500], ['#b08a55', 400], ['#f4efe8', 60]]));
    expect(toOklch(primary).h).toBeGreaterThan(60);
    expect(toOklch(primary).h).toBeLessThan(90); // gold/amber hue
    expect(primary).not.toBe(secondary);
  });
  it('finds a clearly different secondary', () => {
    const { primary, secondary } = extractPalette(pixels([['#d23b3b', 500], ['#2c6fd1', 300], ['#d84040', 100]]));
    expect(toOklch(primary).h).toBeLessThan(40); // red
    expect(toOklch(secondary).h).toBeGreaterThan(230); // blue, not the near-duplicate red
  });
  it('is deterministic and survives transparent or empty input', () => {
    const px = pixels([['#336699', 50], ['#cc9933', 50]]);
    expect(extractPalette(px)).toEqual(extractPalette(px));
    expect(extractPalette([0, 0, 0, 0])).toEqual({ primary: '#c9a46a', secondary: '#7fb7b2', candidates: [] });
    expect(extractPalette(px).candidates).toHaveLength(2);
  });
});

describe('deriveTheme', () => {
  const palettes: [string, string][] = [
    ['#b08a55', '#151210'], // gold + black (ENHYPEN-like)
    ['#d23b3b', '#2c6fd1'], // saturated red + blue
    ['#f4efe8', '#ffffff'], // almost white cover
    ['#101010', '#202020'], // almost black cover
    ['#00ff66', '#ff00cc'], // neon
  ];
  it.each(palettes)('keeps text readable for %s / %s', (p, s) => {
    const t = deriveTheme(p, s);
    for (const bg of [t.washTop, t.washMid, t.washBottom]) {
      expect(contrast(t.ink, bg)).toBeGreaterThanOrEqual(7);
      expect(contrast(t.softInk, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('tints the wash with the cover colors (light, low-chroma)', () => {
    const t = deriveTheme('#b08a55', '#2c6fd1');
    expect(toOklch(t.washTop).l).toBeGreaterThan(0.88);
    expect(Math.abs(toOklch(t.washTop).h - toOklch('#b08a55').h)).toBeLessThan(15);
    expect(Math.abs(toOklch(t.washBottom).h - toOklch('#2c6fd1').h)).toBeLessThan(15);
  });
});
