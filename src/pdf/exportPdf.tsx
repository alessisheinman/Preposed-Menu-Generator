import { getFontEmbedCSS, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { MenuEvent } from '../model/types';
import { deriveTheme } from '../theme/theme';
import { PAGE_H, PAGE_W, ProposalPage } from '../ui/ProposalPage';

/** 2.5× the 96-dpi layout ≈ 240 dpi on paper: crisp text, reasonable file size. */
const PIXEL_RATIO = 2.5;

/** Yield to the browser a few times so React effects and the fit pass can run (not timer-based, so it isn't throttled). */
const settle = async (turns = 8) => {
  for (let i = 0; i < turns; i++) {
    await new Promise<void>((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  }
};

/**
 * Render every page off-screen at full Letter size, capture each one as a JPEG, and assemble a PDF.
 * Uses the same <ProposalPage> as the on-screen preview, so the two always match.
 */
export async function exportPdf(event: MenuEvent, coverUrl: string | null, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const pages = event.days.flatMap((day) => day.meals.map((meal) => ({ day, meal })));
  if (pages.length === 0) throw new Error('There are no meals to export.');

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-${PAGE_W * 2}px;top:0;width:${PAGE_W}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    if (coverUrl) {
      const img = new Image();
      img.src = coverUrl;
      await img.decode().catch(() => undefined);
    }
    await document.fonts?.ready;

    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait', compress: true });
    let fontCss: string | undefined;

    for (let i = 0; i < pages.length; i++) {
      const { day, meal } = pages[i];
      flushSync(() => {
        root.render(<ProposalPage day={day} meal={meal} palette={event.palette} coverUrl={coverUrl} coverFocusY={event.coverFocusY} />);
      });
      await document.fonts?.ready;
      await settle(); // let the fit-to-page pass settle after fonts load
      const node = host.firstElementChild as HTMLElement;
      fontCss ??= await getFontEmbedCSS(node);
      const jpeg = await toJpeg(node, {
        width: PAGE_W, height: PAGE_H, pixelRatio: PIXEL_RATIO, quality: 0.92, fontEmbedCSS: fontCss, cacheBust: false,
        // JPEG has no transparency: anything the capture misses must never turn black
        backgroundColor: deriveTheme(event.palette.primary, event.palette.secondary).washMid,
      });
      if (i > 0) pdf.addPage('letter', 'portrait');
      pdf.addImage(jpeg, 'JPEG', 0, 0, 612, 792, undefined, 'FAST');
      onProgress?.(i + 1, pages.length);
    }
    return pdf.output('blob');
  } finally {
    root.unmount();
    host.remove();
  }
}
