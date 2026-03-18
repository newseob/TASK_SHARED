// TodayRoutine.tsx

import { useState, useMemo, useEffect } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

interface RoutineItem {
  id: string;
  category: string;
  name: string;
  lastChecked: string;
  lastReplaced: string;
  originalLastChecked?: string;
  prevLastChecked?: string;
  memo: string;
  cycle: number;
}

export default function TodayRoutine() {
  const [showList, setShowList] = useState(() => {
    // localStorage에서 상태 복원
    const saved = localStorage.getItem('todayRoutine_showList');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const getTodayStringAtSix = () => {
    const now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    now.setHours(6, 0, 0, 0);
    return now.toISOString();
  };

  const isChecked = (item: RoutineItem) => {
    if (!item.lastChecked) return false;

    const today = getTodayStringAtSix();

    return parseLocalDateAtSix(item.lastChecked)?.getTime() ===
      parseLocalDateAtSix(today)?.getTime();
  };

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('todayRoutine_showList', JSON.stringify(showList));
  }, [showList]);

  // 🔹 빈 배열을 useMemo로 감싸서 "항상 같은 참조"로 유지
  const defaultData = useMemo<RoutineItem[]>(() => [], []);

  const { items, updateWithHistory } = useFirestoreHistory<RoutineItem>(
    "routineItems",
    "config",
    defaultData,
    "items"
  );

  if (!Array.isArray(items)) return null;

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

  // 전처리: remaining 계산 → 모든 항목 표시 (조건 안되는 항목은 투명도 80%)
  const prepared = items
    .map((item) => ({
      ...item,
      remaining: calculateDays(item.lastChecked, Number(item.cycle)),
    }));

  // 드래그 순서를 유지하기 위한 상태
  const [orderedDailyItems, setOrderedDailyItems] = useState<RoutineItem[]>([]);

  // Firestore
  useEffect(() => {
    const dailyItems = prepared.filter((i) => Number(i.cycle) === 1);

    setOrderedDailyItems(dailyItems);
  }, [items]);

  // 섹션 분리 (orderedDailyItems 사용)
  const dailyItems = orderedDailyItems;

  // 드래그 앤 드롭을 위한 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 종료 핸들러
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = dailyItems.findIndex((item) => item.id === active.id);
      const newIndex = dailyItems.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newDailyItems = [...dailyItems];
        const [moved] = newDailyItems.splice(oldIndex, 1);
        newDailyItems.splice(newIndex, 0, moved);

        setOrderedDailyItems(newDailyItems);

        // ✅ 핵심: 기존 items 순서를 유지하면서 교체
        let dailyIndex = 0;

        const updatedItems = items.map((item) => {
          if (Number(item.cycle) === 1) {
            return newDailyItems[dailyIndex++];
          }
          return item;
        });

        updateWithHistory(updatedItems);
      }
    }
  };

  // 아이템 컴포넌트
  const SortableItem = ({ item }: { item: RoutineItem & { remaining: number } }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: item.id });

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
      opacity: transform ? 0.8 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {renderItem(item)}
      </div>
    );
  };

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

    const opacityClass = item.remaining < 0 ? "opacity-80" : "";

    return (
      <li
        key={item.id}
        className={`border rounded px-2 py-1 space-y-1 text-sm ${liClass} ${opacityClass}`}
      >
        {/* 상단: 이름 + D±표시 + lastChecked 인라인 달력 */}
        <div className="flex justify-between items-center font-medium">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <span>{item.name}</span>
          </div>
          <span className="flex items-center gap-1 shrink-0 text-right ml-2 whitespace-nowrap">
            <span className="font-light">
              {item.remaining > 0 ? (
                <span className="text-red-500">D+{item.remaining}</span>
              ) : (
                ""
              )}
            </span>
            <div className="relative w-5 h-5">
              <button
                onClick={() => {
                  const checked = isChecked(item);

                  if (!checked) {
                    const today = getToday6AM();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, "0");
                    const d = String(today.getDate()).padStart(2, "0");
                    const dateString = `${y}-${m}-${d}`;

                    const updated = items.map((it) =>
                      it.id === item.id
                        ? {
                          ...it,
                          originalLastChecked: it.lastChecked, // 🔥 기존값 저장
                          lastChecked: dateString,             // 🔥 오늘로 변경
                        }
                        : it
                    );

                    updateWithHistory(updated);

                  } else {
                    const updated = items.map((it) =>
                      it.id === item.id
                        ? {
                          ...it,
                          lastChecked: it.originalLastChecked ?? "",
                          originalLastChecked: undefined,
                        }
                        : it
                    );

                    updateWithHistory(updated);
                  }
                }}
                disabled={false}
                className="w-5 h-5 flex items-center justify-center"
              >
                {isChecked(item) ? "☑" : "☐"}
              </button>
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
                <span className="text-[11px]"></span>
                <span
                  className="relative inline-flex items-center leading-none text-[11px] cursor-pointer"
                  aria-label="마지막 교체 날짜 선택"
                  title="마지막 교체 날짜 선택"
                >
                  {item.lastReplaced}
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
          매일 루틴
        </h2>
      </div>

      {showList && (
        // 매일 루틴 박스
        <div className="space-y-[40px] mt-2 mb-[40px]">
          <section className="bg-transparent p-0 shadow-none">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={dailyItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="grid grid-cols-1 gap-2 min-w-0">
                  {dailyItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={{ ...item, remaining: calculateDays(item.lastChecked, Number(item.cycle)) }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </section>
        </div>
      )}
    </div>
  );
};