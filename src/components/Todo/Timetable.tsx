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
  checkedAt?: number;
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
const CHECKED_HIDE_DELAY_MS = 10 * 1000;
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
  const [nowMs, setNowMs] = useState(Date.now);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("timetable_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  useEffect(() => {
    localStorage.setItem("timetable_showList", JSON.stringify(showList));
  }, [showList]);

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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

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
  const checkedRecordByItemKey = new Map(
    checkedRecords
      .filter((record) => record.dayKey === currentDayKey)
      .map((record) => [`${record.person}:${record.itemId}`, record])
  );
  const checkedItemIds = new Set(checkedRecordByItemKey.keys());

  const shouldShowSchedule = (person: TimetablePerson, item: ScheduleItem) => {
    if (getScheduleKind(item) !== "routine") return true;

    const checkedRecord = checkedRecordByItemKey.get(`${person}:${item.id}`);
    if (!checkedRecord) return true;

    return nowMs - (checkedRecord.checkedAt ?? 0) < CHECKED_HIDE_DELAY_MS;
  };

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
        checkedAt: Date.now(),
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
        column.schedules
          .filter((schedule) => shouldShowSchedule(column.id, schedule))
          .map((schedule) => schedule.start)
      )
    )
  ).sort((a, b) => a.localeCompare(b));
  const groupedStartMinutes = groupedStartTimes.map(minutesFromDay);
  const firstStartMinute = Math.min(...groupedStartMinutes);
  const lastStartMinute = Math.max(...groupedStartMinutes);
  const timelineEntries = [
    ...TIME_DIVIDERS.filter((divider) => {
      const dividerMinute = minutesFromDay(divider.time);
      return dividerMinute > firstStartMinute && dividerMinute < lastStartMinute;
    }).map((divider) => ({
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
      ? `grid min-h-[38px] cursor-pointer content-center items-center gap-y-1 overflow-hidden rounded-lg border border-white/10 px-1.5 py-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-opacity ${
          checked ? "opacity-45" : "opacity-100"
        }`
      : "grid min-h-[38px] cursor-pointer content-center items-center gap-y-1 overflow-hidden rounded-lg border border-transparent bg-transparent px-1.5 py-1.5 transition-opacity";
    const cardStyle = isRoutine
      ? { background: isCurrentItem ? ACTIVE_ITEM_COLOR : DEFAULT_ITEM_COLOR }
      : undefined;
    const titleColorClass = !isRoutine && isCurrentItem ? "text-[#f4a261]" : "text-[#f6f7f8]";

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
            className={`block truncate leading-tight ${titleColorClass} ${
              isRoutine ? "text-sm" : "text-xs font-semibold"
            } ${checked && isRoutine ? "line-through" : ""}`}
          >
            {item.title}
          </strong>
        </div>
      </article>
    );
  };

  return (
    <div
      className="mx-auto w-full max-w-[1280px] py-2 text-white [--hour-height:86px] max-[520px]:[--hour-height:78px]"
      aria-label="하루 시간표"
    >
      <div className="flex items-center justify-between mt-[3px]">
        <button
          type="button"
          className="mx-1 text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "접기" : "펼치기"}
          title={showList ? "접기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>

        <h2 className="flex-1 truncate text-xs text-blue-600 dark:text-blue-300">
          매일 할 일
        </h2>
      </div>

      {showList && (
        <>
          <div className="mt-1 space-y-1 px-0 pt-0">
            {timelineEntries.map((entry) => {
              if (entry.type === "divider") {
                return renderTimeDivider(entry.key, entry.label);
              }

              return (
                <div key={entry.key}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {timetableColumns.map((column) => {
                      const rowItems = column.schedules
                        .filter(
                          (item) =>
                            item.start === entry.startTime &&
                            shouldShowSchedule(column.id, item)
                        )
                        .sort((a, b) => a.end.localeCompare(b.end) || a.title.localeCompare(b.title));

                      return (
                        <div
                          key={column.id}
                          className={`${rowItems.length > 0 ? "min-h-[38px]" : ""} space-y-1 px-0 pb-1 pt-0`}
                        >
                          {rowItems.map((item) => renderScheduleCard(column.id, item))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-1.5">
              {timetableColumns.map((column) => (
                <div key={column.id} className="px-0 pb-1 pt-0">
                  <button
                    type="button"
                    onClick={() => handleAddSchedule(column.id)}
                    className="w-full rounded border border-dashed border-[#2b3036] bg-transparent px-2 py-1 text-xs font-bold text-zinc-500 transition hover:border-[#a891ff] hover:text-[#a891ff] dark:text-zinc-400"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
