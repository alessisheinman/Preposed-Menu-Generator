import {
  KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, KeyboardEventHandler, PointerEventHandler, PointerEvent as ReactPointerEvent } from 'react';

/** Pressing inside a field, button or dropdown should edit/click, never start a drag. */
export function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element
    && !!target.closest('input, textarea, select, button, a, [contenteditable="true"], .picker-list, [data-no-drag]');
}

/** Pointer sensor that lets you grab a whole box but ignores presses on its controls. */
export class BoxPointerSensor extends PointerSensor {
  static activators = [{
    eventName: 'onPointerDown' as const,
    handler: ({ nativeEvent: e }: ReactPointerEvent) => e.isPrimary && e.button === 0 && !isInteractive(e.target),
  }];
}

export function useDragSensors() {
  return useSensors(
    useSensor(BoxPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export type DragType = 'line' | 'meal' | 'day' | 'page';
/** Droppable areas that accept items when a meal/day is empty. */
export type DropAreaType = 'lines' | 'meals';
const AREA_FOR: Partial<Record<DragType, DropAreaType>> = { line: 'lines', meal: 'meals' };

/** Only consider targets of the same kind (a dish can't land on a day header), plus empty containers. */
export const typedCollision: CollisionDetection = (args) => {
  const type = args.active.data.current?.type as DragType | undefined;
  const droppableContainers = args.droppableContainers.filter((c) => {
    const d = c.data.current;
    return d?.type === type || (d?.type === AREA_FOR[type!] && d?.empty);
  });
  const scoped = { ...args, droppableContainers };
  const within = pointerWithin(scoped);
  return within.length ? within : closestCenter(scoped);
};

/** useSortable plus split handlers: the whole box drags with the mouse, the grip handles the keyboard. */
export function useSortableBox(id: string, data: Record<string, unknown>) {
  const s = useSortable({ id, data });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(s.transform),
    transition: s.transition,
  };
  return {
    setNodeRef: s.setNodeRef,
    style,
    isDragging: s.isDragging,
    // dnd-kit types listeners as Function; they are ordinary React handlers.
    boxProps: { onPointerDown: s.listeners?.onPointerDown as PointerEventHandler<HTMLElement> | undefined },
    gripProps: {
      ...s.attributes,
      ref: s.setActivatorNodeRef,
      onKeyDown: s.listeners?.onKeyDown as KeyboardEventHandler<HTMLElement> | undefined,
      title: 'Drag to move (or focus and press Space, then arrow keys)',
    },
  };
}

export type DragBox = Pick<ReturnType<typeof useSortableBox>, 'boxProps' | 'gripProps'>;

export const dragId = (type: DragType, id: string) => `${type}:${id}`;
export const rawId = (id: string | number) => String(id).slice(String(id).indexOf(':') + 1);
