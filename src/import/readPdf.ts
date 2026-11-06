import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PSM, createWorker } from 'tesseract.js';
import { closeLetterGaps, findBanner, type GrayImage, type OcrLine, type OcrText, type ReadPdf, type ReadPage } from './parseProposal';

/**
 * Reads a proposal PDF in the browser: draws each page, then runs OCR on it. Proposal PDFs hold pictures of
 * the pages, not text. The menu never leaves the browser; only the OCR engine and its language data download.
 *
 * Bands are fractions of the page height, from the proposal page layout (an 816 x 1056 px page, see ProposalPage).
 */
const RENDER_WIDTH = 2040;
const HEADING = { top: 0.392, bottom: 0.449 };
const DATE = { top: 0.447, bottom: 0.478 };
const BODY_TOP = 0.476;
/** The cover banner: 15px side margins, 8px down, 411px tall, on an 816 x 1056 page. */
const COVER = { left: 15 / 816, top: 8 / 1056, width: 786 / 816, height: 411 / 1056 };

export interface ReadResult extends ReadPdf {
  /** The first page's banner, cropped, as a JPEG data URL. */
  coverDataUrl: string;
  /** A small RGBA sample of the banner, for picking the page colors. */
  coverSample: Uint8ClampedArray;
}

function grayBand(page: HTMLCanvasElement, top: number, bottom: number): GrayImage {
  const y = Math.round(page.height * top);
  const height = Math.round(page.height * bottom) - y;
  const { data } = page.getContext('2d')!.getImageData(0, y, page.width, height);
  const gray = new Uint8ClampedArray(page.width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  return { width: page.width, height, data: gray };
}

function toCanvas(img: GrayImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const rgba = new ImageData(img.width, img.height);
  img.data.forEach((v, i) => { rgba.data.set([v, v, v, 255], i * 4); });
  canvas.getContext('2d')!.putImageData(rgba, 0, 0);
  return canvas;
}

function cropCover(page: HTMLCanvasElement): { dataUrl: string; sample: Uint8ClampedArray } {
  const box = findBanner(grayBand(page, 0, 1), {
    left: Math.round(page.width * COVER.left),
    top: Math.round(page.height * COVER.top),
    right: Math.round(page.width * (COVER.left + COVER.width)),
    bottom: Math.round(page.height * (COVER.top + COVER.height)),
  });
  const sx = box.left, sy = box.top, sw = box.right - box.left, sh = box.bottom - box.top;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  canvas.getContext('2d')!.drawImage(page, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const small = document.createElement('canvas');
  small.width = 96;
  small.height = Math.max(1, Math.round((96 * sh) / sw));
  const ctx = small.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, small.width, small.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), sample: ctx.getImageData(0, 0, small.width, small.height).data };
}

export async function readProposalPdf(file: File, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<ReadResult> {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loading = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loading.promise;
  const worker = await createWorker('eng', 1);
  try {
    const meta = await pdf.getMetadata().catch(() => null);
    const title = String((meta?.info as { Title?: unknown } | undefined)?.Title ?? '');

    /** A letter-spaced line of capitals, such as a heading or date. */
    const readSpacedLine = async (page: HTMLCanvasElement, band: { top: number; bottom: number }, allowed: string): Promise<OcrText> => {
      const closed = closeLetterGaps(grayBand(page, band.top, band.bottom));
      if (!closed) return { text: '', confidence: 0 };
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: allowed });
      const { data } = await worker.recognize(toCanvas(closed));
      return { text: data.text.trim(), confidence: data.confidence };
    };

    const pages: ReadPage[] = [];
    let cover: { dataUrl: string; sample: Uint8ClampedArray } | null = null;
    onProgress(0, pdf.numPages);
    for (let n = 1; n <= pdf.numPages; n++) {
      if (signal?.aborted) throw new Error('Cancelled');
      const pdfPage = await pdf.getPage(n);
      const unit = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: RENDER_WIDTH / unit.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await pdfPage.render({ canvas, canvasContext: canvas.getContext('2d', { willReadFrequently: true })!, viewport }).promise;
      pdfPage.cleanup();
      if (n === 1) cover = cropCover(canvas);

      const heading = await readSpacedLine(canvas, HEADING, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ');
      const date = await readSpacedLine(canvas, DATE, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789, ');

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: '' });
      const top = Math.round(canvas.height * BODY_TOP);
      const { data } = await worker.recognize(canvas, { rectangle: { left: 0, top, width: canvas.width, height: canvas.height - top } }, { blocks: true });
      const lines: OcrLine[] = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.map((l) => ({
        text: l.text.trim(), x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1, confidence: l.confidence,
      }))));
      pages.push({ heading, date, lines });
      onProgress(n, pdf.numPages);
    }
    if (!cover) throw new Error('That PDF has no pages.');
    return { title, pageWidth: RENDER_WIDTH, pages, coverDataUrl: cover.dataUrl, coverSample: cover.sample };
  } finally {
    await worker.terminate().catch(() => undefined);
    await loading.destroy().catch(() => undefined);
  }
}
