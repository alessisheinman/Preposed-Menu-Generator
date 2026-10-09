import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { printItems } from '../model/format';
import type { Day, Meal, Palette } from '../model/types';
import { hexToRgba } from '../theme/color';
import { deriveTheme } from '../theme/theme';
import jmLogo from '../assets/jm-logo.png';
import { chooseFit, type Fit } from './fit';

/** US Letter at 96 CSS px per inch. The page is always laid out at this size; previews scale it. */
export const PAGE_W = 816;
export const PAGE_H = 1056;

/**
 * SVG textures as base64 data URLs. (Base64, not URL-encoding: the SVGs contain `url(#…)`, and a nested
 * url() inside a CSS url() breaks the PDF capture, which then drops the whole background.)
 */
const svgUrl = (svg: string) => `url("data:image/svg+xml;base64,${btoa(svg)}")`;

// Fine paper grain, generated (no image file): SVG fractal noise tinted to neutral brown.
const GRAIN = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 0.11 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
);
// Soft watercolor blooms: large low-frequency noise used as a mottled overlay.
const BLOOM = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='816' height='1056'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.004 0.006' numOctaves='4' seed='7'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 -1.4 1.1'/></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>`,
);

interface Props {
  day: Day;
  meal: Meal;
  palette: Palette;
  coverUrl: string | null;
  coverFocusY: number;
  className?: string;
}

export function ProposalPage({ day, meal, palette, coverUrl, coverFocusY, className = '' }: Props) {
  const theme = useMemo(() => deriveTheme(palette.primary, palette.secondary), [palette.primary, palette.secondary]);
  const items = printItems(meal);
  const listRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ columns: 1, scale: 1 });
  const signature = JSON.stringify([items, day.dateLabel]);

  // Measure at real size and pick the largest layout that fits the space under the heading.
  useLayoutEffect(() => {
    const list = listRef.current, area = areaRef.current;
    if (!list || !area) return;
    const measure = (f: Fit) => {
      list.style.setProperty('--fit', String(f.scale));
      list.dataset.columns = String(f.columns);
      return list.scrollHeight;
    };
    const run = () => {
      const chosen = chooseFit(measure, area.clientHeight);
      measure(chosen);
      setFit((old) => (old.columns === chosen.columns && old.scale === chosen.scale ? old : chosen));
    };
    run();
    // web fonts change line widths once they load
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) run(); });
    return () => { cancelled = true; };
  }, [signature]);

  const style = {
    '--ink': theme.ink,
    '--soft-ink': theme.softInk,
    '--script': theme.script,
    width: PAGE_W,
    height: PAGE_H,
    backgroundColor: theme.washMid,
    backgroundImage: [
      GRAIN,
      `radial-gradient(ellipse 75% 22% at 22% 96%, ${hexToRgba(theme.washBottom, 0.95)}, transparent 72%)`,
      `radial-gradient(ellipse 60% 18% at 80% 100%, ${hexToRgba(theme.washBottom, 1)}, transparent 72%)`,
      `radial-gradient(ellipse 70% 30% at 65% 60%, ${hexToRgba(theme.washTop, 0.9)}, transparent 70%)`,
      `linear-gradient(to bottom, ${theme.washTop} 0%, ${theme.washTop} 58%, ${theme.washMid} 78%, ${theme.washBottom} 100%)`,
    ].join(', '),
  } as CSSProperties;

  return (
    <article className={`proposal-page ${className}`} style={style}>
      <div className="pp-bloom" style={{ backgroundImage: BLOOM }} />
      <img className="pp-logo" src={jmLogo} alt="Jack Monkey Catering" draggable={false} />
      <div
        className={`pp-cover ${coverUrl ? '' : 'empty'}`}
        style={coverUrl
          ? { backgroundImage: `url("${coverUrl}")`, backgroundPosition: `50% ${coverFocusY}%` }
          : { background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
      >
        {!coverUrl && <span>Upload cover art</span>}
      </div>
      <div className="pp-script">Menu</div>
      <h2 className="pp-title">{meal.title.trim() || meal.type.toUpperCase()}</h2>
      {day.dateLabel.trim() && <p className="pp-date">{day.dateLabel.trim()}</p>}
      <div className={`pp-area ${day.dateLabel.trim() ? 'with-date' : ''}`} ref={areaRef}>
        <div className="pp-list" ref={listRef} data-columns={fit.columns} style={{ '--fit': fit.scale } as CSSProperties}>
          {items.map((it, i) => (
            <div className="pp-item" key={i}>
              <div className="pp-name">{it.name}</div>
              {it.description && <div className="pp-desc">{it.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
