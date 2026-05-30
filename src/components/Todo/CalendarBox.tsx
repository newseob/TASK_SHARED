import { useEffect, useMemo, useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  calendarName?: string;
  calendarColor?: string;
  start: string;
  allDay?: boolean;
}

interface CalendarResponse {
  events?: CalendarEvent[];
}

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_CALENDAR_SCRIPT_URL ?? "";
const CALENDAR_DAYS = ["오늘", "내일"];
const AUTO_REFRESH_MS = 3 * 60 * 60 * 1000;
const PERSONAL_CALENDAR_COLOR = "#2563eb";
const HOLIDAY_CALENDAR_COLOR = "#dc2626";
const PARTY_ROOM_CALENDAR_COLOR = "#71717a";

const getEventDate = (event: CalendarEvent) => {
  if (!event.start) return null;
  return new Date(event.allDay ? `${event.start}T00:00:00` : event.start);
};

const getTodayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDayLabel = (event: CalendarEvent) => {
  const date = getEventDate(event);
  if (!date) return "";

  const today = getTodayStart();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "오늘";
  if (date.toDateString() === tomorrow.toDateString()) return "내일";
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatEventTime = (event: CalendarEvent) => {
  if (event.allDay) return "종일";
  const date = getEventDate(event);
  if (!date) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const getCalendarColor = (event: CalendarEvent) => {
  const calendarName = event.calendarName ?? "";
  if (calendarName.includes("공휴일") || calendarName.toLowerCase().includes("holiday")) {
    return HOLIDAY_CALENDAR_COLOR;
  }
  if (calendarName.includes("파티룸")) {
    return PARTY_ROOM_CALENDAR_COLOR;
  }
  return event.calendarColor || PERSONAL_CALENDAR_COLOR;
};

export default function CalendarBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("calendarBox_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const groupedEvents = useMemo(
    () =>
      events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
        const label = getDayLabel(event);
        return {
          ...groups,
          [label]: [...(groups[label] ?? []), event],
        };
      }, {}),
    [events]
  );

  useEffect(() => {
    localStorage.setItem("calendarBox_showList", JSON.stringify(showList));
  }, [showList]);

  const loadEvents = async () => {
    if (!SCRIPT_URL) {
      setMessage("Apps Script URL 설정 필요");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error("calendar request failed");
      }

      const data = (await response.json()) as CalendarResponse | CalendarEvent[];
      const nextEvents = Array.isArray(data) ? data : data.events ?? [];

      setEvents(
        nextEvents.sort(
          (a, b) => (getEventDate(a)?.getTime() ?? 0) - (getEventDate(b)?.getTime() ?? 0)
        )
      );
    } catch {
      setMessage("일정을 불러오지 못했어요");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!showList) return;

    loadEvents();
    const intervalId = window.setInterval(loadEvents, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [showList]);

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          type="button"
          className="mx-1 cursor-pointer text-xs text-zinc-400 transition hover:text-zinc-900 dark:hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "숨기기" : "펼치기"}
          title={showList ? "숨기기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>

        <h2 className="min-w-0 flex-1 truncate bg-transparent text-xs text-blue-600 outline-none dark:text-blue-300">
          캘린더
        </h2>

        {showList && (
          <button
            type="button"
            onClick={loadEvents}
            disabled={isLoading}
            className="rounded px-2 py-0.5 text-xs font-semibold text-zinc-500 transition hover:text-blue-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-blue-300"
          >
            {isLoading ? "불러오는 중" : "새로고침"}
          </button>
        )}
      </div>

      {showList && (
        <div className="mt-2 space-y-2">
          {message && (
            <div className="rounded px-2 py-1 text-xs text-zinc-400">{message}</div>
          )}

          {!message && events.length === 0 && !isLoading && (
            <div className="rounded px-2 py-1 text-xs text-zinc-400">
              오늘/내일 일정 없음
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
            {CALENDAR_DAYS.map((label) => {
              const dayEvents = groupedEvents[label] ?? [];

              return (
                <div key={label} className="min-w-0">
                  <div className="px-1 pb-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {label}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="grid grid-cols-[44px_minmax(0,1fr)] gap-1 rounded bg-zinc-100 px-1.5 py-1 text-xs dark:bg-zinc-800"
                      >
                        <span className="text-zinc-400">{formatEventTime(event)}</span>
                        <span className="min-w-0">
                          <span
                            className="block truncate font-semibold"
                            style={{ color: getCalendarColor(event) }}
                          >
                            {event.title || "제목 없음"}
                          </span>
                          {event.calendarName && (
                            <span
                              className="block truncate text-[10px]"
                              style={{ color: getCalendarColor(event) }}
                            >
                              {event.calendarName}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}

                    {dayEvents.length === 0 && !message && !isLoading && (
                      <div className="rounded px-1.5 py-1 text-xs text-zinc-400">
                        일정 없음
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
