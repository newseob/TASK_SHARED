import { useState, useEffect, useRef } from "react";
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
  const [sortKey, setSortKey] = useState<SortKey | null>("cycle");
  const [sortAsc, setSortAsc] = useState(true);
  
  // 파일 입력을 위한 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // JSON 내보내기 함수
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `routine_items_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // JSON 가져오기 함수
  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  // 파일 선택 처리 함수
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedItems = JSON.parse(e.target?.result as string) as RoutineItem[];
        
        // 유효성 검사
        if (!Array.isArray(importedItems)) {
          alert('유효한 JSON 파일이 아닙니다.');
          return;
        }

        // 필수 필드 확인
        const isValid = importedItems.every(item => 
          item.id && 
          item.name && 
          typeof item.cycle === 'number'
        );

        if (!isValid) {
          alert('JSON 파일의 형식이 올바르지 않습니다.');
          return;
        }

        // 확인 후 저장
        const confirm = window.confirm(`${importedItems.length}개의 항목을 가져오시겠습니까? 기존 데이터가 대체됩니다.`);
        if (confirm) {
          saveItems(importedItems);
        }
      } catch (error) {
        alert('JSON 파일을 파싱하는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
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

  const getRowClass = () => {
    return "bg-white dark:bg-zinc-800";
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0;
    
    // 주기 필드는 숫자로 정렬
    if (sortKey === "cycle") {
      const valA = Number(a[sortKey]) || 0;
      const valB = Number(b[sortKey]) || 0;
      return sortAsc ? valA - valB : valB - valA;
    }
    
    // 나머지 필드는 문자열로 정렬
    const valA = a[sortKey]?.toString() || "";
    const valB = b[sortKey]?.toString() || "";
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  return (
    <div className="p-2 space-y-6 max-w-[1200px] mx-auto bg-white text-black dark:bg-zinc-900 dark:text-white show-scrollbar">      {/* 테이블 */}
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
                className="border border-zinc-600 px-2 py-1 w-16 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("lastChecked")}
              >
                최종확인
              </th>
              <th
                className="border border-zinc-600 px-2 py-1 w-16 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("lastReplaced")}
              >
                최종교체
              </th>
              <th
                className="border border-zinc-600 px-2 py-1 w-8 cursor-pointer hover:bg-zinc-700"
                onClick={() => handleSort("cycle")}
              >
                주기
              </th>
              <th className="border border-zinc-600 px-2 py-1 w-8 whitespace-nowrap">관리</th>
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
                  type="text"
                  inputMode="numeric"
                  className="w-full p-1 bg-white dark:bg-zinc-700 text-black dark:text-white rounded"
                  value={newItem.cycle}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      cycle: Number(e.target.value.replace(/[^0-9]/g, "")),
                    }))
                  }
                />
              </td>
              <td className="border border-zinc-600 px-2 py-1">
                <button
                  onClick={handleAdd}
                  className="text-blue-500 hover:underline"
                >
                  +
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
                  <td className="border border-zinc-600 px-2 py-1 text-sm">                    <input
                    className="w-full border-none bg-transparent p-1 focus:outline-none"
                    value={item.name}
                    onChange={(e) =>
                      handleInlineChange(item.id, "name", e.target.value)
                    }
                  />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1 text-sm">                    <input
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
                      type="text"
                      inputMode="numeric"
                      className="w-full border-none bg-transparent p-1 focus:outline-none"
                      value={item.cycle}
                      onChange={(e) =>
                        handleInlineChange(item.id, "cycle", e.target.value.replace(/[^0-9]/g, ""))
                      }
                    />
                  </td>
                  <td className="border border-zinc-600 px-2 py-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:underline"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* JSON 저장 및 불러오기 버튼 */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleExportJSON}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          JSON 저장
        </button>
        <button
          onClick={handleImportJSON}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          JSON 불러오기
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};
