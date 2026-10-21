import { useState, useCallback, useRef } from 'react';
import { SubtitleCue } from '../types';

export interface HistoryItem {
  cues: SubtitleCue[];
  actionName: string;
  timestamp: number;
}

export function useSubtitleHistory(initialCues: SubtitleCue[]) {
  const [cues, setCuesState] = useState<SubtitleCue[]>(initialCues);
  const [past, setPast] = useState<HistoryItem[]>([]);
  const [future, setFuture] = useState<HistoryItem[]>([]);
  const [lastAction, setLastAction] = useState<string>('');

  const cuesRef = useRef<SubtitleCue[]>(cues);
  cuesRef.current = cues;

  // Max history stack size to prevent memory bloat
  const MAX_HISTORY = 40;

  /**
   * Updates cues and automatically records the previous state to the past stack.
   * Can accept either a new array or an updater callback, plus an optional action label.
   */
  const setCues = useCallback(
    (
      newCuesOrFn: SubtitleCue[] | ((prev: SubtitleCue[]) => SubtitleCue[]),
      actionName = 'កែសម្រួល Subtitle'
    ) => {
      setCuesState((current) => {
        const nextCues = typeof newCuesOrFn === 'function' ? newCuesOrFn(current) : newCuesOrFn;

        // Skip recording if data is identical
        if (JSON.stringify(current) === JSON.stringify(nextCues)) {
          return current;
        }

        setPast((prevPast) => {
          const item: HistoryItem = {
            cues: current,
            actionName,
            timestamp: Date.now(),
          };
          const newPast = [...prevPast, item];
          if (newPast.length > MAX_HISTORY) {
            return newPast.slice(newPast.length - MAX_HISTORY);
          }
          return newPast;
        });

        // Clear future stack when a new forward action is taken
        setFuture([]);
        setLastAction(actionName);

        return nextCues;
      });
    },
    []
  );

  /**
   * Reverts to the previous state in history
   */
  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFuture((prevFuture) => [
        { cues: cuesRef.current, actionName: previous.actionName, timestamp: Date.now() },
        ...prevFuture,
      ]);

      setCuesState(previous.cues);
      setLastAction(`Undo: ${previous.actionName}`);
      return newPast;
    });
  }, []);

  /**
   * Reapplies an undone state from future
   */
  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast((prevPast) => [
        ...prevPast,
        { cues: cuesRef.current, actionName: next.actionName, timestamp: Date.now() },
      ]);

      setCuesState(next.cues);
      setLastAction(`Redo: ${next.actionName}`);
      return newFuture;
    });
  }, []);

  /**
   * Resets both cues and history stacks (e.g. when loading new project or resetting demo)
   */
  const resetCuesAndHistory = useCallback((newCues: SubtitleCue[]) => {
    setCuesState(newCues);
    setPast([]);
    setFuture([]);
    setLastAction('');
  }, []);

  return {
    cues,
    setCues,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoCount: past.length,
    redoCount: future.length,
    lastAction,
    resetCuesAndHistory,
  };
}
