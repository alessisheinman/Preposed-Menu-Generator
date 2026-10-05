import { deltaE, fromOklch, rgbToHex, rgbToOklab, oklabToRgb, toOklch, type RGB } from './color';

interface Cluster { lab: [number, number, number]; count: number; }

/**
 * k-means in OKLab with deterministic farthest-point seeding, so the same image always
 * yields the same palette.
 */
function kmeans(points: [number, number, number][], k: number, iterations = 12): Cluster[] {
  if (points.length === 0) return [];
  const dist = (p: number[], q: number[]) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  // seed: the mean point, then repeatedly the point farthest from all seeds
  const mean = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]).map((v) => v / points.length) as [number, number, number];
  const centers: [number, number, number][] = [mean];
  while (centers.length < Math.min(k, points.length)) {
    let best = points[0], bestD = -1;
    for (const p of points) {
      const d = Math.min(...centers.map((c) => dist(p, c)));
      if (d > bestD) { bestD = d; best = p; }
    }
    centers.push([...best]);
  }
  let assign = new Array(points.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    assign = points.map((p) => {
      let bi = 0, bd = Infinity;
      centers.forEach((c, i) => { const d = dist(p, c); if (d < bd) { bd = d; bi = i; } });
      return bi;
    });
    centers.forEach((_, i) => {
      const mine = points.filter((_, j) => assign[j] === i);
      if (mine.length) centers[i] = [0, 1, 2].map((ax) => mine.reduce((s, p) => s + p[ax], 0) / mine.length) as [number, number, number];
    });
  }
  return centers.map((lab, i) => ({ lab, count: assign.filter((a) => a === i).length })).filter((c) => c.count > 0);
}

/**
 * The cool partner of a cover's main color, like the ENHYPEN proposal: gold backdrop → blue-teal wash.
 * Rotates the hue ~110° in OKLCH (gold → teal, red → green-teal, blue → rose) at a soft, mid chroma.
 */
export function companionColor(primary: string): string {
  const p = toOklch(primary);
  return fromOklch({ l: 0.72, c: Math.min(Math.max(p.c, 0.06), 0.1), h: (p.h + 110) % 360 });
}

/** A second cover color only counts as "the tour's second color" if it is this big and this colorful. */
const STRONG_SHARE = 0.2;
const STRONG_CHROMA = 0.07;

/**
 * Pick the page colors from the cover's RGBA pixels (typically a ~96px downscale).
 * Primary: the cover's main color — the most prominent cluster, where dark shadows/suits and
 *   blown-out highlights count for less (so a gold backdrop beats black jackets).
 * Secondary: a genuinely strong, different second color in the cover if there is one; otherwise
 *   the primary's cool companion (gold → teal), which gives the gold-to-blue wash of the ENHYPEN menu.
 */
export function extractPalette(rgba: ArrayLike<number>): { primary: string; secondary: string; candidates: string[] } {
  const points: [number, number, number][] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue; // skip transparent pixels
    points.push(rgbToOklab([rgba[i], rgba[i + 1], rgba[i + 2]] as RGB));
  }
  if (points.length === 0) return { primary: '#c9a46a', secondary: '#7fb7b2', candidates: [] };

  const clusters = kmeans(points, 8);
  const score = (c: Cluster) => {
    const [L, a, b] = c.lab;
    const chroma = Math.hypot(a, b);
    const tonal = L < 0.2 || L > 0.95 ? 0.25 : 1; // shadows and blown highlights rarely read as "the color"
    return (c.count / points.length) * (0.25 + chroma * 6) * tonal;
  };
  const ranked = [...clusters].sort((x, y) => score(y) - score(x));
  const hex = (c: Cluster) => rgbToHex(oklabToRgb(c.lab));
  const primary = hex(ranked[0]);
  const strongSecond = ranked.slice(1).find((c) => {
    const [L, a, b] = c.lab;
    return c.count / points.length >= STRONG_SHARE && Math.hypot(a, b) >= STRONG_CHROMA && L >= 0.25 && L <= 0.92
      && deltaE(hex(c), primary) > 0.15;
  });
  // every cluster, most prominent first, so the user can pick another color from the cover
  const candidates = [...clusters].sort((x, y) => y.count - x.count).map(hex);
  return { primary, secondary: strongSecond ? hex(strongSecond) : companionColor(primary), candidates };
}
