import { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";

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

  const [selectedItemIds, setSelectedItemIds] = useState<{
    [boxId: string]: string[];
  }>({});

  // ✅ Firestore → 로컬 반영
  useEffect(() => {
    const docRef = doc(db, collection, docId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const docData = snap.data() as Record<string, unknown> | undefined;
      const data = (docData?.[field] as T[]) || defaultData;

      isRemoteUpdate.current = true;
      setItems(data);

      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
      }

      if (historyIndex === -1) {
        setHistory([data]);
        setHistoryIndex(0);
      }
    });

    return () => unsubscribe();
  }, [collection, docId, field]);

  // ✅ 로컬 변경 → Firestore 저장 + 히스토리 추가
  useEffect(() => {
    // 저장 제외 조건
    if (
      !hasLoadedInitially.current || // 초기 로드 전이면 X
      isUndoing.current || // Undo 중이면 X
      isRemoteUpdate.current // Firestore에서 온 변경이면 X
    ) {
      isRemoteUpdate.current = false;
      return;
    }

    // 저장 실행
    const docRef = doc(db, collection, docId);
    setDoc(docRef, { [field]: items });

    // 히스토리 추가
    setHistory((prev) => {
      const cut = prev.slice(0, historyIndex + 1);
      return [...cut, items];
    });
    setHistoryIndex((i) => i + 1);
  }, [items, collection, docId, field]);

  // ✅ Ctrl+Z (Undo)
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && historyIndex > 0) {
        isUndoing.current = true;
        const newIdx = historyIndex - 1;
        setItems(history[newIdx]);
        setHistoryIndex(newIdx);
        await setDoc(doc(db, collection, docId), { [field]: history[newIdx] });
        isUndoing.current = false;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, historyIndex, collection, docId, field]);

  // ✅ 외부에서 호출할 업데이트 함수
  const updateWithHistory = (newItems: T[]) => {
    setItems(newItems);
  };

  // ✅ 선택 항목 토글
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

  return {
    items,
    updateWithHistory,
    selectedItemIds,
    setSelectedItemIds,
    toggleItemSelection,
    isUndoing: isUndoing.current,
  };
}
