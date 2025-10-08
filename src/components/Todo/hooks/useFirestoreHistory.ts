import { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
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
  const savingRef = useRef(false);
  const localLastModified = useRef<number>(0); // 🔹 로컬 저장시간 기록

  const [selectedItemIds, setSelectedItemIds] = useState<{
    [boxId: string]: string[];
  }>({});

  // ✅ Firestore → 로컬 반영
  useEffect(() => {
    const docRef = doc(db, collection, docId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const docData = snap.data() as
        | (Record<string, unknown> & { lastModifiedAt?: Timestamp })
        | undefined;

      const data = (docData?.[field] as T[]) || defaultData;
      const remoteModified = docData?.lastModifiedAt?.toMillis?.() ?? 0;

      // 🔒 로컬이 더 최신이라면 Firestore 데이터 무시
      if (remoteModified < localLastModified.current) {
        console.log("⚠️ Firestore 데이터가 더 오래됨 → 무시");
        return;
      }

      isRemoteUpdate.current = true;
      setItems(data);

      if (!hasLoadedInitially.current) {
        hasLoadedInitially.current = true;
      }

      // 히스토리 초기화
      setHistory((prev) => (prev.length === 0 ? [data] : prev));
      setHistoryIndex((prev) => (prev === -1 ? 0 : prev));
    });

    return () => unsubscribe();
  }, [collection, docId, field, defaultData]);

  // ✅ 로컬 변경 → Firestore 저장 + 히스토리 추가
  useEffect(() => {
    const saveData = async () => {
      if (
        !hasLoadedInitially.current || // 초기 로드 전
        isUndoing.current || // Undo 중
        isRemoteUpdate.current || // Firestore에서 온 변경
        savingRef.current // 중복 저장 방지
      ) {
        isRemoteUpdate.current = false;
        return;
      }

      savingRef.current = true;
      try {
        const docRef = doc(db, collection, docId);
        const now = Date.now();
        localLastModified.current = now;

        // ⏰ Firestore에 저장 + 서버시간 기록
        await setDoc(docRef, {
          [field]: items,
          lastModifiedAt: serverTimestamp(),
        });

        // 히스토리 스택에 추가
        setHistory((prev) => {
          const cut = prev.slice(0, historyIndex + 1);
          return [...cut, items];
        });
        setHistoryIndex((i) => i + 1);
      } finally {
        savingRef.current = false;
      }
    };

    saveData();
  }, [items, collection, docId, field, historyIndex]);

  // ✅ Ctrl+Z (Undo)
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && historyIndex > 0) {
        e.preventDefault();
        isUndoing.current = true;

        const newIdx = historyIndex - 1;
        const newData = history[newIdx];
        const now = Date.now();
        localLastModified.current = now;

        setItems(newData);
        setHistoryIndex(newIdx);

        const docRef = doc(db, collection, docId);
        await setDoc(docRef, {
          [field]: newData,
          lastModifiedAt: serverTimestamp(),
        });

        isUndoing.current = false;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, historyIndex, collection, docId, field]);

  // ✅ 외부 업데이트 함수
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
