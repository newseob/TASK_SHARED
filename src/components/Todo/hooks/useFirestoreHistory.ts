import { useState, useEffect, useRef } from "react";
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
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
  setSelectedItemIds: React.Dispatch<React.SetStateAction<{ [boxId: string]: string[] }>>;
  toggleItemSelection: (boxId: string, itemId: string) => void;
  isUndoing: boolean;
}

function cleanData(obj: any): any {
  if (Array.isArray(obj)) return obj.map(cleanData).filter(Boolean);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = cleanData(v);
    return out;
  }
  return obj;
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

  const [selectedItemIds, setSelectedItemIds] = useState<{ [boxId: string]: string[] }>({});

  // ───────────────────────────────
  // 1) 구독 시작 전: 문서 존재 보장 (pre-create)
  // ───────────────────────────────
  useEffect(() => {
    let unsub: (() => void) | null = null;
    const docRef = doc(db, collection, docId);

    (async () => {
      console.log(`[Init] 🔗 Path = ${collection}/${docId} (field=${field})`);
      try {
        const first = await getDoc(docRef);
        if (!first.exists()) {
          console.warn("[Firestore] ❗ Document not found → creating with defaultData");
          await setDoc(docRef, { [field]: defaultData });
          console.log("[Firestore] 🟢 Created:", `${collection}/${docId}`);
        }
      } catch (e) {
        console.error("[Firestore] 🔴 Pre-create failed:", e);
      }

      // ── 이제 안전하게 구독 시작
      unsub = onSnapshot(docRef, (snap) => {
        const dataInDoc = (snap.data()?.[field] as T[]) ?? defaultData;
        const data = Array.isArray(dataInDoc) ? dataInDoc : defaultData;

        if (!hasLoadedInitially.current) {
          hasLoadedInitially.current = true;
          setItems(data);
          setHistory([data]);
          setHistoryIndex(0);
          console.log("[History] ✅ Initialized first snapshot.");
          return;
        }

        if (isUndoing.current) {
          console.log("[Firestore] ⏸️ Undo in progress → skip snapshot apply");
          return;
        }

        console.log("[Firestore] 📥 onSnapshot received");
        isRemoteUpdate.current = true;
        setItems(data);
      });
    })();

    return () => {
      if (unsub) {
        console.log("[Firestore] 🔌 Unsubscribed:", `${collection}/${docId}`);
        unsub();
      }
    };
    // ⚠️ defaultData는 초기값일 뿐이므로 의존성에서 제외 (불필요 재구독 방지)
  }, [collection, docId, field]);

  // ───────────────────────────────
  // 2) 로컬 → Firestore 저장
  // ───────────────────────────────
  const save = async () => {
    const safeData = items.filter(Boolean).map(cleanData);

    // 첫 저장 방어: 히스토리가 없으면 무조건 한 번 기록
    const last = historyIndex >= 0 ? history[historyIndex] : undefined;
    if (last && JSON.stringify(last) === JSON.stringify(safeData)) {
      console.log("[Save] ⚪ No actual change → skip save");
      return;
    }

    savingRef.current = true;
    try {
      console.log("[Save] 💾 setDoc");
      await setDoc(doc(db, collection, docId), { [field]: safeData }, { merge: true });
      console.log("[Save] ✅ Firestore save complete");

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
  // 3) items 변경 → 자동 저장 (원격/Undo 중은 스킵)
  // ───────────────────────────────
  useEffect(() => {
    if (!hasLoadedInitially.current || isUndoing.current || isRemoteUpdate.current || savingRef.current) {
      if (isRemoteUpdate.current) {
        console.log("[Sync] 🔄 Remote snapshot → skip this save");
        setTimeout(() => (isRemoteUpdate.current = false), 300);
      }
      return;
    }
    console.log("[Sync] 🟢 Local change detected → trigger save()");
    save();
  }, [items]); // eslint-disable-line

  // 최신 history refs
  const historyRef = useRef<T[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  // ───────────────────────────────
  // 4) Ctrl+Z (Undo)
  // ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const h = historyRef.current;
      const idx = historyIndexRef.current;
      if (!h || h.length === 0) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (idx <= 0) return;

        isUndoing.current = true;
        const newIdx = idx - 1;
        const snapshot = h[newIdx] ?? [];
        const cleaned = Array.isArray(snapshot) ? snapshot.filter(Boolean).map(cleanData) : [];

        setItems(cleaned);
        setHistoryIndex(newIdx);

        setDoc(doc(db, collection, docId), { [field]: cleaned }, { merge: true })
          .then(() => {
            console.log("[Undo] ✅ Reverted in Firestore");
            setTimeout(() => {
              isUndoing.current = false;
            }, 400);
          })
          .catch((err) => console.error("[Undo] ❌ Firestore update error:", err));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collection, docId, field]);

  const updateWithHistory = (newItems: T[]) => {
    console.log("[Update] ✏️ updateWithHistory");
    setItems(newItems);
  };

  const toggleItemSelection = (boxId: string, itemId: string) => {
    setSelectedItemIds((prev) => {
      const cur = prev[boxId] || [];
      return {
        ...prev,
        [boxId]: cur.includes(itemId) ? cur.filter((id) => id !== itemId) : [...cur, itemId],
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
