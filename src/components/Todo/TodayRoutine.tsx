import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface RoutineItem {
  id: string;
  category: string;
  name: string;
  lastChecked: string; // YYYY-MM-DD
  lastReplaced: string;
  memo: string;
  cycle: number;
}

export default function TodayRoutine() {
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [showList, setShowList] = useState(true);

  // 날짜 계산 함수
  const calculateDays = (lastChecked: string, cycle: number): number => {
    if (!lastChecked) return 0;
    const last = new Date(lastChecked);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return cycle - diffDays;
  };

  const loadData = async () => {
    const docRef = doc(db, "routineItems", "config");
    const snap = await getDoc(docRef);
    const data = snap.data()?.items as RoutineItem[] | undefined;
    if (data) setItems(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="border p-2 rounded shadow bg-white w-full transition-opacity">
      {/* 상단 제목 + 토글 */}
      <div className="flex items-center justify-between">
      <button
          className="mx-1 text-gray-300 cursor-pointer text-sm transition"
          onClick={() => setShowList(!showList)}
        >
          {showList ? "▷" : "▽"}
        </button>
        <h2 className="flex-1 min-w-0 text-blue-400 bg-transparent outline-none truncate text-xs">집안일루틴</h2>
      </div>

      {/* 항목 리스트 */}
      {showList && (
        <ul className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const remaining = calculateDays(item.lastChecked, item.cycle);
            return (
              <li
                key={item.id}
                className="p-1 mb-1 rounded-md border border-gray-300 flex items-center justify-between transition-colors duration-300"
              >
                <span className="text-sm font-normal bg-transparent border-none outline-none w-full truncate">{item.name} </span>
                <span className="ml-2 px-2 text-gray rounded hover:bg-gray-200 transition text-sm shrink-0">{remaining}일</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
