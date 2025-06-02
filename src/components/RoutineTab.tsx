import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

interface RoutineItem {
  id: string;
  category: string;
  name: string;
  lastChecked: string;
  lastReplaced: string;
  memo: string;
  cycle: number;
}

type SortKey = keyof RoutineItem;

export default function RoutineTab() {
  // Firestore 단일 문서에 items 배열 저장
  const ref = doc(db, "routineItems", "config");
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<RoutineItem>>({
    id: "",
    category: "",
    name: "",
    lastChecked: "",
    lastReplaced: "",
    memo: "",
    cycle: 0,
  });
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data()?.items as RoutineItem[] | undefined;
      if (data) setItems(data);
    });
    return () => unsubscribe();
  }, []);

 
  const saveItems = async (updated: RoutineItem[]) => {
    await setDoc(ref, { items: updated }, { merge: true });
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("정말 삭제하시겠습니까?");
    if (!confirm) return;

    const updated = items.filter((it) => it.id !== id);
    await saveItems(updated);
  };

  const handleInlineChange = (id: string, field: keyof RoutineItem, value: string) => {
    const updated = items.map((item) =>
      item.id === id
        ? {
          ...item,
          [field]: field === "cycle" ? Number(value) : value,
        }
        : item
    );
    setItems(updated);
    saveItems(updated);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleAdd = async () => {
    if (!newItem.name?.trim()) return;

    const id = crypto.randomUUID();
    const newEntry: RoutineItem = {
      id,
      category: newItem.category || "",
      name: newItem.name || "",
      memo: newItem.memo || "",
      lastChecked: newItem.lastChecked || "",
      lastReplaced: newItem.lastReplaced || "",
      cycle: newItem.cycle || 0,
    };
    const updated = [newEntry, ...items];
    setItems(updated);
    await saveItems(updated);

    setNewItem({
      id: "",
      category: "",
      name: "",
      memo: "",
      lastChecked: "",
      lastReplaced: "",
      cycle: 0,
    });
  };

  const calculateRemainingDays = (lastChecked: string, cycle: number): number => {
    if (!lastChecked || !cycle) return 999;
    const last = new Date(lastChecked);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 날짜만 비교
    const diffTime = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return cycle - diffDays;
  };

  const getRowClass = (item: RoutineItem) => {
    const remaining = calculateRemainingDays(item.lastChecked, item.cycle);

    if (remaining <= 0) return "bg-red-200 dark:bg-red-900";
    if (remaining <= 3) return "bg-orange-200 dark:bg-orange-900";
    if (remaining <= 7) return "bg-yellow-100 dark:bg-yellow-900";
    return "bg-white dark:bg-zinc-800";
  };
  
  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey]?.toString() || "";
    const valB = b[sortKey]?.toString() || "";
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  return (
    <div className="p-2 space-y-6 bg-white text-black dark:bg-zinc-900 dark:text-white show-scrollbar">
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] table-fixed border text-xs">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-800 text-center text-xs text-gray-800 dark:text-zinc-200">
              <th
                className="border border-zinc-600 px-2 py-1 w-32 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("name")}
              >
                이름
              </th>
              <th
                className="border border-zinc-600 px-2 py-1 w-64 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("memo")}
              >
                메모
              </th>
              <th
                className="border border-zinc-600 x-2 py-1 w-32 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("lastChecked")}
              >
                최종확인
              </th>
              <th
                className="border border-zinc-600 px-2 py-1 w-32 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("lastReplaced")}
              >
                최종교체
              </th>
              <th
                className="border border-zinc-600 px-2 py-1 w-16 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("cycle")}
              >
                주기
              </th>
              <th className="border border-zinc-600 px-2 py-1 w-16 whitespace-nowrap">관리</th>
            </tr>
          </thead>
          <tbody>
            {/* 입력 행: 항상 보이도록 위쪽에 배치 */}
            <tr className="text-center bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white">
              <td className="border border-zinc-600 px-2 py-4">
                <input
                  className="w-full p-1 bg-white dark:bg-zinc-700 text-black dark:text-white rounded"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </td>
              <td className="border border-zinc-600 px-2 py-4">
                <input
                  className="w-full p-1 bg-white dark:bg-zinc-700 text-black dark:text-white rounded"
                  value={newItem.memo}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, memo: e.target.value }))
                  }
                />
              </td>
              <td className="border border-zinc-600 px-2 py-4">
                <input
                  type="date"
                  className="w-full p-1 bg-white dark:bg-zinc-700 text-black dark:text-white rounded"
                  value={newItem.lastChecked}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      lastChecked: e.target.value,
                    }))
                  }
                />
              </td>
              <td className="border border-zinc-600 px-2 py-4">
                <input
                  type="date"
                  className="w-full p-1 bg-white dark:bg-zinc-700 text-black dark:text-white rounded"
                  value={newItem.lastReplaced}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      lastReplaced: e.target.value,
                    }))
                  }
                />
              </td>
              <td className="border border-zinc-600 px-2 py-4">
                <input
                  type="number"
                  className="w-full p-1 bg-white dark:bg-zinc-700 text-black dark:text-white rounded"
                  value={newItem.cycle}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      cycle: Number(e.target.value),
                    }))
                  }
                />
              </td>
              <td className="border border-zinc-600 px-2 py-1">
                <button
                  onClick={handleAdd}
                  className="text-blue-500 hover:underline"
                >
                  추가
                </button>
              </td>
            </tr>

            {/* 안내 메시지 (항목이 없을 때) */}
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center bg-zinc-100 dark:bg-zinc-700 text-gray-600 dark:text-white py-4">
                  아직 추가된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => (
                <tr key={item.id} className={`text-center ${getRowClass(item)}`}>
                  <td className="border border-zinc-600 px-2 py-1">
                    <input
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.name}
                      onChange={(e) =>
                        handleInlineChange(item.id, "name", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1">
                    <input
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.memo}
                      onChange={(e) =>
                        handleInlineChange(item.id, "memo", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1">
                    <input
                      type="date"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.lastChecked}
                      onChange={(e) =>
                        handleInlineChange(item.id, "lastChecked", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1">
                    <input
                      type="date"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.lastReplaced}
                      onChange={(e) =>
                        handleInlineChange(item.id, "lastReplaced", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1">
                    <input
                      type="number"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.cycle}
                      onChange={(e) =>
                        handleInlineChange(item.id, "cycle", e.target.value)
                      }
                    />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
