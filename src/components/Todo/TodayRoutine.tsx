// TodayRoutine.tsx

import { useState, useMemo } from "react";
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

export default function TodayRoutine() {
  const [showList, setShowList] = useState(true);

  // 🔹 빈 배열을 useMemo로 감싸서 "항상 같은 참조"로 유지
  const defaultData = useMemo<RoutineItem[]>(() => [], []);

  const { items, updateWithHistory } = useFirestoreHistory<RoutineItem>(
    "routineItems",
    "config",
    defaultData,
    "items"
  );

  if (!Array.isArray(items)) return null;

  const [tempDates, setTempDates] = useState<{
    [id: string]: { lastChecked?: string; lastReplaced?: string };
  }>({});

  // ───────────────────────────────
  // 시간/주기 계산 유틸
  // ───────────────────────────────

  // 오늘 06:00 (로컬)
  const getToday6AM = () => {
    const now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(6, 0, 0, 0);
    return now;
  };

  // "YYYY-MM-DD" → 로컬 기준 해당 날짜의 06:00으로 파싱
  // 타임스탬프가 포함된 문자열은 기본 Date 파서를 사용
  const parseLocalDateAtSix = (s: string) => {
    if (!s) return null;
    // 순수 날짜 형태면 로컬 06:00으로 생성
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d, 6, 0, 0, 0); // ← 로컬 06:00
    }
    // 그 외(ISO 문자열 등)는 기본 파서 (로컬/UTC 혼합 허용)
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // 남은일 계산: (오늘06:00 - 마지막체크(해당날짜06:00 기준)) 일수 - 주기
  // 예) 어제 체크 & 주기 1 → diffDays=1 → remaining=0 → "오늘"
  const calculateDays = (lastChecked: string, cycle: number): number => {
    if (!lastChecked) return -9999; // 없으면 리스트에서 여유로 보이도록 멀리 보내기(원하면 0으로 변경 가능)
    const last = parseLocalDateAtSix(lastChecked);
    if (!last) return -9999;
    const now = getToday6AM();
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays - cycle;
  };

  // ───────────────────────────────
  // 인라인 날짜 수정
  // ───────────────────────────────
  const handleInlineDateChange = async (
    id: string,
    field: "lastChecked" | "lastReplaced",
    value: string
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    updateWithHistory(updated);

    if ((window as any).externalRoutineHistory?.push) {
      (window as any).externalRoutineHistory.push({
        boxes: updated,
        lastCheckedDate: "",
      });
    }
  };

  // ───────────────────────────────
  // 전처리: remaining 계산 → -3일 이상만 남기기
  // ───────────────────────────────
  const prepared = items
    .map((item) => ({
      ...item,
      remaining: calculateDays(item.lastChecked, Number(item.cycle)),
    }))
    .filter((item) => item.remaining >= -3);

  // 섹션 분리 및 정렬(remaining 내림차순)
  const dailyItems = prepared
    .filter((i) => Number(i.cycle) === 1)
    .sort((a, b) => b.remaining - a.remaining);

  const nonDailyItems = prepared
    .filter((i) => Number(i.cycle) !== 1)
    .sort((a, b) => b.remaining - a.remaining);

  // ───────────────────────────────
  // 공통 아이템 렌더러
  // ───────────────────────────────
  const renderItem = (item: RoutineItem & { remaining: number }) => {
    const liClass =
      item.remaining >= 0
        ? "bg-zinc-600 text-white border-zinc-700"
        : "bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";

    const memoClass =
      item.remaining >= 0
        ? "text-zinc-400"
        : "text-gray-400 dark:text-zinc-700";

    const isDaily = Number(item.cycle) === 1;

    return (
      <li
        key={item.id}
        className={`border rounded px-2 py-1 space-y-1 text-sm ${liClass}`}
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
            {Number(item.cycle) !== 1 ? (
              <span className="tabular-nums justify-self-end text-zinc-400 dark:text-zinc-400">
                {" "}
                <span className="text-zinc-400 dark:text-zinc-400">
                  {item.lastChecked || "—"}
                </span>
              </span>
            ) : (
              <span />
            )}

            {/* 2행 왼쪽: 주기 (주기=1이면 숨김) */}
            {Number(item.cycle) !== 1 ? (
              <span className="text-zinc-400 dark:text-zinc-400">
                주기: <b className="font-medium">{Number(item.cycle) || 0}일</b>
              </span>
            ) : (
              <span />
            )}

            {/* 2행 오른쪽: 마지막 교체 (텍스트 클릭 → 날짜 선택) */}
            {item.lastReplaced ? (
              <span className="justify-self-end flex items-center gap-1 text-xs whitespace-nowrap text-zinc-400">
                <span className="text-[11px]"></span>
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
                        [item.id]: { ...prev[item.id], lastReplaced: value },
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
                  <span className="text-zinc-400 dark:text-zinc-400 underline decoration-dotted decoration-1 select-none">
                    {item.lastReplaced}
                  </span>
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
      <div className="flex items-center justify-between">
        <button
          className="mx-1 text-zinc-400 hover:text-white cursor-pointer text-xs transition"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "접기" : "펼치기"}
          title={showList ? "접기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>
        <h2 className="flex-1 min-w-0 text-blue-600 dark:text-blue-300 bg-transparent outline-none truncate text-xs">
          집안일루틴
        </h2>
      </div>
  
      {showList && (
        // 두 박스 사이 간격만 유지
        <div className="space-y-[80px] mt-2 mb-[80px]">
          {/* ── 매일 루틴 박스 ─────────────────────── */}
          <section className="bg-transparent p-0 shadow-none">
            <ul className="grid grid-cols-1 gap-2 min-w-0">
              {dailyItems.map(renderItem)}
            </ul>
          </section>
  
          {/* ── 주기 루틴 박스 ─────────────────────── */}
          <section className="bg-transparent p-0 shadow-none">
            <ul className="grid grid-cols-1 gap-2 min-w-0">
              {nonDailyItems.map(renderItem)}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}