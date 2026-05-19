import { useEffect, useMemo, useRef, useState } from "react";
import { useFirestoreHistory } from "./hooks/useFirestoreHistory";

interface ScheduleItem {
  id: string;
  routineId?: string;
  start: string;
  end: string;
  title: string;
  category: string;
  accent: string;
  fill: string;
}

interface RoutineItem {
  id: string;
  category: string;
  name: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  timetableColor?: string;
  lastChecked: string;
  originalLastChecked?: string;
  lastReplaced: string;
  memo: string;
  cycle: number;
}

interface SlotNote {
  id: string;
  text: string;
}

const START_HOUR = 7;
const END_HOUR = 25;
const SLOT_MINUTES = 10;
const SLOT_HEIGHT = 54;

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

type ScheduleFormMode = "manual-add" | "routine-add" | "edit";
type TimetablePerson = "kyungin" | "yuseop";

const TIMETABLE_PEOPLE: Array<{ id: TimetablePerson; label: string }> = [
  { id: "kyungin", label: "경인" },
  { id: "yuseop", label: "유섭" },
];

interface ScheduleFormState {
  mode: ScheduleFormMode;
  title: string;
  start: string;
  end: string;
  fill: string;
  routineId?: string;
  scheduleId?: string;
  canDelete?: boolean;
}

function minutesFromDay(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesFromTimelineStart(time: string) {
  const minutes = minutesFromDay(time);
  return minutes < START_HOUR * 60 ? minutes + 24 * 60 : minutes;
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

function getToday6AM() {
  const now = new Date();
  if (now.getHours() < 6) {
    now.setDate(now.getDate() - 1);
  }
  now.setHours(6, 0, 0, 0);
  return now;
}

function getTodayDateString() {
  const today = getToday6AM();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateAtSix(value: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 6, 0, 0, 0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateRoutineDays(lastChecked: string, cycle: number) {
  if (!lastChecked) return 0;
  const last = parseLocalDateAtSix(lastChecked);
  if (!last) return 0;
  const diffMs = getToday6AM().getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays - cycle;
}

function formatMinutes(minutes: number) {
  const clamped = Math.min(minutes, 24 * 60);
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function formatSlotTime(slotIndex: number) {
  const totalMinutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  return formatMinutes(totalMinutes);
}

function getSlotOffsetFromStart(time: string) {
  return (minutesFromTimelineStart(time) - START_HOUR * 60) / SLOT_MINUTES;
}

function getSlotSpan(start: string, end: string) {
  return Math.max((minutesFromTimelineStart(end) - minutesFromTimelineStart(start)) / SLOT_MINUTES, 1);
}

export default function Timetable() {
  const nowLineRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const { items: routineItems, updateWithHistory: updateRoutineItems } = useFirestoreHistory<RoutineItem>(
    "routineItems",
    "config",
    [],
    "items"
  );
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
    items: kyunginSelectedRoutineIds,
    updateWithHistory: updateKyunginSelectedRoutineIds,
  } = useFirestoreHistory<string>(
    "timetableData",
    "main",
    [],
    "kyunginSelectedRoutineIds"
  );
  const {
    items: yuseopSelectedRoutineIds,
    updateWithHistory: updateYuseopSelectedRoutineIds,
  } = useFirestoreHistory<string>(
    "timetableData",
    "main",
    [],
    "yuseopSelectedRoutineIds"
  );
  const {
    items: kyunginSlotNotes,
    updateWithHistory: updateKyunginSlotNotes,
  } = useFirestoreHistory<SlotNote>(
    "timetableData",
    "main",
    [],
    "kyunginSlotNotes"
  );
  const {
    items: yuseopSlotNotes,
    updateWithHistory: updateYuseopSlotNotes,
  } = useFirestoreHistory<SlotNote>(
    "timetableData",
    "main",
    [],
    "yuseopSlotNotes"
  );
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutes);
  const [activePerson, setActivePerson] = useState<TimetablePerson>(() => {
    const saved = localStorage.getItem("timetable_activePerson");
    return saved === "yuseop" ? "yuseop" : "kyungin";
  });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const savedPerson = localStorage.getItem("timetable_activePerson");
      const person = savedPerson === "yuseop" ? "yuseop" : "kyungin";
      const saved = localStorage.getItem(`timetable_checkedItems_${person}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentMinutes(getCurrentMinutes());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    hasAutoScrolledRef.current = true;

    window.requestAnimationFrame(() => {
      nowLineRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("timetable_activePerson", activePerson);
  }, [activePerson]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`timetable_checkedItems_${activePerson}`);
      setCheckedItems(saved ? JSON.parse(saved) : {});
    } catch {
      setCheckedItems({});
    }
  }, [activePerson]);

  useEffect(() => {
    localStorage.setItem(`timetable_checkedItems_${activePerson}`, JSON.stringify(checkedItems));
  }, [activePerson, checkedItems]);

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index),
    []
  );
  const startMinutes = START_HOUR * 60;
  const endMinutes = END_HOUR * 60;
  const timelineCurrentMinutes = currentMinutes < startMinutes ? currentMinutes + 24 * 60 : currentMinutes;
  const clampedMinutes = Math.min(Math.max(timelineCurrentMinutes, startMinutes), endMinutes);
  const nowOffsetHours = (clampedMinutes - startMinutes) / 60;
  const nowOpacity = currentMinutes < startMinutes || currentMinutes > endMinutes ? 0.38 : 1;
  const manualSchedules =
    activePerson === "kyungin" ? kyunginManualSchedules : yuseopManualSchedules;
  const selectedRoutineIds =
    activePerson === "kyungin" ? kyunginSelectedRoutineIds : yuseopSelectedRoutineIds;
  const slotNotes = activePerson === "kyungin" ? kyunginSlotNotes : yuseopSlotNotes;
  const updateManualSchedules =
    activePerson === "kyungin" ? updateKyunginManualSchedules : updateYuseopManualSchedules;
  const updateSelectedRoutineIds =
    activePerson === "kyungin" ? updateKyunginSelectedRoutineIds : updateYuseopSelectedRoutineIds;
  const updateSlotNotes =
    activePerson === "kyungin" ? updateKyunginSlotNotes : updateYuseopSlotNotes;
  const dailyRoutineItems = routineItems
    .filter((item) => Number(item.cycle) === 1 && item.type !== "section")
    .sort((a, b) =>
      (a.startTime || a.time || "").localeCompare(b.startTime || b.time || "")
    );
  const routineSchedules = dailyRoutineItems
    .filter((item) => {
      const startTime = item.startTime || item.time || "";
      return selectedRoutineIds.includes(item.id) && isValidTime(startTime);
    })
    .map<ScheduleItem>((item) => {
      const start = item.startTime || item.time || "00:00";
      const end = item.endTime || formatMinutes(minutesFromDay(start) + 60);

      return {
        id: `routine-${item.id}`,
        routineId: item.id,
        start,
        end,
        title: item.name,
        category: "",
        accent: "#a891ff",
        fill: item.timetableColor || "#2a2444",
      };
    });
  const visibleSchedules = [...manualSchedules, ...routineSchedules].sort((a, b) =>
    a.start.localeCompare(b.start)
  );
  const totalSlots = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
  const timelineHeight = totalSlots * SLOT_HEIGHT;
  const slotNoteMap = slotNotes.reduce<Record<string, string>>((acc, note) => {
    acc[note.id] = note.text;
    return acc;
  }, {});

  const getRoutineItemBySchedule = (item: ScheduleItem) =>
    item.routineId ? routineItems.find((routineItem) => routineItem.id === item.routineId) : undefined;

  const isRoutineChecked = (item: RoutineItem) => {
    if (!item.lastChecked) return false;
    return (
      parseLocalDateAtSix(item.lastChecked)?.getTime() === getToday6AM().getTime()
    );
  };

  const toggleRoutineChecked = (item: RoutineItem) => {
    const checked = isRoutineChecked(item);

    const updatedRoutineItems = routineItems.map((routineItem) =>
      routineItem.id === item.id
        ? checked
          ? {
            ...routineItem,
            lastChecked: routineItem.originalLastChecked ?? "",
            originalLastChecked: undefined,
          }
          : {
            ...routineItem,
            originalLastChecked: routineItem.lastChecked,
            lastChecked: getTodayDateString(),
          }
        : routineItem
    );

    updateRoutineItems(updatedRoutineItems);
  };

  const handleAddSchedule = () => {
    setScheduleForm({
      mode: "manual-add",
      title: "",
      start: "09:00",
      end: "10:00",
      fill: TIMETABLE_COLORS[0],
    });
  };

  const handleAddRoutineSchedule = () => {
    const candidates = dailyRoutineItems.filter((item) => !selectedRoutineIds.includes(item.id));

    if (candidates.length === 0) {
      alert("추가할 수 있는 주기 1 루틴이 없습니다.");
      return;
    }

    setShowRoutinePicker(true);
  };

  const openRoutineScheduleForm = (selected: RoutineItem) => {
    const start = selected.startTime || selected.time || "09:00";

    setScheduleForm({
      mode: "routine-add",
      title: selected.name,
      start: isValidTime(start) ? start : "09:00",
      end: isValidTime(selected.endTime || "")
        ? selected.endTime || ""
        : formatMinutes(minutesFromDay(isValidTime(start) ? start : "09:00") + 60),
      fill: selected.timetableColor || TIMETABLE_COLORS[0],
      routineId: selected.id,
    });
    setShowRoutinePicker(false);
  };

  const handleEditSchedule = (item: ScheduleItem) => {
    setScheduleForm({
      mode: "edit",
      title: item.title,
      start: item.start,
      end: item.end,
      fill: item.fill,
      routineId: item.routineId,
      scheduleId: item.id,
      canDelete: true,
    });
  };

  const handleDeleteSchedule = (item: ScheduleItem) => {
    const confirmed = window.confirm(`${item.title} 일정을 삭제할까요?`);
    if (!confirmed) return;

    setCheckedItems((prev) => {
      const { [item.id]: removed, ...rest } = prev;
      return rest;
    });

    if (item.id.startsWith("routine-")) {
      const routineId = item.id.replace("routine-", "");
      updateSelectedRoutineIds(selectedRoutineIds.filter((id) => id !== routineId));
      return;
    }

    updateManualSchedules(manualSchedules.filter((schedule) => schedule.id !== item.id));
  };

  const handleSlotNoteChange = (id: string, text: string) => {
    const nextNotes = slotNotes.filter((note) => note.id !== id);

    if (text.trim()) {
      nextNotes.push({ id, text });
    }

    updateSlotNotes(nextNotes.sort((a, b) => a.id.localeCompare(b.id)));
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

      updateManualSchedules([...manualSchedules, newSchedule]);
      setScheduleForm(null);
      return;
    }

    if (scheduleForm.mode === "routine-add" && scheduleForm.routineId) {
      const updatedRoutineItems = routineItems.map((item) =>
        item.id === scheduleForm.routineId
          ? {
            ...item,
            name: title,
            startTime: start,
            endTime: end,
            time: start,
            timetableColor: scheduleForm.fill,
          }
          : item
      );

      updateRoutineItems(updatedRoutineItems);
      if (!selectedRoutineIds.includes(scheduleForm.routineId)) {
        updateSelectedRoutineIds([...selectedRoutineIds, scheduleForm.routineId]);
      }
      setScheduleForm(null);
      return;
    }

    if (scheduleForm.mode === "edit" && scheduleForm.scheduleId) {
      if (scheduleForm.scheduleId.startsWith("routine-") && scheduleForm.routineId) {
        const updatedRoutineItems = routineItems.map((item) =>
          item.id === scheduleForm.routineId
            ? {
              ...item,
              name: title,
              startTime: start,
              endTime: end,
              time: start,
              timetableColor: scheduleForm.fill,
            }
            : item
        );

        updateRoutineItems(updatedRoutineItems);
      } else {
        updateManualSchedules(
          manualSchedules.map((item) =>
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
      }

      setScheduleForm(null);
    }
  };

  const handleDeleteFromForm = () => {
    if (!scheduleForm?.scheduleId) return;

    handleDeleteSchedule({
      id: scheduleForm.scheduleId,
      routineId: scheduleForm.routineId,
      title: scheduleForm.title,
      start: scheduleForm.start,
      end: scheduleForm.end,
      category: "",
      accent: "#a891ff",
      fill: scheduleForm.fill,
    });
    setScheduleForm(null);
  };

  return (
    <div
      className="mx-auto w-full max-w-[840px] py-3 text-white [--hour-height:86px] max-[520px]:[--hour-height:78px]"
      aria-label="하루 시간표"
    >
      <div className="fixed left-0 right-0 top-11 z-40 flex justify-end gap-2 bg-black/90 px-2 py-2 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[840px] items-center justify-between gap-2">
        <div className="flex gap-1">
          {TIMETABLE_PEOPLE.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setActivePerson(person.id)}
              className={`rounded border px-3 py-1.5 text-xs font-bold transition ${
                activePerson === person.id
                  ? "border-[#a891ff] bg-[#2a2444] text-white"
                  : "border-[#2b3036] bg-[#14171b] text-[#a4abb3] hover:border-[#a891ff] hover:text-white"
              }`}
            >
              {person.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleAddRoutineSchedule}
          className="rounded border border-[#2b3036] bg-[#14171b] px-3 py-1.5 text-xs font-bold text-[#f1f3f4] transition hover:border-[#a891ff]"
        >
          + 루틴
        </button>
        <button
          type="button"
          onClick={handleAddSchedule}
          className="rounded border border-[#2b3036] bg-[#14171b] px-3 py-1.5 text-xs font-bold text-[#f1f3f4] transition hover:border-[#a891ff]"
        >
          + 직접
        </button>
        </div>
        </div>
      </div>

      <section className="mt-14 overflow-hidden rounded-lg border border-[#2b3036] bg-[#181b1f]/95 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-[#2b3036] bg-[#14171b] text-[13px] font-extrabold text-[#a4abb3] max-[520px]:grid-cols-[64px_minmax(0,1fr)]">
          <div className="px-4 py-3 max-[520px]:px-2.5 max-[520px]:py-2.5">시각</div>
          <div className="px-4 py-3 max-[520px]:px-2.5 max-[520px]:py-2.5">내용</div>
        </div>

        <div
          className="relative grid grid-cols-[88px_minmax(0,1fr)] max-[520px]:grid-cols-[64px_minmax(0,1fr)]"
          style={{ height: timelineHeight }}
        >
          <div className="relative border-r border-[#2b3036] bg-[#14171b]">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-b border-[#2b3036] px-3.5 py-2 text-right text-2xl font-black leading-none text-[#d7dbe0] max-[520px]:px-2 max-[520px]:text-xl"
                style={{
                  top: (hour - START_HOUR) * 6 * SLOT_HEIGHT,
                  height: 6 * SLOT_HEIGHT,
                }}
              >
                {String(hour % 24).padStart(2, "0")}
              </div>
            ))}
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, transparent calc(100% - 1px), #2b3036 1px)",
                backgroundSize: `100% ${SLOT_HEIGHT}px`,
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0">
              {Array.from({ length: totalSlots }, (_, slotIndex) => {
                const slotId = formatSlotTime(slotIndex);

                return (
                  <input
                    key={slotId}
                    aria-label={`${slotId} 메모`}
                    className="absolute left-1 right-1 z-[1] h-5 rounded border border-transparent bg-transparent px-2 text-[11px] font-medium text-white/60 outline-none transition placeholder:text-white/20 hover:border-white/10 hover:bg-black/10 focus:border-[#a891ff] focus:bg-black/30 focus:text-white"
                    style={{ top: slotIndex * SLOT_HEIGHT + 3 }}
                    value={slotNoteMap[slotId] || ""}
                    placeholder={slotId}
                    onChange={(event) => handleSlotNoteChange(slotId, event.target.value)}
                  />
                );
              })}
            </div>

            {visibleSchedules.map((item) => {
              const itemId = item.id;
              const routineItem = getRoutineItemBySchedule(item);
              const checked = routineItem ? isRoutineChecked(routineItem) : Boolean(checkedItems[itemId]);
              const remaining = routineItem
                ? calculateRoutineDays(routineItem.lastChecked, Number(routineItem.cycle))
                : 0;
              const top = getSlotOffsetFromStart(item.start) * SLOT_HEIGHT + 4;
              const height = Math.max(getSlotSpan(item.start, item.end) * SLOT_HEIGHT - 8, 42);

              return (
                <article
                  key={itemId}
                  className={`absolute left-4 right-4 z-[2] grid grid-cols-[minmax(0,1fr)_auto_auto] content-center items-center gap-x-2 gap-y-1 overflow-hidden rounded-lg border border-white/10 px-3.5 py-2.5 shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition-opacity max-[520px]:left-2.5 max-[520px]:right-2.5 max-[520px]:px-2.5 ${
                    checked ? "opacity-45" : "opacity-100"
                  }`}
                  style={{
                    top,
                    height,
                    background: item.fill,
                  }}
                >
                  <div className="min-w-0">
                    <strong className={`block truncate text-[15px] leading-tight text-[#f6f7f8] max-[520px]:text-sm ${checked ? "line-through" : ""}`}>
                      {item.title}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEditSchedule(item)}
                    className="col-start-2 row-span-2 row-start-1 rounded px-1 text-[11px] opacity-70 transition hover:bg-white/10 hover:opacity-100"
                    aria-label={`${item.title} 수정`}
                    title="수정"
                  >
                    ✏️
                  </button>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (routineItem) {
                        toggleRoutineChecked(routineItem);
                        return;
                      }

                      setCheckedItems((prev) => ({
                        ...prev,
                        [itemId]: !prev[itemId],
                      }));
                    }}
                    className="col-start-3 row-span-2 row-start-1 h-4 w-4 accent-white"
                    aria-label={`${item.title} 완료`}
                  />
                  <span className="col-start-1 text-xs font-bold text-white/70">
                    {item.start} - {item.end}
                    {routineItem && remaining > 0 ? (
                      <span className="ml-3 text-red-300">D+{remaining}</span>
                    ) : null}
                  </span>
                </article>
              );
            })}

            <div
              ref={nowLineRef}
              className="pointer-events-none absolute left-0 right-4 z-10 -translate-y-1/2 max-[520px]:right-2.5"
              style={{
                top: ((timelineCurrentMinutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT,
                opacity: nowOpacity,
              }}
            >
              <div className="relative h-0.5 bg-[#ff5a4e] shadow-[0_0_0_4px_rgba(255,90,78,0.14)] before:absolute before:left-[-5px] before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-[#ff5a4e] before:content-['']" />
            </div>
          </div>
        </div>
      </section>

      {showRoutinePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[420px] rounded-lg border border-[#2b3036] bg-[#181b1f] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">루틴 선택</h3>
              <button
                type="button"
                onClick={() => setShowRoutinePicker(false)}
                className="rounded px-2 py-1 text-xs text-[#a4abb3] hover:bg-white/10 hover:text-white"
              >
                닫기
              </button>
            </div>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {dailyRoutineItems
                .filter((item) => !selectedRoutineIds.includes(item.id))
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openRoutineScheduleForm(item)}
                    className="block w-full truncate rounded border border-[#2b3036] bg-[#101214] px-2 py-1.5 text-left text-xs font-bold text-white transition hover:border-[#a891ff]"
                  >
                    {item.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {scheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[390px] rounded-lg border border-[#2b3036] bg-[#181b1f] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {scheduleForm.mode === "manual-add"
                  ? "일정 추가"
                  : scheduleForm.mode === "routine-add"
                    ? "루틴 일정 추가"
                    : "일정 수정"}
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
                      selected ? "border-white ring-2 ring-white/70" : "border-white/10 hover:border-white/60"
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
