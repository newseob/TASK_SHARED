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

  // 🧹 Firestore → 로컬 반영 (onSnapshot)
  useEffect(() => {
    const docRef = doc(db, collection, docId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      // 🔸 문서가 아직 없을 수도 있음
      if (!snap.exists()) {
        console.warn("Firestore 문서가 존재하지 않아 기본값으로 초기화됨");
        setItems(defaultData);
        return;
      }

      const docData = snap.data() as Record<string, unknown> | undefined;
      let data = (docData?.[field] as T[]) ?? defaultData;

      // 🔸 데이터가 배열이 아닐 경우 방어
      if (!Array.isArray(data)) data = defaultData;

      isRemoteUpdate.current = true;
      setItems(data);

      // ✅ 초기 로드시 첫 히스토리 생성
      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
        setHistory([data]);
        setHistoryIndex(0);
        return;
      }

      // ✅ Undo 중이 아닐 때 외부 변경 히스토리 반영
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

  // 🧹 로컬 → Firestore 저장
  const save = async () => {
    savingRef.current = true;
    try {
      // 🔸 데이터 방어: undefined 제거 + 필터
      let safeData = Array.isArray(items)
        ? items.filter(Boolean).map(cleanData)
        : [];

      // 🔸 Firestore 저장 (undefined 완전 차단)
      await setDoc(doc(db, collection, docId), { [field]: safeData });

      // ✅ 저장 성공 후 히스토리 추가
      setHistory((prev) => {
        const cut = prev.slice(0, historyIndex + 1);
        return [...cut, safeData];
      });
      setHistoryIndex((i) => i + 1);
    } finally {
      savingRef.current = false;
    }
  };

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
