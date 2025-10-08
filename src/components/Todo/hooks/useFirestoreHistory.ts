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

export interface UseFirestoreSyncResult<T> {
  items: T[];
  updateItems: (newItems: T[]) => void;
  selectedItemIds: { [boxId: string]: string[] };
  setSelectedItemIds: React.Dispatch<
    React.SetStateAction<{ [boxId: string]: string[] }>
  >;
  toggleItemSelection: (boxId: string, itemId: string) => void;
}

export function useFirestoreHistory<T>(
  collection: string,
  docId: string,
  defaultData: T[],
  field: string = "items"
): UseFirestoreSyncResult<T> {
  const [items, setItems] = useState<T[]>(defaultData);
  const [selectedItemIds, setSelectedItemIds] = useState<{
    [boxId: string]: string[];
  }>({});
  const isRemoteUpdate = useRef(false);
  const hasLoadedInitially = useRef(false); // ✅ Firestore 초기 로딩 여부 플래그

  // ✅ Firestore 실시간 리스너 (onSnapshot)
  useEffect(() => {
    const docRef = doc(db, collection, docId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const docData = snap.data() as Record<string, unknown> | undefined;
      const data = (docData?.[field] as T[]) || defaultData;

      isRemoteUpdate.current = true;
      setItems(data);

      // 🔒 첫 로딩 이후부터만 저장 허용
      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
      }
    });

    return () => unsubscribe();
  }, [collection, docId, field]);

  // ✅ Firestore 저장 로직 (onSnapshot에서 들어온 변경은 무시)
  useEffect(() => {
    if (!hasLoadedInitially.current || isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    // Firestore에 변경사항 저장
    setDoc(doc(db, collection, docId), { [field]: items });
  }, [items, collection, docId, field]);

  // ✅ 외부에서 호출 가능한 업데이트 함수
  const updateItems = (newItems: T[]) => {
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
    updateItems,
    selectedItemIds,
    setSelectedItemIds,
    toggleItemSelection,
  };
}
