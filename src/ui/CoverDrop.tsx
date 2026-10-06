import { useRef, useState, type KeyboardEvent } from 'react';
import { prepareCover, saveCover } from '../storage/covers';
import { extractPalette } from '../theme/palette';

/** Store an uploaded cover and work out its page colors. */
export async function importCover(file: File): Promise<{ id: string; dataUrl: string; primary: string; secondary: string }> {
  if (!file.type.startsWith('image/')) throw new Error("That file isn't an image.");
  const { dataUrl, sample } = await prepareCover(file);
  const id = await saveCover(dataUrl);
  const { primary, secondary } = extractPalette(sample);
  return { id, dataUrl, primary, secondary };
}

interface Props {
  imageUrl: string | null;
  focusY?: number;
  busy?: boolean;
  onFile: (file: File) => void;
  className?: string;
}

/** A big, obvious box for the tour cover art: click to choose a file, or drag an image onto it. */
export function CoverDrop({ imageUrl, focusY = 50, busy = false, onFile, className = '' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const open = () => { if (!busy) inputRef.current?.click(); };
  const take = (f: File | undefined) => { if (f) onFile(f); };

  return (
    <div
      className={`cover-drop ${imageUrl ? 'has-image' : ''} ${over ? 'over' : ''} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={imageUrl ? 'Replace tour cover art' : 'Add tour cover art'}
      onClick={open}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      style={imageUrl ? { backgroundImage: `url("${imageUrl}")`, backgroundPosition: `50% ${focusY}%` } : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }}
      />
      <span className="cover-drop-label">
        {busy ? 'Reading image…' : imageUrl ? 'Click or drop an image to replace' : (
          <>
            <strong>Tour cover art</strong>
            <span>Drop the image here, or click to choose a file</span>
            <small>Page colors are picked from it automatically</small>
          </>
        )}
      </span>
    </div>
  );
}
