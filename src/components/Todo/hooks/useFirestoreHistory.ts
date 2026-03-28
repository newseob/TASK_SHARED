import { useEffect, useRef, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useGlobalUndoScope } from "../../../hooks/useGlobalUndoScope";

export interface TodoItem {
  id: string;
  text: string;
  count?: string;
  unit?: string;
  status?: "none" | "blue" | "red";
}

export interface TodoBox {
  id: string;
  title: string;
  items: TodoItem[];
  mode: "default" | "shopping";
}

export interface UseFirestoreHistoryResult<T> {
  items: T[];
  updateWithHistory: (newItems: T[]) => void;
  selectedItemIds: { [boxId: string]: string[] };
  setSelectedItemIds: React.Dispatch<React.SetStateAction<{ [boxId: string]: string[] }>>;
  toggleItemSelection: (boxId: string, itemId: string) => void;
  isUndoing: boolean;
}

function cleanData(value: any): any {
  if (Array.isArray(value)) {
    return value.map(cleanData).filter(Boolean);
  }

  if (value && typeof value === "object") {
    const output: Record<string, any> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        output[key] = cleanData(entry);
      }
    }

    return output;
  }

  return value;
}

function normalizeItems<T>(value: T[] | undefined, fallback: T[]) {
  const source = Array.isArray(value) ? value : fallback;
  return source.filter(Boolean).map((item) => cleanData(item)) as T[];
}

function isSameSnapshot<T>(left: T[], right: T[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useFirestoreHistory<T>(
  collection: string,
  docId: string,
  defaultData: T[],
  field = "items"
): UseFirestoreHistoryResult<T> {
  const [items, setItems] = useState<T[]>(defaultData);
  const [history, setHistory] = useState<T[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedItemIds, setSelectedItemIds] = useState<{ [boxId: string]: string[] }>({});

  const itemsRef = useRef<T[]>(defaultData);
  const historyRef = useRef<T[][]>([]);
  const historyIndexRef = useRef(-1);
  const lastPersistedRef = useRef<T[]>(normalizeItems(defaultData, defaultData));
  const isUndoingRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const isSavingRef = useRef(false);
  const hasLoadedInitiallyRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  const persistItems = async (snapshot: T[]) => {
    if (isSameSnapshot(lastPersistedRef.current, snapshot)) {
      return;
    }

    isSavingRef.current = true;

    try {
      await setDoc(doc(db, collection, docId), { [field]: snapshot }, { merge: true });
      lastPersistedRef.current = snapshot;
    } catch (error) {
      console.error("[History] Firestore save failed:", error);
    } finally {
      isSavingRef.current = false;
    }
  };

  const setHistoryState = (nextHistory: T[][], nextIndex: number) => {
    historyRef.current = nextHistory;
    historyIndexRef.current = nextIndex;
    setHistory(nextHistory);
    setHistoryIndex(nextIndex);
  };

  const applyUndo = async () => {
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0) return;

    const snapshot = normalizeItems(historyRef.current[nextIndex], defaultData);

    isUndoingRef.current = true;
    setItems(snapshot);
    setHistoryIndex(nextIndex);
    historyIndexRef.current = nextIndex;

    try {
      await setDoc(doc(db, collection, docId), { [field]: snapshot }, { merge: true });
      lastPersistedRef.current = snapshot;
    } catch (error) {
      console.error("[Undo] Firestore update failed:", error);
    } finally {
      window.setTimeout(() => {
        isUndoingRef.current = false;
      }, 250);
    }
  };

  const { touch } = useGlobalUndoScope({
    canUndo: () => historyIndexRef.current > 0,
    undo: applyUndo,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const docRef = doc(db, collection, docId);

    (async () => {
      try {
        const firstSnapshot = await getDoc(docRef);

        if (!firstSnapshot.exists()) {
          const initialItems = normalizeItems(defaultData, defaultData);
          await setDoc(docRef, { [field]: initialItems });
          lastPersistedRef.current = initialItems;
        }
      } catch (error) {
        console.error("[Firestore] Pre-create failed:", error);
      }

      unsubscribe = onSnapshot(docRef, (snapshot) => {
        const data = normalizeItems(snapshot.data()?.[field] as T[] | undefined, defaultData);
        lastPersistedRef.current = data;

        if (!hasLoadedInitiallyRef.current) {
          hasLoadedInitiallyRef.current = true;
          setItems(data);
          setHistoryState([data], 0);
          return;
        }

        if (isUndoingRef.current) {
          return;
        }

        isRemoteUpdateRef.current = true;
        setItems(data);
      });
    })();

    return () => {
      unsubscribe?.();
    };
  }, [collection, docId, field]);

  useEffect(() => {
    if (!hasLoadedInitiallyRef.current) return;
    if (isUndoingRef.current) return;
    if (isSavingRef.current) return;

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    const snapshot = normalizeItems(itemsRef.current, defaultData);
    void persistItems(snapshot);
  }, [items, collection, docId, field]);

  const updateWithHistory = (newItems: T[]) => {
    const snapshot = normalizeItems(newItems, defaultData);
    const currentSnapshot = historyRef.current[historyIndexRef.current] ?? [];

    if (isSameSnapshot(currentSnapshot, snapshot)) {
      setItems(snapshot);
      return;
    }

    const nextHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), snapshot];
    const nextIndex = nextHistory.length - 1;

    setItems(snapshot);
    setHistoryState(nextHistory, nextIndex);
    touch();
  };

  const toggleItemSelection = (boxId: string, itemId: string) => {
    setSelectedItemIds((prev) => {
      const currentIds = prev[boxId] || [];

      return {
        ...prev,
        [boxId]: currentIds.includes(itemId)
          ? currentIds.filter((id) => id !== itemId)
          : [...currentIds, itemId],
      };
    });
  };

  return {
    items,
    updateWithHistory,
    selectedItemIds,
    setSelectedItemIds,
    toggleItemSelection,
    isUndoing: isUndoingRef.current,
  };
}
