import { useCallback, useEffect, useRef } from "react";

type UndoAction = () => void | Promise<void>;

interface UndoScopeRecord {
  canUndo: () => boolean;
  enabled: () => boolean;
  undo: UndoAction;
  lastTouchedAt: number;
  order: number;
}

interface UseGlobalUndoScopeOptions {
  canUndo: () => boolean;
  enabled?: boolean;
  undo: UndoAction;
}

const undoScopes = new Map<string, UndoScopeRecord>();
let listenerAttached = false;
let scopeOrder = 0;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const editable = target.closest(
    "input, textarea, select, [contenteditable='true'], [contenteditable=''], .ProseMirror"
  );

  return Boolean(editable);
}

function getLatestUndoScope() {
  return [...undoScopes.values()]
    .filter((scope) => scope.enabled() && scope.canUndo())
    .sort((a, b) => {
      if (b.lastTouchedAt !== a.lastTouchedAt) {
        return b.lastTouchedAt - a.lastTouchedAt;
      }

      return b.order - a.order;
    })[0];
}

function handleUndoKeydown(event: KeyboardEvent) {
  const isUndoKey =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "z";

  if (!isUndoKey) return;
  if (isEditableTarget(event.target)) return;

  const latestScope = getLatestUndoScope();
  if (!latestScope) return;

  event.preventDefault();

  void Promise.resolve(latestScope.undo()).catch((error) => {
    console.error("[Undo] Global undo failed:", error);
  });
}

function ensureUndoListener() {
  if (listenerAttached || typeof window === "undefined") return;

  window.addEventListener("keydown", handleUndoKeydown);
  listenerAttached = true;
}

function registerUndoScope(
  id: string,
  canUndo: () => boolean,
  enabled: () => boolean,
  undo: UndoAction
) {
  ensureUndoListener();

  undoScopes.set(id, {
    canUndo,
    enabled,
    undo,
    lastTouchedAt: 0,
    order: scopeOrder++,
  });

  return () => {
    undoScopes.delete(id);
  };
}

function touchUndoScope(id: string) {
  const scope = undoScopes.get(id);
  if (!scope) return;

  scope.lastTouchedAt = Date.now();
}

export function useGlobalUndoScope({
  canUndo,
  enabled = true,
  undo,
}: UseGlobalUndoScopeOptions) {
  const idRef = useRef(`undo-scope-${scopeOrder + 1}-${Math.random().toString(36).slice(2)}`);
  const canUndoRef = useRef(canUndo);
  const enabledRef = useRef(enabled);
  const undoRef = useRef(undo);

  useEffect(() => {
    canUndoRef.current = canUndo;
  }, [canUndo]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    undoRef.current = undo;
  }, [undo]);

  useEffect(() => {
    return registerUndoScope(
      idRef.current,
      () => canUndoRef.current(),
      () => enabledRef.current,
      () => undoRef.current()
    );
  }, []);

  const touch = useCallback(() => {
    touchUndoScope(idRef.current);
  }, []);

  return { touch };
}
