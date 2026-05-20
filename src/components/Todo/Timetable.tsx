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
}

type ScheduleFormMode = "manual-add" | "edit";
type TimetablePerson = "kyungin" | "yuseop";

interface ScheduleFormState {
  person: TimetablePerson;
  mode: ScheduleFormMode;
  title: string;
  start: string;
  end: string;
  fill: string;
  scheduleId?: string;
  canDelete?: boolean;
}

const DEFAULT_SCHEDULES: ScheduleItem[] = [];

const TIMETABLE_COLORS = [
  "#2a2444",
  "#17342d",
  "#3a241b",
  "#202b4a",
  "#3a1d2a",
  "#3a3018",
  "#243447",
  "#2f2f35",
  "#21372b",
  "#3b2634",
];

const TIMETABLE_COLOR_OPTIONS = TIMETABLE_COLORS.map((color, index) => ({
  color,
  label: `색상 ${index + 1}`,
}));

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
  const [checkedItems, setCheckedItems] = useState<
    Record<TimetablePerson, Record<string, boolean>>
  >(() => {
    try {
      const savedDayKey = localStorage.getItem("timetable_checkedItems_dayKey");
      if (savedDayKey !== getTimetableDayKey()) {
        localStorage.setItem("timetable_checkedItems_dayKey", getTimetableDayKey());
        localStorage.removeItem("timetable_checkedItems_kyungin");
        localStorage.removeItem("timetable_checkedItems_yuseop");
        return { kyungin: {}, yuseop: {} };
      }

      const kyungin = localStorage.getItem("timetable_checkedItems_kyungin");
      const yuseop = localStorage.getItem("timetable_checkedItems_yuseop");
      return {
        kyungin: kyungin ? JSON.parse(kyungin) : {},
        yuseop: yuseop ? JSON.parse(yuseop) : {},
      };
    } catch {
      return { kyungin: {}, yuseop: {} };
    }
  });
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  useEffect(() => {
    localStorage.setItem("timetable_checkedItems_dayKey", getTimetableDayKey());
    localStorage.setItem(
      "timetable_checkedItems_kyungin",
      JSON.stringify(checkedItems.kyungin)
    );
    localStorage.setItem(
      "timetable_checkedItems_yuseop",
      JSON.stringify(checkedItems.yuseop)
    );
  }, [checkedItems]);

  useEffect(() => {
    const resetCheckedItemsIfDayChanged = () => {
      const currentDayKey = getTimetableDayKey();
      const savedDayKey = localStorage.getItem("timetable_checkedItems_dayKey");

      if (savedDayKey === currentDayKey) return;

      localStorage.setItem("timetable_checkedItems_dayKey", currentDayKey);
      setCheckedItems({ kyungin: {}, yuseop: {} });
    };

    resetCheckedItemsIfDayChanged();
    const intervalId = window.setInterval(resetCheckedItemsIfDayChanged, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => clearLongPressTimer, []);

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

  const handleAddSchedule = (person: TimetablePerson) => {
    setScheduleForm({
      person,
      mode: "manual-add",
      title: "",
      start: "09:00",
      end: "10:00",
      fill: TIMETABLE_COLORS[0],
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
      scheduleId: item.id,
      canDelete: true,
    });
  };

  const handleScheduleLongPressStart = (person: TimetablePerson, item: ScheduleItem) => {
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      handleEditSchedule(person, item);
      longPressTimerRef.current = null;
    }, 600);
  };

  const handleDeleteSchedule = (person: TimetablePerson, item: ScheduleItem) => {
    const confirmed = window.confirm(`${item.title} 일정을 삭제할까요?`);
    if (!confirmed) return;

    setCheckedItems((prev) => {
      const { [item.id]: removed, ...rest } = prev[person];
      return { ...prev, [person]: rest };
    });

    const { schedules, updateSchedules } = getColumnData(person);
    updateSchedules(schedules.filter((schedule) => schedule.id !== item.id));
  };

  const handleSubmitScheduleForm = () => {
    if (!scheduleForm) return;

    const title = scheduleForm.title.trim();
    const start = scheduleForm.start;
    const end = scheduleForm.end;

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
        fill: scheduleForm.fill,
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
                fill: scheduleForm.fill,
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
      fill: scheduleForm.fill,
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

  const renderScheduleCard = (person: TimetablePerson, item: ScheduleItem) => {
    const checked = Boolean(checkedItems[person][item.id]);

    return (
      <article
        key={item.id}
        className={`grid min-h-[54px] grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-1.5 gap-y-1 overflow-hidden rounded-lg border border-white/10 px-2.5 py-2 shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition-opacity ${
          checked ? "opacity-45" : "opacity-100"
        }`}
        style={{ background: item.fill }}
        onPointerDown={() => handleScheduleLongPressStart(person, item)}
        onPointerUp={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
      >
        <div className="min-w-0">
          <strong
            className={`block truncate text-sm leading-tight text-[#f6f7f8] ${
              checked ? "line-through" : ""
            }`}
          >
            {item.title}
          </strong>
        </div>
        <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-center justify-center gap-0.5">
          <input
            type="checkbox"
            checked={checked}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onChange={() => {
              setCheckedItems((prev) => ({
                ...prev,
                [person]: {
                  ...prev[person],
                  [item.id]: !prev[person][item.id],
                },
              }));
            }}
            className="h-3 w-3 accent-white"
            aria-label={`${item.title} 완료`}
          />
        </div>
        <span className="col-start-1 text-[11px] font-bold text-white/70">
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
        {groupedStartTimes.map((startTime) => (
          <div key={startTime} className="grid grid-cols-2 gap-1">
            {timetableColumns.map((column) => {
              const rowItems = column.schedules
                .filter((item) => item.start === startTime)
                .sort((a, b) => a.end.localeCompare(b.end) || a.title.localeCompare(b.title));

              return (
                <div key={column.id} className="min-h-[54px] space-y-1 p-1">
                  {rowItems.map((item) => renderScheduleCard(column.id, item))}
                </div>
              );
            })}
          </div>
        ))}
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
            <div className="mt-4 grid grid-cols-5 gap-2">
              {TIMETABLE_COLOR_OPTIONS.map((option) => {
                const selected =
                  option.color.toLowerCase() === scheduleForm.fill.toLowerCase();

                return (
                  <button
                    key={option.color}
                    type="button"
                    onClick={() =>
                      setScheduleForm((prev) =>
                        prev ? { ...prev, fill: option.color } : prev
                      )
                    }
                    className={`h-12 rounded border text-[10px] font-bold text-white shadow-inner transition ${
                      selected
                        ? "border-white ring-2 ring-white/70"
                        : "border-white/10 hover:border-white/60"
                    }`}
                    style={{ background: option.color }}
                    aria-label={option.label}
                    title={option.color}
                  >
                    {option.label.replace("색상 ", "")}
                  </button>
                );
              })}
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
