import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export interface TodoItem {
  id: string;
  text: string;
  count?: string;
  unit?: string;
  status?: 'none' | 'blue' | 'red';
}

export interface TodoBox {
  id: string;
  title: string;
  items: TodoItem[];
  mode: 'default' | 'shopping';
}

export interface UseFirestoreHistoryResult<T> {
  items: T[];
  updateWithHistory: (newItems: T[]) => void;
  selectedItemIds: { [boxId: string]: string[] };
  setSelectedItemIds: React.Dispatch<React.SetStateAction<{ [boxId: string]: string[] }>>;
  toggleItemSelection: (boxId: string, itemId: string) => void;
  isUndoing: boolean;
}

export function useFirestoreHistory<T>(
  collection: string,
  docId: string,
  defaultData: T[],
  field: string = "items"
) {
  const [items, setItems] = useState<T[]>(defaultData);
  const [history, setHistory] = useState<T[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoing = useRef(false);

  const [selectedItemIds, setSelectedItemIds] = useState<{
    [boxId: string]: string[];
  }>({});

  // 초기 로딩
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, collection, docId));
      const docData = snap.data() as Record<string, unknown> | undefined;
      const data = (docData?.[field] as T[]) || defaultData;
      setItems(data);
      setHistory([data]);
      setHistoryIndex(0);
    })();
  }, []);

  // 저장 및 히스토리 쌓기
  useEffect(() => {
    if (historyIndex < 0 || isUndoing.current) return;

    setDoc(doc(db, collection, docId), { [field]: items });

    setHistory((prev) => {
      const cut = prev.slice(0, historyIndex + 1);
      return [...cut, items];
    });
    setHistoryIndex((i) => i + 1);
  }, [items]);

  // Ctrl+Z Undo
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && historyIndex > 0) {
        isUndoing.current = true;
        const newIdx = historyIndex - 1;
        setItems(history[newIdx]);
        setHistoryIndex(newIdx);
        await setDoc(doc(db, collection, docId), { items: history[newIdx] });
        isUndoing.current = false;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [history, historyIndex]);

  // 히스토리와 함께 업데이트
  const updateWithHistory = (newItems: T[]) => {
    setItems(newItems);
  };

  // 선택 항목 토글
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
  } satisfies UseFirestoreHistoryResult<T>;
}
