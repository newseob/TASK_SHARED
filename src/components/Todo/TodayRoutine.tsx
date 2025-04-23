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
    return diffDays - cycle; // 바뀐 계산: 초과일수
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

  const handleInlineDateChange = async (
    id: string,
    field: "lastChecked" | "lastReplaced",
    value: string
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updated);

    const docRef = doc(db, "routineItems", "config");
    await setDoc(docRef, { items: updated });
  };

  const sortedItems = items
    .map((item) => ({
      ...item,
      remaining: calculateDays(item.lastChecked, item.cycle),
    }))
    .filter((item) => item.remaining >= -3) // 초과된 항목만
    .sort((a, b) => b.remaining - a.remaining); // 초과일 많은 순

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
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
          {sortedItems
            .filter((item) => item.remaining >= -3) // ✅ 필터 추가
            .map((item) => {
              // ✅ 조건별 스타일 클래스 분기
              const liClass =
                item.remaining >= 0
                  ? "bg-red-50 text-red-800 border-red-400"
                  : "text-gray-400 border-gray-300";

              const circleBorderClass =
                item.remaining >= 0 ? "border-red-400" : "border-gray-300";

              return (
                <li
                  key={item.id}
                  className={`border rounded px-2 py-1 space-y-1 text-sm ${liClass}`}
                >
                  <div className="flex justify-between items-center font-medium">

                    <div className="flex items-center space-x-2">
                      <button
                        className={`w-5 h-5 rounded-full bg-white border ${circleBorderClass}`}
                      ></button>
                      <span>{item.name}</span>
                    </div>
                    <span
                      className="flex items-center gap-1 shrink-0 text-right ml-2 whitespace-nowrapr"
                    >
                      <span
                        className="cursor-pointer hover:underline"
                      >
                        {item.remaining > 0
                          ? `${item.remaining}일 지남`
                          : item.remaining < 0
                            ? `${Math.abs(item.remaining)}일 남음`
                            : "오늘"}
                      </span>
                      <div className="relative w-5 h-5">
                        <input
                          type="date"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleInlineDateChange(item.id, "lastChecked", e.target.value)}
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-gray-500 pointer-events-none"
                          fill="none"
                          viewBox="0 -6 36 36"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </span>

                  </div>
                  <div className="flex flex-col text-[11px] pl-7">
                    <span className="whitespace-pre-wrap break-words">
                      {item.memo}
                    </span>
                    {item.lastReplaced && (
                      <span className="flex items-center gap-1 self-end mt-1 whitespace-nowrap">
                        {item.lastReplaced}
                        <div className="relative w-5 h-5">
                          <input
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleInlineDateChange(item.id, "lastReplaced", e.target.value)}
                          />
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5 text-gray-500 pointer-events-none"
                            fill="none"
                            viewBox="0 -6 36 36"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
