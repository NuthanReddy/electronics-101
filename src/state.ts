import { lessons } from './lessons';

export interface SavedState {
  lessonId: string;
  completed: string[];
  motion: boolean;
  current: boolean;
  sound: boolean;
}
export const storageKey = 'electronics101-workbench-v1';
export const emptyState = (): SavedState => ({ lessonId: lessons[0].id, completed: [], motion: true, current: true, sound: false });
export function decodeState(value: string | null): SavedState {
  if (!value) return emptyState();
  const raw: unknown = JSON.parse(value);
  if (typeof raw !== 'object' || raw === null) throw new Error('Saved progress is not an object.');
  const state = raw as Record<string, unknown>;
  const ids = new Set(lessons.map(lesson => lesson.id));
  return {
    lessonId: typeof state.lessonId === 'string' && ids.has(state.lessonId) ? state.lessonId : lessons[0].id,
    completed: Array.isArray(state.completed) ? [...new Set(state.completed.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : [],
    motion: state.motion !== false,
    current: state.current !== false,
    sound: state.sound === true,
  };
}
export function completeLesson(state: SavedState, id: string): SavedState {
  if (!lessons.some(lesson => lesson.id === id)) throw new Error(`Unknown lesson: ${id}`);
  return { ...state, completed: [...new Set([...state.completed, id])] };
}
