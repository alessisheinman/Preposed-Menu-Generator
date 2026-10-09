import { DndContext, DragOverlay, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Day, Meal, MenuEvent } from '../model/types';
import { dragId, rawId, useDragSensors, useSortableBox } from './dnd';
import { PAGE_H, PAGE_W, ProposalPage } from './ProposalPage';

/** Preview thumbnails are the real 816px page, scaled down with a transform (so text fitting is identical). */
const THUMB_W = 360;
const SCALE = THUMB_W / PAGE_W;

interface Props {
  event: MenuEvent;
  coverUrl: string | null;
  onMoveMeal: (mealId: string, overMealId: string) => void;
}

interface PageRef { day: Day; meal: Meal }

export function Preview({ event, coverUrl, onMoveMeal }: Props) {
  const sensors = useDragSensors();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // A drag ends with a pointer-up on the page, which the browser also reports as a click; ignore that one.
  const justDragged = useRef(false);
  const pages: PageRef[] = event.days.flatMap((day) => day.meals.map((meal) => ({ day, meal })));
  if (pages.length === 0) return <p className="empty">Add a day and a page to see the preview.</p>;
  const dragged = pages.find((p) => p.meal.id === draggingId);
  const openIndex = pages.findIndex((p) => p.meal.id === openId);

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    setTimeout(() => { justDragged.current = false; }, 60);
    if (e.over && e.over.id !== e.active.id) onMoveMeal(rawId(e.active.id), rawId(e.over.id));
  };
  const open = (mealId: string) => {
    if (justDragged.current) { justDragged.current = false; return; }
    setOpenId(mealId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => { justDragged.current = true; setDraggingId(rawId(e.active.id)); }}
      onDragEnd={onDragEnd}
      onDragCancel={() => { setDraggingId(null); setTimeout(() => { justDragged.current = false; }, 60); }}
    >
      <p className="hint">Click a page to see it large. Drag pages to change their order.</p>
      <SortableContext items={pages.map((p) => dragId('page', p.meal.id))} strategy={rectSortingStrategy}>
        <div className="pages">
          {pages.map(({ day, meal }) => (
            <SortableThumb key={meal.id} day={day} meal={meal} event={event} coverUrl={coverUrl} onOpen={() => open(meal.id)} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {dragged && <Thumb day={dragged.day} meal={dragged.meal} event={event} coverUrl={coverUrl} lifted />}
      </DragOverlay>
      {openIndex >= 0 && (
        <PageLightbox
          pages={pages}
          index={openIndex}
          event={event}
          coverUrl={coverUrl}
          onIndex={(i) => setOpenId(pages[i].meal.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </DndContext>
  );
}

function SortableThumb(props: { day: Day; meal: Meal; event: MenuEvent; coverUrl: string | null; onOpen: () => void }) {
  const { setNodeRef, style, isDragging, boxProps, gripProps } = useSortableBox(dragId('page', props.meal.id), { type: 'page' });
  const { ref: _activatorRef, ...grip } = gripProps; // the whole thumbnail is the handle
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...boxProps}
      {...grip}
      title="Click to see it large · drag to reorder"
      className={`page-slot ${isDragging ? 'dragging' : ''}`}
      onClick={props.onOpen}
    >
      <Thumb {...props} />
    </div>
  );
}

function Thumb({ day, meal, event, coverUrl, lifted = false }: { day: Day; meal: Meal; event: MenuEvent; coverUrl: string | null; lifted?: boolean }) {
  return (
    <div className={`thumb ${lifted ? 'lifted' : ''}`} style={{ width: THUMB_W, height: PAGE_H * SCALE }}>
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' } as CSSProperties}>
        <ProposalPage day={day} meal={meal} palette={event.palette} coverUrl={coverUrl} coverFocusY={event.coverFocusY} />
      </div>
    </div>
  );
}

/** Fit a whole Letter page inside the window with a margin. */
const fitScale = () => Math.min((window.innerHeight * 0.88) / PAGE_H, (window.innerWidth * 0.92) / PAGE_W);

/** The clicked page, large and centred — like the dog photos. Click anywhere or press Esc to close; ← → flip pages. */
function PageLightbox({ pages, index, event, coverUrl, onIndex, onClose }: {
  pages: PageRef[]; index: number; event: MenuEvent; coverUrl: string | null; onIndex: (i: number) => void; onClose: () => void;
}) {
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < pages.length - 1) onIndex(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, pages.length, onIndex, onClose]);

  const { day, meal } = pages[index];
  return createPortal(
    <div className="page-lightbox" role="dialog" aria-label={`${meal.title} — click to close`} onClick={onClose}>
      <div className="page-lightbox-frame" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <ProposalPage day={day} meal={meal} palette={event.palette} coverUrl={coverUrl} coverFocusY={event.coverFocusY} />
        </div>
      </div>
      {pages.length > 1 && (
        <p className="page-lightbox-caption">
          Page {index + 1} of {pages.length} · ← → to flip · click anywhere to close
        </p>
      )}
    </div>,
    document.body,
  );
}
