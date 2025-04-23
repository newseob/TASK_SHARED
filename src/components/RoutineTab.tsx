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
  const [editId, setEditId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // 컬럼 정의 with SortKey for type safety
  const columns: { key: SortKey; label: string }[] = [
    { key: "category", label: "구분" },
    { key: "name", label: "이름" },
    { key: "memo", label: "메모" },

    { key: "lastChecked", label: "최종확인" },
    { key: "lastReplaced", label: "최종교체" },
    { key: "cycle", label: "주기" },
  ];

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

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey]?.toString() || "";
    const valB = b[sortKey]?.toString() || "";
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  return (
    <div className="p-2 space-y-6 show-scrollbar">
      {/* 테이블 */}
      <div className="overflow-x-auto">
        {sortedItems.length === 0 ? (
          <p className="text-gray-500">아직 추가된 항목이 없습니다.</p>
        ) : (
          <table className="w-full min-w-[700px] table-fixed border text-xs">
              <thead>
                <tr className="bg-gray-100 text-center text-xs">
                  <th
                    className="border px-2 py-1 w-24 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("category")}
                  >
                    구분
                  </th>
                  <th
                    className="border px-2 py-1 w-64 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("name")}
                  >
                    이름
                  </th>
                  <th
                    className="border px-2 py-1 w-32 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("memo")}
                  >
                    메모
                  </th>
                  <th
                    className="border px-2 py-1 w-32 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("lastChecked")}
                  >
                    최종확인
                  </th>
                  <th
                    className="border px-2 py-1 w-32 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("lastReplaced")}
                  >
                    최종교체
                  </th>
                  <th
                    className="border px-2 py-1 w-16 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("cycle")}
                  >
                    주기
                  </th>
                  <th className="border px-2 py-1 w-16 whitespace-nowrap">관리</th>
                </tr>
              </thead>
            <tbody>
                {/* 맨 위에 입력 행 */}
                  <tr className="text-center bg-gray-50">
                    <td className="border px-2 py-1">
                      <input
                        className="w-full p-1"
                        value={newItem.category}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        className="w-full p-1"
                        value={newItem.name}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        className="w-full p-1"
                        value={newItem.memo}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, memo: e.target.value }))}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="date"
                        className="w-full p-1"
                        value={newItem.lastChecked}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, lastChecked: e.target.value }))}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="date"
                        className="w-full p-1"
                        value={newItem.lastReplaced}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, lastReplaced: e.target.value }))}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        className="w-full p-1"
                        value={newItem.cycle}
                        onChange={(e) =>
                          setNewItem((prev) => ({ ...prev, cycle: Number(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <button
                        onClick={handleAdd}
                        className="text-blue-500 hover:underline"
                      >
                        추가
                      </button>
                    </td>
                  </tr>
              {sortedItems.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border px-2 py-1">
                    <input
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.category}
                      onChange={(e) => handleInlineChange(item.id, "category", e.target.value)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.name}
                      onChange={(e) => handleInlineChange(item.id, "name", e.target.value)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.memo}
                      onChange={(e) => handleInlineChange(item.id, "memo", e.target.value)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="date"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.lastChecked}
                      onChange={(e) => handleInlineChange(item.id, "lastChecked", e.target.value)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="date"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.lastReplaced}
                      onChange={(e) => handleInlineChange(item.id, "lastReplaced", e.target.value)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="number"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.cycle}
                      onChange={(e) => handleInlineChange(item.id, "cycle", e.target.value)}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
