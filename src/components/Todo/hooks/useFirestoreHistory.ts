import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
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

/**
 * ✅ Firestore와 실시간 동기화 훅
 * - 앱 실행 시 Firestore 최신 데이터를 먼저 불러옴
 * - 이후 변경 사항만 저장
 * - Undo 기능 제거
 */
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

  const hasLoadedInitially = useRef(false);
  const isRemoteUpdate = useRef(false);
  const savingRef = useRef(false);

  // ✅ Firestore → 로컬 초기 로딩 (최신본으로 덮어쓰기)
  useEffect(() => {
    const initialize = async () => {
      const docRef = doc(db, collection, docId);
      const snap = await getDoc(docRef);

      // 최신 데이터 불러오기 (없으면 defaultData 사용)
      const initialData = (snap.data()?.[field] as T[]) ?? defaultData;
      setItems(initialData);

      // 초기화 완료 후부터 저장 허용
      hasLoadedInitially.current = true;

      // 이후에는 실시간 리스너로 계속 반영
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        const newData = (snapshot.data()?.[field] as T[]) ?? defaultData;

        // Firestore → 로컬 반영 (단, 저장 루프에선 제외)
        isRemoteUpdate.current = true;
        setItems(newData);
      });

      return unsubscribe;
    };

    const unsubPromise = initialize();
    return () => {
      unsubPromise.then((unsub) => typeof unsub === "function" && unsub());
    };
  }, [collection, docId, field, defaultData]);

  // ✅ 로컬 변경 → Firestore 저장
  useEffect(() => {
    if (
      !hasLoadedInitially.current || // 초기 로드 전이면 저장 금지
      isRemoteUpdate.current ||      // Firestore에서 온 변경이면 저장 금지
      savingRef.current              // 저장 중이면 금지
    ) {
      isRemoteUpdate.current = false;
      return;
    }

    const save = async () => {
      savingRef.current = true;
      try {
        await setDoc(doc(db, collection, docId), { [field]: items });
      } finally {
        savingRef.current = false;
      }
    };

    save();
  }, [items, collection, docId, field]);

  // ✅ 외부에서 데이터 변경
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
