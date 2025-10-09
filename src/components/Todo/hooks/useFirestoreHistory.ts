import { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";

// ───────────────────────────────
// 타입 정의
// ───────────────────────────────
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
  setSelectedItemIds: React.Dispatch<
    React.SetStateAction<{ [boxId: string]: string[] }>
  >;
  toggleItemSelection: (boxId: string, itemId: string) => void;
  isUndoing: boolean;
}

// ───────────────────────────────
// undefined 필드 정리 유틸
// ───────────────────────────────
function cleanData(obj: any): any {
  if (Array.isArray(obj)) return obj.map(cleanData).filter(Boolean);
  if (obj && typeof obj === "object") {
    const cleaned: any = {};
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined) cleaned[k] = cleanData(v);
    });
    return cleaned;
  }
  return obj;
}

// ───────────────────────────────
// useFirestoreHistory
// ───────────────────────────────
export function useFirestoreHistory<T>(
  collection: string,
  docId: string,
  defaultData: T[],
  field: string = "items"
): UseFirestoreHistoryResult<T> {
  const [items, setItems] = useState<T[]>(defaultData);
  const [history, setHistory] = useState<T[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isUndoing = useRef(false);
  const isRemoteUpdate = useRef(false);
  const hasLoadedInitially = useRef(false);
  const savingRef = useRef(false);

  const [selectedItemIds, setSelectedItemIds] = useState<{
    [boxId: string]: string[];
  }>({});

  // 🧹 Firestore → 로컬 반영 (onSnapshot)
  useEffect(() => {
    const docRef = doc(db, collection, docId);
    console.log("[Firestore] 🔗 Subscribing to:", `${collection}/${docId}`);

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        console.warn("[Firestore] ❗ Document not found. Initializing with defaultData.");
        setItems(defaultData);
        return;
      }

      const docData = snap.data() as Record<string, unknown> | undefined;
      let data = (docData?.[field] as T[]) ?? defaultData;

      if (!Array.isArray(data)) {
        console.warn("[Firestore] ⚠️ Data not array. Resetting to defaultData.");
        data = defaultData;
      }

      console.log("[Firestore] 📥 onSnapshot received:", data);

      isRemoteUpdate.current = true;
      setItems(data);

      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
        setHistory([data]);
        setHistoryIndex(0);
        console.log("[History] ✅ Initialized with first snapshot.");
        return;
      }

      if (!isUndoing.current) {
        setHistory((prev) => {
          const cut = prev.slice(0, historyIndex + 1);
          console.log("[History] ➕ Added Firestore change to history.");
          return [...cut, data];
        });
        setHistoryIndex((i) => i + 1);
      }
    });

    return () => {
      console.log("[Firestore] 🔌 Unsubscribed from:", `${collection}/${docId}`);
      unsubscribe();
    };
  }, [collection, docId, field]);

  // 🧹 로컬 → Firestore 저장
  const save = async () => {
    const safeData = items.filter(Boolean).map(cleanData);

    // 🔸 직전 히스토리와 동일하면 저장 생략
    const lastHistory = history[historyIndex];
    if (JSON.stringify(lastHistory) === JSON.stringify(safeData)) {
      console.log("[Save] ⚪ No actual changes, skip Firestore update.");
      return;
    }

    savingRef.current = true;
    try {
      let safeData = items.filter(Boolean).map(cleanData);
      console.log("[Save] 💾 Trying to save:", safeData);

      await setDoc(doc(db, collection, docId), { [field]: safeData });
      console.log("[Save] ✅ Saved successfully to Firestore.");

      setHistory((prev) => {
        const cut = prev.slice(0, historyIndex + 1);
        console.log("[History] ➕ Added local change to history.");
        return [...cut, safeData];
      });
      setHistoryIndex((i) => i + 1);
    } catch (err) {
      console.error("[Save] ❌ Firestore save failed:", err);
    } finally {
      savingRef.current = false;
    }
  };

  // 로컬 변경 감지 → 자동 저장 useEffect 내부
  useEffect(() => {
    if (
      !hasLoadedInitially.current ||
      isUndoing.current ||
      isRemoteUpdate.current ||
      savingRef.current
    ) {
      if (isRemoteUpdate.current) {
        console.log("[Sync] 🔄 Firestore update detected, skip saving once.");

        // 🔸 300ms 후에 플래그 해제 (루프 방지)
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 300);

        return;
      }
      return;
    }

    console.log("[Sync] 🟢 Local items changed, triggering save...");
    save();
  }, [items]);

  // 최신 history / index 값을 ref로 동기화
  const historyRef = useRef<T[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  // Ctrl+Z (Undo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && historyIndex > 0) {
        e.preventDefault();
        isUndoing.current = true;

        const newIdx = historyIndex - 1;
        const snapshot = history[newIdx];
        if (!snapshot) {
          console.warn("[Undo] ⚠️ Snapshot undefined, skip.");
          isUndoing.current = false;
          return;
        }

        const cleanedSnapshot = Array.isArray(snapshot)
          ? snapshot.filter(Boolean).map(cleanData)
          : [];

        setItems(cleanedSnapshot);
        setHistoryIndex(newIdx);

        setDoc(doc(db, collection, docId), { [field]: cleanedSnapshot })
          .then(() => console.log("[Undo] ✅ Firestore reverted to history"))
          .catch((err) => console.error("[Undo] ❌ Firestore update error:", err))
          .finally(() => {
            isUndoing.current = false;
          });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, historyIndex, collection, docId, field]);

  // ───────────────────────────────
  // 외부에서 items 갱신
  // ───────────────────────────────
  const updateWithHistory = (newItems: T[]) => {
    console.log("[Update] ✏️ updateWithHistory called:", newItems);
    setItems(newItems);
  };

  // ───────────────────────────────
  // 선택 토글
  // ───────────────────────────────
  const toggleItemSelection = (boxId: string, itemId: string) => {
    setSelectedItemIds((prev) => {
      const selected = prev[boxId] || [];
      console.log(`[Selection] 🔘 Toggled item '${itemId}' in box '${boxId}'.`);
      return {
        ...prev,
        [boxId]: selected.includes(itemId)
          ? selected.filter((id) => id !== itemId)
          : [...selected, itemId],
      };
    });
  };

  // ───────────────────────────────
  // 반환
  // ───────────────────────────────
  return {
    items,
    updateWithHistory,
    selectedItemIds,
    setSelectedItemIds,
    toggleItemSelection,
    isUndoing: isUndoing.current,
  };
}
