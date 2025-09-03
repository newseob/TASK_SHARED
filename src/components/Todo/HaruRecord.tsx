// Todo/HaruRecord.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback, startTransition } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

// ========== 날짜 유틸 (KST, 06:00 경계) ==========
function nowInKST(): Date {
  const kstString = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  return new Date(kstString);
}
function getTodayKST6(): Date {
  const d = nowInKST();
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d;
}
function toISODateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toLabel(d: Date): string {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const mm = String(d.getMonth() + 1);
  const dd = String(d.getDate());
  const w = weekdays[d.getDay()];
  return `${mm}/${dd} (${w})`;
}

// ========== 타입 ==========
type Fields = {
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
  memo: string;
};
type HaruDay = { key: string } & Partial<Fields>;

function emptyDay(key: string): HaruDay {
  return { key, breakfast: "", lunch: "", dinner: "", snack: "", memo: "" };
}
function getTargetKeys(today: Date) {
  const tomorrow = addDays(today, 1);
  const keys = [toISODateKey(tomorrow), toISODateKey(today)];
  for (let i = 1; i <= 5; i++) keys.push(toISODateKey(addDays(today, -i)));
  return keys; // 내일, 오늘, 어제, -2, -3, -4, -5
}

// ========== 날짜 블록(메모화) ==========
type DayRowProps = {
  day: HaruDay;
  label: string;
  highlight: "tomorrow" | "today" | "none";
  // 저장 요청 핸들러(부모가 Firestore로 반영). key와 변경된 day를 전달
  requestSave: (key: string, next: HaruDay) => void;
};

const DayRow = React.memo(function DayRow({ day, label, highlight, requestSave }: DayRowProps) {
  // 1) 로컬 상태만 즉시 업데이트 (부드러운 타이핑)
  const [local, setLocal] = useState<HaruDay>(() => ({
    key: day.key,
    breakfast: day.breakfast ?? "",
    lunch: day.lunch ?? "",
    dinner: day.dinner ?? "",
    snack: day.snack ?? "",
    memo: day.memo ?? "",
  }));

  // 외부 days가 바뀌었을 때 로컬과 달라졌다면 동기화 (다른 기기/탭 저장 반영)
  useEffect(() => {
    const incoming = {
      key: day.key,
      breakfast: day.breakfast ?? "",
      lunch: day.lunch ?? "",
      dinner: day.dinner ?? "",
      snack: day.snack ?? "",
      memo: day.memo ?? "",
    };
    // 현재 로컬과 비교해 다르면 업데이트
    const changed =
      local.breakfast !== incoming.breakfast ||
      local.lunch !== incoming.lunch ||
      local.dinner !== incoming.dinner ||
      local.snack !== incoming.snack ||
      local.memo !== incoming.memo;
    if (changed) setLocal(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.key, day.breakfast, day.lunch, day.dinner, day.snack, day.memo]);

  // 2) 디바운스 저장 (입력이 잠시 멈추면 저장)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (draft: HaruDay) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        requestSave(draft.key, draft);
      }, 600); // 0.6s 정지 후 저장
    },
    [requestSave]
  );

  // 3) onBlur 시 즉시 저장(사용자 확정 행동)
  const flushSave = useCallback(
    (draft: HaruDay) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      requestSave(draft.key, draft);
    },
    [requestSave]
  );

  const onChange = (field: keyof Fields, v: string) => {
    setLocal((prev) => {
      const next = { ...prev, [field]: v };
      scheduleSave(next);
      return next;
    });
  };

  const isToday = highlight === "today";
  const isTomorrow = highlight === "tomorrow";

  return (
    <div
      className={[
        "rounded-md border p-3",
        "border-dashed border-zinc-300 dark:border-zinc-700",
        isToday
          ? "bg-zinc-50 dark:bg-zinc-800/40"
          : isTomorrow
          ? "bg-red-50 dark:bg-red-900/25"
          : "bg-transparent",
      ].join(" ")}
    >
      <h3
        className={[
          "mb-2 text-sm font-semibold",
          "text-zinc-700 dark:text-zinc-200",
          isToday || isTomorrow ? "opacity-100" : "opacity-90",
        ].join(" ")}
      >
        {label} {isTomorrow ? "· 내일" : isToday ? "· 오늘" : ""}
      </h3>

      <div className="space-y-2 text-sm">
        {(
          [
            ["아침", "breakfast"],
            ["점심", "lunch"],
            ["저녁", "dinner"],
            ["간식", "snack"],
          ] as const
        ).map(([labelText, field]) => (
          <div key={field} className="flex items-center gap-2">
            <label className="w-12 shrink-0 text-[12px] text-zinc-500 dark:text-zinc-400">
              {labelText}
            </label>
            <input
              type="text"
              value={(local as any)[field] ?? ""}
              onChange={(e) => onChange(field as keyof Fields, e.target.value)}
              onBlur={() => flushSave(local)}
              className="flex-1 min-w-[450px] rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1"
            />
          </div>
        ))}

        <div className="flex items-start gap-2">
          <label className="w-12 shrink-0 pt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
            메모
          </label>
          <textarea
            value={local.memo ?? ""}
            onChange={(e) => onChange("memo", e.target.value)}
            onBlur={() => flushSave(local)}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 min-h-[60px]"
          />
        </div>
      </div>
    </div>
  );
});

// ========== 메인 컴포넌트 ==========
export default function HaruRecord() {
  const { items: days, updateWithHistory } = useFirestoreHistory<HaruDay>(
    "haruRecords",
    "config",
    [],
    "days"
  );

  // 06:00 경계 넘어가면 자동 재정렬
  const [now, setNow] = useState<Date>(() => nowInKST());
  useEffect(() => {
    const t = setInterval(() => setNow(nowInKST()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const today = useMemo(() => getTodayKST6(), [now]);

  // 필요한 7일 스켈레톤 보장 (없으면 채워 넣고 저장)
  useEffect(() => {
    if (!Array.isArray(days)) return;
    const mustKeys = getTargetKeys(today);
    const byKey = new Map((days || []).map((d) => [d.key, d]));
    let changed = false;
    const merged: HaruDay[] = [...days];

    mustKeys.forEach((k) => {
      if (!byKey.has(k)) {
        merged.push(emptyDay(k));
        changed = true;
      }
    });

    if (changed) {
      // 저장은 트랜지션으로 감싸 UI 끊김 방지
      startTransition(() => {
        updateWithHistory(merged);
      });
    }
  }, [days, today, updateWithHistory]);

  // 렌더용 정렬: 내일 → 오늘 → 과거 5일
  const renderList: HaruDay[] = useMemo(() => {
    const mustKeys = getTargetKeys(today);
    const map = new Map((days || []).map((d) => [d.key, d]));
    return mustKeys.map((k) => map.get(k) ?? emptyDay(k));
  }, [days, today]);

  // 저장 요청(한 날짜만 부분 업데이트) → 배열 전체를 최소 변경으로 생성
  const requestSave = useCallback(
    (key: string, next: HaruDay) => {
      if (!Array.isArray(days)) return;
      // 기존과 동일하면 불필요 저장 방지
      const prev = (days || []).find((d) => d.key === key);
      const same =
        prev &&
        (prev.breakfast ?? "") === (next.breakfast ?? "") &&
        (prev.lunch ?? "") === (next.lunch ?? "") &&
        (prev.dinner ?? "") === (next.dinner ?? "") &&
        (prev.snack ?? "") === (next.snack ?? "") &&
        (prev.memo ?? "") === (next.memo ?? "");
      if (same) return;

      const updated = (days || []).map((d) => (d.key === key ? next : d));

      // 저장도 트랜지션으로 처리해서 입력 프레임 안 끊기게
      startTransition(() => {
        updateWithHistory(updated);
      });
    },
    [days, updateWithHistory]
  );

  return (
    <div className="bg-transparent">
      <h2 className="mt-[2px] text-xs text-blue-600 dark:text-blue-300">하루 기록</h2>

      <div className="mt-[12px] space-y-6">
        {renderList.map((d, idx) => {
          const date = new Date(d.key + "T00:00:00");
          const label = toLabel(date);
          const highlight = idx === 0 ? "tomorrow" : idx === 1 ? "today" : "none";
          return (
            <DayRow
              key={d.key}
              day={d}
              label={label}
              highlight={highlight as "tomorrow" | "today" | "none"}
              requestSave={requestSave}
            />
          );
        })}
      </div>
    </div>
  );
}
