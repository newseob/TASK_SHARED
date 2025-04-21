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
    { key: "lastChecked", label: "최종확인" },
    { key: "lastReplaced", label: "최종교체" },
    { key: "cycle", label: "주기" },
    { key: "memo", label: "메모" },
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data()?.items as RoutineItem[] | undefined;
      if (data) setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (field: keyof RoutineItem, value: string) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: field === "cycle" ? Number(value) : value,
    }));
  };

  const saveItems = async (updated: RoutineItem[]) => {
    await setDoc(ref, { items: updated }, { merge: true });
  };

  const handleAddOrUpdate = async () => {
    if (!newItem.name?.trim()) return;
    let updated: RoutineItem[];
    if (editId) {
      updated = items.map((it) =>
        it.id === editId ? { ...(newItem as RoutineItem), id: editId } : it
      );
      setEditId(null);
    } else {
      const id = crypto.randomUUID();
      updated = [...items, { ...(newItem as RoutineItem), id }];
    }
    setNewItem({
      id: "",
      category: "",
      name: "",
      lastChecked: "",
      lastReplaced: "",
      memo: "",
      cycle: 0,
    });
    await saveItems(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    await saveItems(updated);
  };

  const handleEdit = (id: string) => {
    const found = items.find((it) => it.id === id);
    if (found) {
      setNewItem(found);
      setEditId(id);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey]?.toString() || "";
    const valB = b[sortKey]?.toString() || "";
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  return (
    <div className="p-6 space-y-6">
      {/* 입력 폼 */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
          <input
            value={newItem.category}
            onChange={(e) => handleChange("category", e.target.value)}
            placeholder="구분"
            className="border p-2 rounded w-full"
          />
          <input
            value={newItem.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="이름"
            className="border p-2 rounded w-full"
          />
          <input
            type="date"
            value={newItem.lastChecked}
            onChange={(e) => handleChange("lastChecked", e.target.value)}
            placeholder="최종확인"
            className="border p-2 rounded w-full"
          />
          <input
            type="date"
            value={newItem.lastReplaced}
            onChange={(e) => handleChange("lastReplaced", e.target.value)}
            placeholder="최종교체"
            className="border p-2 rounded w-full"
          />
          <input
            type="number"
            value={newItem.cycle}
            onChange={(e) => handleChange("cycle", e.target.value)}
            placeholder="주기"
            className="border p-2 rounded w-full"
          />
          <input
            value={newItem.memo}
            onChange={(e) => handleChange("memo", e.target.value)}
            placeholder="메모"
            className="border p-2 rounded w-full"
          />
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={handleAddOrUpdate}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {editId ? "수정 완료" : "항목 추가"}
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        {sortedItems.length === 0 ? (
          <p className="text-gray-500">아직 추가된 항목이 없습니다.</p>
        ) : (
          <table className="min-w-[960px] w-full table-auto border text-sm mt-4">
            <thead>
              <tr className="bg-gray-100">
                {columns.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="border px-4 py-2 cursor-pointer hover:bg-gray-200"
                  >
                    {label} {sortKey === key ? (sortAsc ? "" : "") : ""}
                  </th>
                ))}
                <th className="border px-4 py-2">수정</th>
                <th className="border px-4 py-2">삭제</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border px-4 py-2">{item.category}</td>
                  <td className="border px-4 py-2">{item.name}</td>
                  <td className="border px-4 py-2">{item.lastChecked}</td>
                  <td className="border px-4 py-2">{item.lastReplaced}</td>
                  <td className="border px-4 py-2">{item.cycle}</td>
                  <td className="border px-4 py-2">{item.memo}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => handleEdit(item.id)}
                      className="text-blue-500"
                    >
                      수정
                    </button>
                  </td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500"
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
