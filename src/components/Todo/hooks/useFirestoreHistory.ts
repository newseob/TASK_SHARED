import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

export function useFirestoreHistory<T>(
  collection: string,
  docId: string,
  defaultData: T[],
  field: string = "items"
) {
  const [items, setItems] = useState<T[]>(defaultData);
  const [selectedItemIds, setSelectedItemIds] = useState<{ [boxId: string]: string[] }>({});

  const hasLoadedInitially = useRef(false);
  const isRemoteUpdate = useRef(false);
  const savingRef = useRef(false);
  const clientId = useRef<string>(Math.random().toString(36).slice(2)); // 각 탭 고유 ID

  // ✅ Firestore → 로컬 초기화
  useEffect(() => {
    const initialize = async () => {
      const docRef = doc(db, collection, docId);
      const snap = await getDoc(docRef);
      const initialData = (snap.data()?.[field] as T[]) ?? defaultData;
      setItems(initialData);

      // 리스너 시작
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        // 🔸 내가 방금 저장한 데이터면 무시
        if (data.lastModifiedBy === clientId.current) return;

        const newData = (data[field] as T[]) ?? defaultData;
        isRemoteUpdate.current = true;
        setItems(newData);

        // 🔹 짧은 지연 후 해제 (루프 차단)
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 100);
      });

      hasLoadedInitially.current = true;
      return unsubscribe;
    };

    const unsubPromise = initialize();
    return () => {
      unsubPromise.then((unsub) => typeof unsub === "function" && unsub());
    };
  }, [collection, docId, field, defaultData]);

  // ✅ 로컬 → Firestore 저장
  useEffect(() => {
    if (
      !hasLoadedInitially.current ||
      savingRef.current ||
      isRemoteUpdate.current
    ) {
      return;
    }

    const save = async () => {
      savingRef.current = true;
      try {
        const docRef = doc(db, collection, docId);
        await setDoc(docRef, {
          [field]: items,
          lastModifiedBy: clientId.current, // 🔹 내 저장 구분
          updatedAt: serverTimestamp(),
        });
      } finally {
        savingRef.current = false;
      }
    };

    save();
  }, [items, collection, docId, field]);

  // ✅ 외부에서 아이템 업데이트
  const updateItems = (newItems: T[]) => setItems(newItems);

  // ✅ 선택 토글
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
