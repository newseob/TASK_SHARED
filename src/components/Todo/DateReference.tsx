// DateReference.tsx
import { useState, useEffect } from 'react';
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface RoutineItem {
  id: string;
  category: string;
  name: string;
  lastChecked: string;
  lastReplaced: string;
  memo: string;
  cycle: number;
}

export default function DateReference() {
  const [showList, setShowList] = useState(() => {
    // localStorage에서 상태 복원
    const saved = localStorage.getItem('dateReference_showList');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('dateReference_showList', JSON.stringify(showList));
  }, [showList]);
  // 오늘 루틴 데이터 가져오기
  const { items } = useFirestoreHistory<RoutineItem>(
    "routineItems",
    "config",
    [],
    "items"
  );

  // 주기가 0인 항목만 필터링
  const zeroCycleItems = items.filter(item => Number(item.cycle) === 0);

  // 오늘 06:00 기준 계산
  const getToday6AM = () => {
    const now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(6, 0, 0, 0);
    return now;
  };

  const parseLocalDateAtSix = (s: string) => {
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d, 6, 0, 0, 0);
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const calculateDays = (lastChecked: string, cycle: number): number => {
    if (!lastChecked) return -9999;
    const last = parseLocalDateAtSix(lastChecked);
    if (!last) return -9999;
    const now = getToday6AM();
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays - cycle;
  };

  // 주기 0인 항목들에 remaining 계산 추가 및 이름 오름차순 정렬
  const preparedZeroCycleItems = zeroCycleItems
    .map(item => ({
      ...item,
      remaining: calculateDays(item.lastChecked, Number(item.cycle)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ───────────────────────────────
  // 인라인 날짜 수정
  // ───────────────────────────────
  const [tempDates, setTempDates] = useState<{
    [id: string]: { lastChecked?: string; lastReplaced?: string };
  }>({});

  const handleInlineDateChange = async (
    id: string,
    field: "lastChecked" | "lastReplaced",
    value: string
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    // updateWithHistory가 없으므로 직접 업데이트 로직 필요
    if ((window as any).externalRoutineHistory?.push) {
      (window as any).externalRoutineHistory.push({
        boxes: updated,
        lastCheckedDate: "",
      });
    }
  };

  // ───────────────────────────────
  // 공통 아이템 렌더러
  // ───────────────────────────────
  const renderZeroCycleItem = (item: RoutineItem & { remaining: number }) => {
    const liClass =
      item.remaining >= 0
        ? "bg-zinc-600 text-white border-zinc-700"
        : "bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";

    const memoClass =
      item.remaining >= 0
        ? "text-zinc-400"
        : "text-gray-400 dark:text-zinc-700";

    return (
      <li
        key={item.id}
        className={`list-none border rounded px-2 py-1 space-y-1 text-sm ${liClass}`}
              >
        {/* 상단: 이름 + D±표시 + lastChecked 인라인 달력 */}
        <div className="flex justify-between items-center font-medium">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <span>{item.name}</span>
          </div>
          <span className="flex items-center gap-1 shrink-0 text-right ml-2 whitespace-nowrap">
            <span className="font-light">
              {item.remaining > 0
                ? `D+${item.remaining}`
                : item.remaining < 0
                  ? `D-${Math.abs(item.remaining)}`
                  : "오늘"}
            </span>
            <div className="relative w-5 h-5">
              <input
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={tempDates[item.id]?.lastChecked ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempDates((prev) => ({
                    ...prev,
                    [item.id]: {
                      ...prev[item.id],
                      lastChecked: value,
                    },
                  }));
                }}
                onBlur={() => {
                  const temp = tempDates[item.id]?.lastChecked;
                  if (temp && temp !== item.lastChecked) {
                    handleInlineDateChange(item.id, "lastChecked", temp);
                  }
                  setTempDates((prev) => {
                    const { [item.id]: removed, ...rest } = prev;
                    return rest;
                  });
                }}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-zinc-400 pointer-events-none"
                fill="none"
                viewBox="0 -6 36 36"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </span>
        </div>

        {/* 하단: 메모 · 마지막 체크(텍스트) / 주기 · 마지막 교체(클릭) */}
        <div className="text-[11px] font-light">
          {/* 메모: 1.3fr, 마지막 체크: 0.7fr 로 살짝 메모를 넓힘 */}
          <div
            className="grid gap-x-3 gap-y-1"
            style={{ gridTemplateColumns: "1.3fr 0.7fr" }}
          >
            {/* 1행 왼쪽: 메모 (배치 유지, 폭만 조금 더 확보) */}
            <span className={`whitespace-pre-wrap break-words min-w-0 ${memoClass}`}>
              {item.memo}
            </span>

            {/* 1행 오른쪽: 마지막 체크 (주기=1이면 숨김) */}
            <span className="tabular-nums justify-self-end text-zinc-400 dark:text-zinc-400">
              {" "}
              <span className="text-zinc-400 dark:text-zinc-400">
                {item.lastChecked || "—"}
              </span>
            </span>

            {/* 2행 왼쪽: 주기 (주기=1이면 숨김) */}
            {Number(item.cycle) !== 1 && Number(item.cycle) !== 0 ? (
              <span className="text-zinc-400 dark:text-zinc-400">
                주기: <b className="font-medium">{Number(item.cycle) || 0}일</b>
              </span>
            ) : (
              <span />
            )}

            {/* 2행 오른쪽: 마지막 교체 (텍스트 클릭 → 날짜 선택) */}
            {item.lastReplaced ? (
              <span className="justify-self-end flex items-center gap-1 text-xs whitespace-nowrap text-zinc-400">
                <span
                  className="relative inline-flex items-center leading-none text-[11px] cursor-pointer"
                  aria-label="마지막 교체 날짜 선택"
                  title="마지막 교체 날짜 선택"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector(
                      'input[type="date"]'
                    ) as HTMLInputElement | null;
                    if (input && (input as any).showPicker) (input as any).showPicker();
                  }}
                >
                  <input
                    type="date"
                    className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
                    value={tempDates[item.id]?.lastReplaced ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTempDates((prev) => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          lastReplaced: value,
                        },
                      }));
                    }}
                    onBlur={() => {
                      const temp = tempDates[item.id]?.lastReplaced;
                      if (temp && temp !== item.lastReplaced) {
                        handleInlineDateChange(item.id, "lastReplaced", temp);
                      }
                      setTempDates((prev) => {
                        const { [item.id]: removed, ...rest } = prev;
                        return rest;
                      });
                    }}
                  />
                  {item.lastReplaced || "—"}
                </span>
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="rounded shadow-none bg-transparent w-full transition-opacity">
      {/* 헤더 */}
      <div className="flex items-center justify-between mt-[3px]">
        <button
          className="mx-1 text-zinc-400 hover:text-white cursor-pointer text-xs transition"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "접기" : "펼치기"}
          title={showList ? "접기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>
        <h2 className="flex-1 min-w-0 text-blue-600 dark:text-blue-300 bg-transparent outline-none truncate text-xs">
          날짜 참고
        </h2>
      </div>

      {showList && (
        // 날짜 참고 박스
        <div className="space-y-[40px] mt-1 mb-[40px] opacity-50">
          <section className="bg-transparent p-0 shadow-none">
            <div>
              {/* 주기 0인 항목들 */}
              {preparedZeroCycleItems.length > 0 && (
                <div className="pt-1">
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-1 gap-2">
                    {preparedZeroCycleItems.map(item => renderZeroCycleItem(item))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
