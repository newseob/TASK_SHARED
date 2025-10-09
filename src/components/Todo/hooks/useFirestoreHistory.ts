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

  // ───────────────────────────────
  // Firestore → 로컬 반영
  // ───────────────────────────────
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

      // Undo 중이면 Firestore 스냅샷 무시
      if (isUndoing.current) {
        console.log("[Firestore] ⏸️ Undo in progress → skip snapshot apply");
        return;
      }

      console.log("[Firestore] 📥 onSnapshot received:", data);

      // Firestore 갱신 신호
      isRemoteUpdate.current = true;
      setItems(data);

      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
        setHistory([data]);
        setHistoryIndex(0);
        console.log("[History] ✅ Initialized with first snapshot.");
        return;
      }

      // Undo 중이 아닐 때만 히스토리 추가
      setHistory((prev) => {
        const cut = prev.slice(0, historyIndex + 1);
        console.log("[History] ➕ Added Firestore change to history.");
        return [...cut, data];
      });
      setHistoryIndex((i) => i + 1);
    });

    return () => {
      console.log("[Firestore] 🔌 Unsubscribed from:", `${collection}/${docId}`);
      unsubscribe();
    };
  }, [collection, docId, field, defaultData, historyIndex]);

  // ───────────────────────────────
  // 로컬 → Firestore 저장
  // ───────────────────────────────
  const save = async () => {
    const safeData = items.filter(Boolean).map(cleanData);

    const lastHistory = history[historyIndex];
    if (JSON.stringify(lastHistory) === JSON.stringify(safeData)) {
      console.log("[Save] ⚪ No actual change, skip Firestore update.");
      return;
    }

    savingRef.current = true;
    try {
      console.log("[Save] 💾 Saving to Firestore:", safeData);
      await setDoc(doc(db, collection, docId), { [field]: safeData });
      console.log("[Save] ✅ Saved successfully to Firestore.");

      // 로컬 히스토리 갱신
      setHistory((prev) => {
        const cut = prev.slice(0, historyIndex + 1);
        return [...cut, safeData];
      });
      setHistoryIndex((i) => i + 1);
    } catch (err) {
      console.error("[Save] ❌ Firestore save failed:", err);
    } finally {
      savingRef.current = false;
    }
  };

  // ───────────────────────────────
  // 로컬 변경 감지 → 자동 저장
  // ───────────────────────────────
  useEffect(() => {
    // Undo, Firestore, 초기로드, 저장 중이면 스킵
    if (
      !hasLoadedInitially.current ||
      isUndoing.current ||
      isRemoteUpdate.current ||
      savingRef.current
    ) {
      if (isRemoteUpdate.current) {
        console.log("[Sync] 🔄 Firestore update detected, skip saving once.");
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 300);
      }
      return;
    }

    console.log("[Sync] 🟢 Local items changed → save()");
    save();
  }, [items]);

  // ───────────────────────────────
  // 최신 history / index 동기화 ref
  // ───────────────────────────────
  const historyRef = useRef<T[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  // ───────────────────────────────
  // Ctrl+Z (Undo)
  // ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && currentIndex > 0) {
        e.preventDefault();
        console.log("[Undo] ⏪ Triggered Ctrl+Z");
        isUndoing.current = true;

        const newIdx = currentIndex - 1;
        const snapshot = currentHistory[newIdx];
        if (!snapshot) {
          console.warn("[Undo] ⚠️ Snapshot undefined, skip.");
          isUndoing.current = false;
          return;
        }

        const cleanedSnapshot = Array.isArray(snapshot)
          ? snapshot.filter(Boolean).map(cleanData)
          : [];

        console.log("[Undo] 🔄 Restoring snapshot index:", newIdx);
        setItems(cleanedSnapshot);
        setHistoryIndex(newIdx);

        setDoc(doc(db, collection, docId), { [field]: cleanedSnapshot })
          .then(() => console.log("[Undo] ✅ Firestore reverted to snapshot"))
          .catch((err) => console.error("[Undo] ❌ Firestore update error:", err))
          .finally(() => {
            // 500ms 딜레이 후 Undo 상태 해제 (루프 방지)
            setTimeout(() => {
              isUndoing.current = false;
              console.log("[Undo] 🔚 Undo complete, resume syncing");
            }, 500);
          });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collection, docId, field]);

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
      console.log(`[Selection] 🔘 Toggle '${itemId}' in box '${boxId}'`);
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
