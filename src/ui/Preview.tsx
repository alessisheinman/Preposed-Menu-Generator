import { DndContext, DragOverlay, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useState, type CSSProperties } from 'react';
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

export function Preview({ event, coverUrl, onMoveMeal }: Props) {
  const sensors = useDragSensors();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pages = event.days.flatMap((day) => day.meals.map((meal) => ({ day, meal })));
  if (pages.length === 0) return <p className="empty">Add a day and a page to see the preview.</p>;
  const dragged = pages.find((p) => p.meal.id === draggingId);

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    if (e.over && e.over.id !== e.active.id) onMoveMeal(rawId(e.active.id), rawId(e.over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setDraggingId(rawId(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setDraggingId(null)}>
      <p className="hint">Drag pages to change their order.</p>
      <SortableContext items={pages.map((p) => dragId('page', p.meal.id))} strategy={rectSortingStrategy}>
        <div className="pages">
          {pages.map(({ day, meal }) => (
            <SortableThumb key={meal.id} day={day} meal={meal} event={event} coverUrl={coverUrl} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {dragged && <Thumb day={dragged.day} meal={dragged.meal} event={event} coverUrl={coverUrl} lifted />}
      </DragOverlay>
    </DndContext>
  );
}

function SortableThumb(props: { day: Day; meal: Meal; event: MenuEvent; coverUrl: string | null }) {
  const { setNodeRef, style, isDragging, boxProps, gripProps } = useSortableBox(dragId('page', props.meal.id), { type: 'page' });
  const { ref: _activatorRef, ...grip } = gripProps; // the whole thumbnail is the handle
  return (
    <div ref={setNodeRef} style={style} {...boxProps} {...grip} className={`page-slot ${isDragging ? 'dragging' : ''}`}>
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
