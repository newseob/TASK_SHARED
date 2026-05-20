import { useEffect, useRef, useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface ScheduleItem {
  id: string;
  start: string;
  end: string;
  title: string;
  category: string;
  accent: string;
  fill: string;
  kind?: ScheduleKind;
}

interface TimetableCheckedItem {
  id: string;
  person: TimetablePerson;
  itemId: string;
  dayKey: string;
}

type ScheduleFormMode = "manual-add" | "edit";
type ScheduleKind = "routine" | "event";
type TimetablePerson = "kyungin" | "yuseop";

interface ScheduleFormState {
  person: TimetablePerson;
  mode: ScheduleFormMode;
  title: string;
  start: string;
  end: string;
  fill: string;
  kind: ScheduleKind;
  scheduleId?: string;
  canDelete?: boolean;
}

const DEFAULT_SCHEDULES: ScheduleItem[] = [];
const DEFAULT_ITEM_COLOR = "#27272a";
const ACTIVE_ITEM_COLOR = "#7a3f16";
const TIME_DIVIDERS = [
  { time: "12:00", label: "" },
  { time: "19:00", label: "" },
];

const PERSON_LABELS: Record<TimetablePerson, string> = {
  kyungin: "경인",
  yuseop: "유섭",
};

function minutesFromDay(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function getScheduleKind(item: ScheduleItem): ScheduleKind {
  return item.kind ?? "routine";
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getTimetableDayKey() {
  const date = new Date();
  if (date.getHours() < 6) {
    date.setDate(date.getDate() - 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Timetable() {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const {
    items: kyunginManualSchedules,
    updateWithHistory: updateKyunginManualSchedules,
  } = useFirestoreHistory<ScheduleItem>(
    "timetableData",
    "main",
    DEFAULT_SCHEDULES,
    "kyunginManualSchedules"
  );
  const {
    items: yuseopManualSchedules,
    updateWithHistory: updateYuseopManualSchedules,
  } = useFirestoreHistory<ScheduleItem>(
    "timetableData",
    "main",
    DEFAULT_SCHEDULES,
    "yuseopManualSchedules"
  );
  const {
    items: checkedRecords,
    updateWithHistory: updateCheckedRecords,
  } = useFirestoreHistory<TimetableCheckedItem>(
    "timetableData",
    "main",
    [],
    "checkedItems"
  );
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutes);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  useEffect(() => {
    const resetCheckedItemsIfDayChanged = () => {
      const currentDayKey = getTimetableDayKey();
      const hasExpiredRecords = checkedRecords.some(
        (record) => record.dayKey !== currentDayKey
      );

      if (hasExpiredRecords) {
        updateCheckedRecords([]);
      }
    };

    resetCheckedItemsIfDayChanged();
    const intervalId = window.setInterval(resetCheckedItemsIfDayChanged, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [checkedRecords]);

  useEffect(() => clearLongPressTimer, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentMinutes(getCurrentMinutes());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const timetableColumns = [
    {
      id: "kyungin" as const,
      label: PERSON_LABELS.kyungin,
      schedules: kyunginManualSchedules,
      updateSchedules: updateKyunginManualSchedules,
    },
    {
      id: "yuseop" as const,
      label: PERSON_LABELS.yuseop,
      schedules: yuseopManualSchedules,
      updateSchedules: updateYuseopManualSchedules,
    },
  ];

  const getColumnData = (person: TimetablePerson) =>
    person === "kyungin" ? timetableColumns[0] : timetableColumns[1];

  const currentDayKey = getTimetableDayKey();
  const checkedItemIds = new Set(
    checkedRecords
      .filter((record) => record.dayKey === currentDayKey)
      .map((record) => `${record.person}:${record.itemId}`)
  );

  const handleAddSchedule = (person: TimetablePerson) => {
    setScheduleForm({
      person,
      mode: "manual-add",
      title: "",
      start: "09:00",
      end: "10:00",
      fill: DEFAULT_ITEM_COLOR,
      kind: "routine",
    });
  };

  const handleEditSchedule = (person: TimetablePerson, item: ScheduleItem) => {
    setScheduleForm({
      person,
      mode: "edit",
      title: item.title,
      start: item.start,
      end: item.end,
      fill: item.fill,
      kind: getScheduleKind(item),
      scheduleId: item.id,
      canDelete: true,
    });
  };

  const handleScheduleLongPressStart = (person: TimetablePerson, item: ScheduleItem) => {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      handleEditSchedule(person, item);
      longPressTimerRef.current = null;
    }, 600);
  };

  const toggleScheduleChecked = (person: TimetablePerson, item: ScheduleItem) => {
    if (getScheduleKind(item) !== "routine") return;

    const checked = checkedItemIds.has(`${person}:${item.id}`);

    if (checked) {
      updateCheckedRecords(
        checkedRecords.filter(
          (record) =>
            !(
              record.person === person &&
              record.itemId === item.id &&
              record.dayKey === currentDayKey
            )
        )
      );
      return;
    }

    updateCheckedRecords([
      ...checkedRecords.filter(
        (record) => !(record.person === person && record.itemId === item.id)
      ),
      {
        id: `${person}-${item.id}-${currentDayKey}`,
        person,
        itemId: item.id,
        dayKey: currentDayKey,
      },
    ]);
  };

  const handleScheduleClick = (person: TimetablePerson, item: ScheduleItem) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    toggleScheduleChecked(person, item);
  };

  const handleDeleteSchedule = (person: TimetablePerson, item: ScheduleItem) => {
    const confirmed = window.confirm(`${item.title} 일정을 삭제할까요?`);
    if (!confirmed) return;

    updateCheckedRecords(
      checkedRecords.filter(
        (record) => !(record.person === person && record.itemId === item.id)
      )
    );

    const { schedules, updateSchedules } = getColumnData(person);
    updateSchedules(schedules.filter((schedule) => schedule.id !== item.id));
  };

  const handleSubmitScheduleForm = () => {
    if (!scheduleForm) return;

    const title = scheduleForm.title.trim();
    const start = scheduleForm.start;
    const end = scheduleForm.end;
    const kind = scheduleForm.kind;

    if (!title) {
      alert("이름을 입력해주세요.");
      return;
    }

    if (!isValidTime(start) || !isValidTime(end)) {
      alert("시간은 HH:MM 형식으로 입력해주세요.");
      return;
    }

    if (minutesFromDay(end) <= minutesFromDay(start)) {
      alert("종료시간은 시작시간보다 늦어야 합니다.");
      return;
    }

    const { schedules, updateSchedules } = getColumnData(scheduleForm.person);

    if (scheduleForm.mode === "manual-add") {
      const newSchedule: ScheduleItem = {
        id: `custom-${crypto.randomUUID()}`,
        start,
        end,
        title,
        category: "",
        accent: "#a891ff",
        fill: DEFAULT_ITEM_COLOR,
        kind,
      };

      updateSchedules([...schedules, newSchedule]);
      setScheduleForm(null);
      return;
    }

    if (scheduleForm.mode === "edit" && scheduleForm.scheduleId) {
      updateSchedules(
        schedules.map((item) =>
          item.id === scheduleForm.scheduleId
            ? {
                ...item,
                title,
                start,
                end,
                fill: DEFAULT_ITEM_COLOR,
                kind,
              }
            : item
        )
      );

      setScheduleForm(null);
    }
  };

  const handleDeleteFromForm = () => {
    if (!scheduleForm?.scheduleId) return;

    handleDeleteSchedule(scheduleForm.person, {
      id: scheduleForm.scheduleId,
      title: scheduleForm.title,
      start: scheduleForm.start,
      end: scheduleForm.end,
      category: "",
      accent: "#a891ff",
      fill: DEFAULT_ITEM_COLOR,
      kind: scheduleForm.kind,
    });
    setScheduleForm(null);
  };

  const groupedStartTimes = Array.from(
    new Set(
      timetableColumns.flatMap((column) =>
        column.schedules.map((schedule) => schedule.start)
      )
    )
  ).sort((a, b) => a.localeCompare(b));
  const timelineEntries = [
    ...TIME_DIVIDERS.map((divider) => ({
      type: "divider" as const,
      key: `divider-${divider.time}`,
      minutes: minutesFromDay(divider.time),
      label: divider.label,
    })),
    ...groupedStartTimes.map((startTime) => ({
      type: "row" as const,
      key: `row-${startTime}`,
      minutes: minutesFromDay(startTime),
      startTime,
    })),
  ].sort((a, b) => a.minutes - b.minutes || (a.type === "divider" ? -1 : 1));

  const rowEntries = timelineEntries.filter((entry) => entry.type === "row");
  const activeRowEntry = rowEntries.find((entry) =>
    timetableColumns.some((column) =>
      column.schedules.some(
        (item) =>
          item.start === entry.startTime &&
          minutesFromDay(item.start) <= currentMinutes &&
          currentMinutes < minutesFromDay(item.end)
      )
    )
  );
  const nextRowEntry = rowEntries.find((entry) => entry.minutes >= currentMinutes);
  const autoScrollTargetKey =
    activeRowEntry?.key ?? nextRowEntry?.key ?? rowEntries[rowEntries.length - 1]?.key;

  useEffect(() => {
    if (!autoScrollTargetKey) return;

    const target = rowRefs.current.get(autoScrollTargetKey);
    if (!target) return;

    const timeoutId = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [autoScrollTargetKey, currentMinutes]);

  const renderTimeDivider = (key: string, label: string) => (
    <div key={key} className="px-1 py-3">
      {label ? (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/18" />
          <span className="shrink-0 text-[11px] font-black text-zinc-400">{label}</span>
          <div className="h-px flex-1 bg-white/18" />
        </div>
      ) : (
        <div className="h-3" />
      )}
    </div>
  );

  const renderScheduleCard = (person: TimetablePerson, item: ScheduleItem) => {
    const kind = getScheduleKind(item);
    const isRoutine = kind === "routine";
    const checked = checkedItemIds.has(`${person}:${item.id}`);
    const isCurrentItem =
      minutesFromDay(item.start) <= currentMinutes &&
      currentMinutes < minutesFromDay(item.end);
    const cardClassName = isRoutine
      ? `grid min-h-[54px] cursor-pointer content-center items-center gap-y-1 overflow-hidden rounded-lg border border-white/10 px-2.5 py-2 shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition-opacity ${
          checked ? "opacity-45" : "opacity-100"
        }`
      : "grid min-h-[54px] cursor-pointer content-center items-center gap-y-1 overflow-hidden rounded-lg border border-transparent bg-transparent px-2.5 py-2 transition-opacity";
    const cardStyle = isRoutine
      ? { background: isCurrentItem ? ACTIVE_ITEM_COLOR : DEFAULT_ITEM_COLOR }
      : undefined;

    return (
      <article
        key={item.id}
        className={cardClassName}
        style={cardStyle}
        onPointerDown={() => handleScheduleLongPressStart(person, item)}
        onPointerUp={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        onClick={() => handleScheduleClick(person, item)}
      >
        <div className="min-w-0">
          <strong
            className={`block truncate leading-tight text-[#f6f7f8] ${
              isRoutine ? "text-sm" : "text-xs font-semibold"
            } ${checked && isRoutine ? "line-through" : ""} ${
              !isRoutine && isCurrentItem ? "text-[#f4a261]" : ""
            }`}
          >
            {item.title}
          </strong>
        </div>
        <span className={`${isRoutine ? "text-[11px]" : "text-[10px]"} col-start-1 font-bold text-zinc-400`}>
          {item.start} - {item.end}
        </span>
      </article>
    );
  };

  return (
    <div
      className="mx-auto w-full max-w-[1280px] py-3 pt-14 text-white [--hour-height:86px] max-[520px]:[--hour-height:78px]"
      aria-label="하루 시간표"
    >
      <div className="fixed left-0 right-0 top-11 z-40 bg-gray-200 px-1 py-2 dark:bg-black">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-2">
          {timetableColumns.map((column) => (
            <div key={column.id} className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-[#f1f3f4]">{column.label}</h3>
              <button
                type="button"
                onClick={() => handleAddSchedule(column.id)}
                className="rounded border border-[#2b3036] bg-[#101214] px-2.5 py-1.5 text-xs font-bold text-[#f1f3f4] transition hover:border-[#a891ff]"
              >
                + 추가
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1 px-1 pt-1">
        {timelineEntries.map((entry) => {
          if (entry.type === "divider") {
            return renderTimeDivider(entry.key, entry.label);
          }

          return (
            <div
              key={entry.key}
              ref={(node) => {
                if (node) {
                  rowRefs.current.set(entry.key, node);
                } else {
                  rowRefs.current.delete(entry.key);
                }
              }}
              className="scroll-mt-24"
            >
              <div className="grid grid-cols-2 gap-1">
                {timetableColumns.map((column) => {
                  const rowItems = column.schedules
                    .filter((item) => item.start === entry.startTime)
                    .sort((a, b) => a.end.localeCompare(b.end) || a.title.localeCompare(b.title));

                  return (
                    <div key={column.id} className="min-h-[54px] space-y-1 p-1">
                      {rowItems.map((item) => renderScheduleCard(column.id, item))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {groupedStartTimes.length === 0 ? (
          <div className="grid grid-cols-2 gap-1">
            {timetableColumns.map((column) => (
              <div key={column.id} className="min-h-[54px] p-1" />
            ))}
          </div>
        ) : null}
      </div>

      {scheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[390px] rounded-lg border border-[#2b3036] bg-[#181b1f] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {scheduleForm.mode === "manual-add"
                  ? `${PERSON_LABELS[scheduleForm.person]} 일정 추가`
                  : `${PERSON_LABELS[scheduleForm.person]} 일정 수정`}
              </h3>
              <button
                type="button"
                onClick={() => setScheduleForm(null)}
                className="rounded px-2 py-1 text-xs text-[#a4abb3] hover:bg-white/10 hover:text-white"
              >
                닫기
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#a4abb3]">
                이름
                <input
                  className="mt-1 w-full rounded border border-[#2b3036] bg-[#101214] px-2 py-2 text-sm text-white outline-none focus:border-[#a891ff]"
                  value={scheduleForm.title}
                  onChange={(event) =>
                    setScheduleForm((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev
                    )
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "routine" as const, label: "루틴" },
                  { value: "event" as const, label: "일정" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, kind: option.value } : prev
                      )
                    }
                    className={`rounded border px-2 py-2 text-xs font-bold transition ${
                      scheduleForm.kind === option.value
                        ? "border-[#a891ff] bg-[#a891ff] text-white"
                        : "border-[#2b3036] bg-[#101214] text-[#a4abb3] hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-bold text-[#a4abb3]">
                  시작시간
                  <input
                    type="time"
                    className="mt-1 w-full rounded border border-[#2b3036] bg-[#101214] px-2 py-2 text-sm text-white outline-none focus:border-[#a891ff]"
                    value={scheduleForm.start}
                    onChange={(event) =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, start: event.target.value } : prev
                      )
                    }
                  />
                </label>
                <label className="block text-xs font-bold text-[#a4abb3]">
                  종료시간
                  <input
                    type="time"
                    className="mt-1 w-full rounded border border-[#2b3036] bg-[#101214] px-2 py-2 text-sm text-white outline-none focus:border-[#a891ff]"
                    value={scheduleForm.end}
                    onChange={(event) =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, end: event.target.value } : prev
                      )
                    }
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <div>
                {scheduleForm.canDelete ? (
                  <button
                    type="button"
                    onClick={handleDeleteFromForm}
                    className="rounded border border-red-400/50 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleForm(null)}
                  className="rounded border border-[#2b3036] px-3 py-2 text-xs font-bold text-[#a4abb3] hover:bg-white/10 hover:text-white"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmitScheduleForm}
                  className="rounded bg-[#a891ff] px-3 py-2 text-xs font-bold text-white hover:brightness-110"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
