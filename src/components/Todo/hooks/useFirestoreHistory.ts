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
  if (Array.isArray(obj)) return obj.map(cleanData);
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
  // Firestore → 로컬 반영 (Undo 대응)
  // ───────────────────────────────
  useEffect(() => {
    const docRef = doc(db, collection, docId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const docData = snap.data() as Record<string, unknown> | undefined;
      const data = (docData?.[field] as T[]) ?? defaultData;

      // 🔹 Firestore에서 온 업데이트 표시
      isRemoteUpdate.current = true;
      setItems(data);

      // ✅ 초기 로드시만 첫 히스토리 생성
      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
        setHistory([data]);
        setHistoryIndex(0);
        return;
      }

      // ✅ Undo 중이 아닐 때 외부 변경도 히스토리에 반영
      if (!isUndoing.current) {
        setHistory((prev) => {
          const cut = prev.slice(0, historyIndex + 1);
          return [...cut, data];
        });
        setHistoryIndex((i) => i + 1);
      }
    });

    return () => unsubscribe();
  }, [collection, docId, field, defaultData, historyIndex]);

  // ───────────────────────────────
  // 로컬 변경 → Firestore 저장 + 히스토리 추가
  // ───────────────────────────────
  useEffect(() => {
    if (
      !hasLoadedInitially.current || // 초기 로드 전이면 저장 금지
      isUndoing.current ||           // Undo 중이면 저장 금지
      isRemoteUpdate.current ||      // 방금 Firestore에서 온 변경이면 금지
      savingRef.current              // 저장 중복 방지
    ) {
      // Firestore에서 온 변경은 한 번만 무시하고 해제
      isRemoteUpdate.current = false;
      return;
    }

    const save = async () => {
      savingRef.current = true;
      try {
        // 🔸 undefined 필드 제거 후 Firestore에 저장
        const safeData = cleanData(items);
        if (!Array.isArray(safeData)) return; // 안전장치

        await setDoc(doc(db, collection, docId), { [field]: safeData });

        // ✅ 저장 성공 후에만 히스토리 추가
        setHistory((prev) => {
          const cut = prev.slice(0, historyIndex + 1);
          return [...cut, safeData];
        });
        setHistoryIndex((i) => i + 1);
      } finally {
        savingRef.current = false;
      }
    };

    save();
  }, [items, collection, docId, field, historyIndex]);

  // ───────────────────────────────
  // Ctrl+Z (Undo)
  // ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && historyIndex > 0) {
        e.preventDefault();
        isUndoing.current = true;

        const newIdx = historyIndex - 1;
        const snapshot = history[newIdx];

        setItems(snapshot);
        setHistoryIndex(newIdx);

        // 🔸 Firestore 반영 (UI 즉시 반영, 저장 비동기)
        setDoc(doc(db, collection, docId), { [field]: cleanData(snapshot) })
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
  const updateWithHistory = (newItems: T[]) => setItems(newItems);

  // ───────────────────────────────
  // 선택 토글
  // ───────────────────────────────
  const toggleItemSelection = (boxId: string, itemId: string) => {
    setSelectedItemIds((prev) => {
      const selected = prev[boxId] || [];
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
